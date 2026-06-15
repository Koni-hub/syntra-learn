import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const moduleId = searchParams.get("moduleId")

  let query = supabase
    .from("flashcard_schedule")
    .select("*")
    .eq("user_id", user.id)

  if (moduleId) {
    query = query.eq("module_id", moduleId)
  }

  const { data, error } = await query.order("due_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flashcards: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { moduleId, term, question, answer, easiness, interval, repetitions, dueAt } = body

  if (!moduleId || !term) {
    return NextResponse.json({ error: "moduleId and term are required" }, { status: 400 })
  }

  const payload = {
    user_id: user.id,
    module_id: moduleId,
    term,
    question: question ?? "",
    answer: answer ?? "",
    easiness: easiness ?? 2.5,
    interval: interval ?? 0,
    repetitions: repetitions ?? 0,
    due_at: dueAt ?? new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from("flashcard_schedule")
    .select("id")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("term", term)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("flashcard_schedule")
      .update(payload)
      .eq("id", existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: true })
  }

  const { error } = await supabase
    .from("flashcard_schedule")
    .insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: true })
}
