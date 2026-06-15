import { geminiFetch, isQuotaError, parseGeminiResponse, GEMINI_MODELS } from "./gemini-client"
import { getQuizSystemPrompt } from "./prompts"

export interface GeneratedQuestion {
  topic: string
  question_text: string
  question_type: "mcq" | "true_false"
  options: { label: string; text: string }[] | null
  correct_answer: string
  explanation: string
  difficulty: "easy" | "medium" | "hard"
}

export interface GeneratedQuiz {
  title: string
  topic_focus: string[]
  questions: GeneratedQuestion[]
}

interface GenerateQuizInput {
  moduleTitle: string
  chunks: { content: string; tokenCount: number }[]
  questionCount: number
  difficulty: string
  quizMode?: "mixed" | "mcq" | "true_false"
}

export async function generateQuiz(input: GenerateQuizInput): Promise<GeneratedQuiz> {
  const MAX_INPUT_TOKENS = 3000

  let contextText = ""
  for (const chunk of input.chunks) {
    const candidate = contextText ? contextText + "\n\n" + chunk.content : chunk.content
    if (candidate.length / 4 > MAX_INPUT_TOKENS) break
    contextText = candidate
  }

  const systemPrompt = getQuizSystemPrompt(input.quizMode ?? "mixed")
  const userPrompt = `Module: "${input.moduleTitle}"\n\nContent:\n${contextText}\n\nGenerate exactly ${input.questionCount} questions at ${input.difficulty} difficulty.`

  let lastError: unknown

  for (const [i, modelName] of GEMINI_MODELS.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000))

    try {
      const raw = await geminiFetch(modelName, [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ])

      const { content } = parseGeminiResponse(raw)
      const parsed = JSON.parse(content) as Record<string, unknown>

      if (!parsed.title || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("LLM returned malformed quiz structure")
      }

      const questions: GeneratedQuestion[] = []

      for (const q of parsed.questions as Record<string, unknown>[]) {
        const questionText = String(q.question_text ?? "").trim()
        if (!questionText) continue

        const questionType = q.question_type === "true_false" ? "true_false" : "mcq" as "mcq" | "true_false"
        const options = Array.isArray(q.options) ? q.options as { label: string; text: string }[] : null
        const correctAnswer = String(q.correct_answer ?? "").trim()

        if (questionType === "mcq") {
          if (!options || options.length < 2) continue
          const validLabels = options.map((o) => o.label)
          if (!validLabels.includes(correctAnswer)) continue
        }

        questions.push({
          topic: String(q.topic ?? "general"),
          question_text: questionText,
          question_type: questionType,
          options,
          correct_answer: correctAnswer,
          explanation: String(q.explanation ?? ""),
          difficulty: (q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium") as "easy" | "medium" | "hard",
        })
      }

      if (questions.length === 0) {
        throw new Error("LLM returned no valid questions")
      }

      return {
        title: String(parsed.title ?? ""),
        topic_focus: Array.isArray(parsed.topic_focus) ? parsed.topic_focus.map(String) : [],
        questions,
      }
    } catch (err) {
      lastError = err
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error("AI quiz quota exceeded. Please try again later or upgrade your Gemini API plan.")
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
