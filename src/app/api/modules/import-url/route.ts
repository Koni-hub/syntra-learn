import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { chunkText } from "@/lib/llm/chunker"

async function extractYouTubeTranscript(videoId: string): Promise<string> {
  const captionsUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`

  const res = await fetch(captionsUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SyntraBot/1.0)" },
  })

  if (!res.ok) {
    throw new Error("Could not fetch YouTube captions. The video may not have English subtitles.")
  }

  const xml = await res.text()
  const texts: string[] = []
  const regex = /<text[^>]*>(.*?)<\/text>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .trim()
    if (text) texts.push(text)
  }

  if (texts.length === 0) throw new Error("No caption text found in the video")
  return texts.join(" ")
}

async function extractWebPageContent(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SyntraBot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
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
      rawText = await extractYouTubeTranscript(videoId)
      title = `YouTube: ${videoId}`
      try {
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SyntraBot/1.0)" },
          signal: AbortSignal.timeout(10000),
        })
        const pageHtml = await pageRes.text()
        const ogTitle = pageHtml.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i)
        if (ogTitle) title = `YouTube: ${ogTitle[1]}`
      } catch { /* use default title */ }
    } else {
      const page = await extractWebPageContent(url)
      title = page.title
      rawText = page.text
    }

    if (!rawText || rawText.length < 50) {
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

    if (inserted && process.env.GEMINI_API_KEY) {
      try {
        const { generateEmbeddings } = await import("@/lib/llm/embedder")
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

    await supabase.from("modules").update({ status: "ready" }).eq("id", data.id)

    return NextResponse.json({ moduleId: data.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Import failed: ${msg}` }, { status: 500 })
  }
}
