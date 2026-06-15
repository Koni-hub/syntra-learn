import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateLocalQuiz } from "@/lib/llm/local-quiz-generator"
import { extractPdfText } from "@/lib/pdf-extract"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { moduleId, questionCount = 5, difficulty = "medium" } = body
    if (!moduleId) return NextResponse.json({ error: "moduleId is required" }, { status: 400 })

    const { data: mod } = await supabase
      .from("modules")
      .select("id, title, raw_text, raw_pdf, user_id, topic_labels")
      .eq("id", moduleId)
      .eq("user_id", user.id)
      .single()

    if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 })

    let rawText = mod.raw_text
    if (rawText?.includes("[PDF content extraction pending]") && mod.raw_pdf) {
      try {
        const base64 = mod.raw_pdf.replace(/^data:application\/pdf;base64,/, "")
        const uint8 = new Uint8Array(Buffer.from(base64, "base64"))
        rawText = await extractPdfText(uint8)
        await supabase.from("modules").update({ raw_text: rawText }).eq("id", moduleId)
      } catch (e) {
        console.error("PDF re-extraction failed:", e)
      }
    }

    const { data: chunks } = await supabase
      .from("module_chunks")
      .select("content, token_count")
      .eq("module_id", moduleId)
      .order("chunk_index", { ascending: true })

    const chunkData = chunks?.length
      ? chunks.map((c) => ({ content: c.content, tokenCount: c.token_count }))
      : [{ content: rawText ?? "", tokenCount: Math.ceil((rawText?.length ?? 0) / 4) }]

    const generated = generateLocalQuiz({
      title: mod.title,
      chunks: chunkData,
      questionCount,
      difficulty,
      topicLabels: mod.topic_labels,
    })

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        module_id: moduleId,
        user_id: user.id,
        title: generated.title,
        quiz_type: "initial",
        difficulty,
        topic_focus: generated.topic_focus,
        question_ids: [],
      })
      .select()
      .single()

    if (quizError || !quiz) return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 })

    const questionInserts = generated.questions.map((q, i) => ({
      quiz_id: quiz.id,
      topic: q.topic,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      order_index: i,
    }))

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .insert(questionInserts)
      .select()

    if (questionsError || !questions) {
      await supabase.from("quizzes").delete().eq("id", quiz.id)
      return NextResponse.json({ error: "Failed to create questions" }, { status: 500 })
    }

    const questionIds = questions.map((q: { id: string }) => q.id)
    await supabase.from("quizzes").update({ question_ids: questionIds }).eq("id", quiz.id)

    return NextResponse.json({ quizId: quiz.id, questions })
  } catch (err) {
    return NextResponse.json({ error: `Local quiz gen failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}