import { geminiFetch, isQuotaError, parseGeminiResponse, GEMINI_MODELS } from "./gemini-client"
import { getQuizSystemPrompt, type QuizMode } from "./prompts"
import { generateLocalQuiz } from "./local-quiz-generator"

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
  quizMode?: QuizMode
  topicLabels?: string[]
}

function validateAgainstSource(question: Record<string, unknown>, sourceText: string): boolean {
  const questionText = String(question.question_text ?? "").toLowerCase()
  const correctAnswer = String(question.correct_answer ?? "").toLowerCase()
  const sourceLower = sourceText.toLowerCase()

  if (!questionText || !correctAnswer) return false

  const contentWords = correctAnswer.split(/\s+/).filter((w) => w.length > 3)
  if (contentWords.length > 0) {
    const matchCount = contentWords.filter((w) => sourceLower.includes(w)).length
    if (matchCount < Math.ceil(contentWords.length * 0.5)) return false
  }

  if (question.question_type === "mcq") {
    const options = question.options as { label: string; text: string }[] | undefined
    if (!options || options.length < 2) return false
    const validLabels = options.map((o) => o.label)
    if (!validLabels.includes(String(question.correct_answer ?? ""))) return false
    const optionTexts = options.map((o) => o.text.toLowerCase())
    const distractorMatches = optionTexts.map((t) => {
      const words = t.split(/\s+/).filter((w) => w.length > 3)
      return words.filter((w) => sourceLower.includes(w)).length
    })
    const totalDistractorWords = optionTexts.reduce((s, t) => s + t.split(/\s+/).filter((w) => w.length > 3).length, 0)
    if (totalDistractorWords > 10 && distractorMatches.reduce((a, b) => a + b, 0) < 2) return false
  }

  if (question.question_type === "true_false") {
    if (correctAnswer !== "a" && correctAnswer !== "b") return false
  }

  return true
}

export async function generateQuiz(input: GenerateQuizInput): Promise<GeneratedQuiz> {
  const MAX_INPUT_TOKENS = 8000

  let contextText = ""
  for (const chunk of input.chunks) {
    const candidate = contextText ? contextText + "\n\n" + chunk.content : chunk.content
    if (candidate.length / 4 > MAX_INPUT_TOKENS) break
    contextText = candidate
  }

  const quizMode = input.quizMode ?? "mixed"
  const systemPrompt = getQuizSystemPrompt(quizMode)
  const userPrompt = `Module: "${input.moduleTitle}"\n\nContent:\n${contextText}\n\nGenerate exactly ${input.questionCount} questions at ${input.difficulty} difficulty. Use diverse question types as specified.`

  let lastError: unknown

  for (const [i, modelName] of GEMINI_MODELS.entries()) {
    if (i > 0 && !isQuotaError(lastError)) await new Promise((r) => setTimeout(r, 2000))

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

        if (!validateAgainstSource(q, contextText)) continue

        const questionType = (() => {
          if (quizMode === "short_answer") return "mcq" as const
          const t = String(q.question_type ?? "")
          if (t === "true_false") return "true_false" as const
          return "mcq" as const
        })()

        const options = Array.isArray(q.options) ? q.options as { label: string; text: string }[] : null
        const correctAnswer = String(q.correct_answer ?? "").trim()

        if (questionType === "mcq") {
          if (!options || options.length < 2) continue
          const validLabels = options.map((o) => o.label)
          if (!validLabels.includes(correctAnswer)) continue
        }

        if (questionType === "true_false") {
          if (correctAnswer !== "A" && correctAnswer !== "B" && correctAnswer !== "True" && correctAnswer !== "False") continue
        }

        questions.push({
          topic: String(q.topic ?? "general"),
          question_text: questionText,
          question_type: questionType,
          options,
          correct_answer: correctAnswer === "True" ? "A" : correctAnswer === "False" ? "B" : correctAnswer,
          explanation: String(q.explanation ?? ""),
          difficulty: (q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium") as "easy" | "medium" | "hard",
        })
      }

      if (questions.length === 0) {
        throw new Error("LLM returned no valid questions after validation")
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
    const local = generateLocalQuiz({
      title: input.moduleTitle,
      chunks: input.chunks,
      questionCount: input.questionCount,
      difficulty: input.difficulty,
      topicLabels: input.topicLabels,
    })
    return local
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
