import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { chunkText } from "@/lib/llm/chunker"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { moduleId } = body
  if (!moduleId) return NextResponse.json({ error: "moduleId is required" }, { status: 400 })

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("raw_text, user_id")
    .eq("id", moduleId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (moduleError) return NextResponse.json({ error: moduleError.message }, { status: 500 })
  if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 })
  if (!module.raw_text) return NextResponse.json({ error: "Module has no content" }, { status: 400 })

  const cleanText = module.raw_text.trim()
  if (cleanText.length < 10) {
    await supabase.from("modules").update({ status: "failed" }).eq("id", moduleId)
    return NextResponse.json({ error: "Module content is too short or extraction failed" }, { status: 400 })
  }

  const textChunks = chunkText(cleanText)

  const { data: inserted, error: insertError } = await supabase
    .from("module_chunks")
    .insert(
      textChunks.map((c) => ({
        module_id: moduleId,
        chunk_index: c.index,
        content: c.content,
        token_count: c.tokenCount,
      }))
    )
    .select()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Try embeddings (best-effort)
  if (process.env.GEMINI_API_KEY) {
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

  await supabase
    .from("modules")
    .update({ status: "ready" })
    .eq("id", moduleId)

  return NextResponse.json({ chunkCount: textChunks.length })
}
