import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIFlashcards } from "@/lib/llm/ai-flashcard-generator"
import type { Module } from "@/lib/types/database"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { moduleId, count = 10 } = body

  if (!moduleId) {
    return NextResponse.json({ error: "moduleId is required" }, { status: 400 })
  }

  const { data: mod, error: moduleError } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single()

  if (moduleError || !mod) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 })
  }

  if ((mod as Module).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rawText = (mod as Module).raw_text
  if (!rawText) {
    return NextResponse.json({ error: "Module has no content" }, { status: 400 })
  }

  try {
    const flashcards = await generateAIFlashcards({
      moduleTitle: (mod as Module).title,
      content: rawText,
      count,
    })
    return NextResponse.json({ flashcards })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Flashcard generation failed: ${msg}` }, { status: 503 })
  }
}
