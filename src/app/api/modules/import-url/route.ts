import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { chunkText } from "@/lib/ai/chunker"
import { YoutubeTranscript } from "youtube-transcript"

async function extractWebPageContent(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SyntraBot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)

  const html = await res.text()

  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : new URL(url).hostname

  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 20 && s.length < 500)
    .slice(0, 500)

  if (sentences.length === 0) throw new Error("No readable content found on the page")

  return { title, text: sentences.join(" ") }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const url = (body.url as string)?.trim()
  const category = (body.category as string) || null
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
  }

  try {
    const videoId = extractVideoId(url)
    let title: string
    let rawText: string

    if (videoId) {
      title = `YouTube: ${videoId}`
      rawText = ""

      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      ).catch(() => null)
      if (oembedRes?.ok) {
        const oembed = await oembedRes.json().catch(() => null)
        if (oembed?.title) title = `YouTube: ${oembed.title}`
        if (oembed?.author_name) title += ` by ${oembed.author_name}`
      }

      let rawTranscript = ""
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" })
        rawTranscript = transcript.map((t) => t.text).join(" ")
      } catch { /* transcript unavailable */ }

      if (rawTranscript && rawTranscript.length > 30) {
        rawText = `${title}\n\nTranscript:\n${rawTranscript}`.trim()
      }

      if (!rawText || rawText.length < 30) {
        try {
          const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+{}",
            },
            signal: AbortSignal.timeout(8000),
            redirect: "follow",
          })
          const pageHtml = await pageRes.text()

          const titleMatch = pageHtml.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i)
          if (titleMatch?.[1] && title === `YouTube: ${videoId}`) {
            title = `YouTube: ${titleMatch[1]}`
          }

          const descriptionMatch = pageHtml.match(/"shortDescription":"([\s\S]*?)","is/)
          const fullDesc = descriptionMatch?.[1]?.replace(/\\n/g, " ").replace(/\\"/g, '"').trim() || ""

          const ogDesc = pageHtml.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i)
          const metaDesc = pageHtml.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)
          const pageDesc = ogDesc?.[1] || metaDesc?.[1] || ""

          const description = fullDesc || pageDesc
          if (description && description !== "Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.") {
            rawText = rawText || `${title}\n\n${description}`.trim()
          }
        } catch { /* page fetch failed */ }
      }

      if (!rawText || rawText.length < 30) {
        return NextResponse.json(
          { error: "Could not extract content from this YouTube video. It may have captions disabled and no description." },
          { status: 400 }
        )
      }
    } else {
      const page = await extractWebPageContent(url)
      title = page.title
      rawText = page.text
    }

    if (!rawText || rawText.length < 30) {
      return NextResponse.json({ error: "Could not extract enough content from the URL" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("modules")
      .insert({
        user_id: user.id,
        title,
        content_type: "text",
        storage_path: null,
        raw_text: rawText,
        raw_pdf: null,
        status: "processing",
        topic_labels: [],
        category,
      })
      .select("id")
      .single()

    if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 })

    const textChunks = chunkText(rawText)
    const { data: inserted } = await supabase
      .from("module_chunks")
      .insert(
        textChunks.map((c) => ({
          module_id: data.id,
          chunk_index: c.index,
          content: c.content,
          token_count: c.tokenCount,
        }))
      )
      .select()

    await supabase.from("modules").update({ status: "ready" }).eq("id", data.id)

    if (inserted && process.env.GEMINI_API_KEY) {
      try {
        const { generateEmbeddings } = await import("@/lib/ai/embedder")
        const chunkContents = inserted.map((c: { content: string }) => c.content)
        const embeddings = await generateEmbeddings(chunkContents)
        for (let i = 0; i < inserted.length; i++) {
          await supabase
            .from("module_chunks")
            .update({ embedding: embeddings[i] })
            .eq("id", inserted[i].id)
        }
      } catch (e) {
        console.warn("Embedding generation skipped:", e)
      }
    }

    return NextResponse.json({ moduleId: data.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Import failed: ${msg}` }, { status: 500 })
  }
}

