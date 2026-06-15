import { GoogleGenerativeAI } from "@google/generative-ai"
import { getQuizSystemPrompt } from "./prompts"

function getGenAI() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not set")
  return new GoogleGenerativeAI(key)
}

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

const MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]

function isQuotaError(err: unknown): boolean {
  if (err && typeof err === "object" && "message" in err) {
    const m = String(err.message)
    return m.includes("429") || m.includes("quota") || m.includes("Too Many") || m.includes("retry")
  }
  return false
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

  for (const [i, modelName] of MODELS.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000))

    try {
      const model = getGenAI().getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      })

      const result = await model.generateContent([systemPrompt, userPrompt])
      const content = result.response.text()
      if (!content) throw new Error("No content in LLM response")

      const parsed = JSON.parse(content)

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
        title: parsed.title,
        topic_focus: parsed.topic_focus ?? [],
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
