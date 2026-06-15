import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { chunkText } from "@/lib/llm/chunker"
import { generateQuiz, type GeneratedQuiz } from "@/lib/llm/quiz-generator"
import { generateEmbedding } from "@/lib/llm/embedder"
import { generateLocalQuiz } from "@/lib/llm/local-quiz-generator"
import type { Module, ModuleChunk } from "@/lib/types/database"

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { moduleId, questionCount = 5, difficulty = "medium", quizMode = "mixed" } = body

  if (!moduleId) {
    return NextResponse.json({ error: "moduleId is required" }, { status: 400 })
  }

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single()

  if (moduleError || !module) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 })
  }

  if ((module as Module).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const chunks = await supabase
    .from("module_chunks")
    .select("*")
    .eq("module_id", moduleId)
    .order("chunk_index", { ascending: true })

  let chunkRows: ModuleChunk[]

  if (!chunks.data || chunks.data.length === 0) {
    const rawText = (module as Module).raw_text
    if (!rawText) {
      return NextResponse.json({ error: "Module has no content" }, { status: 400 })
    }

    const textChunks = chunkText(rawText)
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

    if (insertError) {
      return NextResponse.json({ error: "Failed to create chunks" }, { status: 500 })
    }

    chunkRows = (inserted ?? []) as ModuleChunk[]
  } else {
    chunkRows = chunks.data as ModuleChunk[]
  }

  let selectedChunks = chunkRows.map((c) => ({ content: c.content, tokenCount: c.token_count }))

  const hasEmbeddings = chunkRows.some((c) => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0)
  if (hasEmbeddings && chunkRows.length > 3) {
    try {
      const queryEmbedding = await generateEmbedding((module as Module).title)
      const scored = chunkRows
        .filter((c) => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0)
        .map((c) => ({
          content: c.content,
          tokenCount: c.token_count,
          similarity: cosineSimilarity(queryEmbedding, c.embedding as unknown as number[]),
        }))
        .sort((a, b) => b.similarity - a.similarity)

      const MAX_TOKENS = 8000
      const ragChunks: typeof selectedChunks = []
      let totalTokens = 0
      for (const sc of scored) {
        if (totalTokens + sc.tokenCount > MAX_TOKENS) break
        ragChunks.push({ content: sc.content, tokenCount: sc.tokenCount })
        totalTokens += sc.tokenCount
      }
      if (ragChunks.length >= 2) {
        selectedChunks = ragChunks
      }
    } catch {
      // fall through to all chunks
    }
  }

  let generated: GeneratedQuiz
  try {
    generated = await generateQuiz({
      moduleTitle: (module as Module).title,
      chunks: selectedChunks,
      questionCount,
      difficulty,
      quizMode,
      topicLabels: (module as Module).topic_labels,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try {
      generated = generateLocalQuiz({
        title: (module as Module).title,
        chunks: selectedChunks,
        questionCount,
        difficulty,
        topicLabels: (module as Module).topic_labels,
      })
    } catch {
      return NextResponse.json({ error: `Quiz generation failed: ${msg}` }, { status: 503 })
    }
  }

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

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 })
  }

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
}
