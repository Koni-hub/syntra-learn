import { geminiFetch, isQuotaError, parseGeminiResponse, GEMINI_MODELS } from "./gemini-client"
import { FLASHCARD_SYSTEM_PROMPT } from "./prompts"

export interface AIFlashCard {
  term: string
  question: string
  answer: string
}

interface GenerateFlashcardsInput {
  moduleTitle: string
  content: string
  count?: number
}

export async function generateAIFlashcards(input: GenerateFlashcardsInput): Promise<AIFlashCard[]> {
  const MAX_INPUT_TOKENS = 4000

  let contextText = ""
  const words = input.content.split(/\s+/)
  for (const word of words) {
    const candidate = contextText ? contextText + " " + word : word
    if (candidate.length / 4 > MAX_INPUT_TOKENS) break
    contextText = candidate
  }

  const userPrompt = `Module: "${input.moduleTitle}"\n\nContent:\n${contextText}\n\nGenerate exactly ${input.count ?? 10} flashcards covering the most important concepts and terms.`

  let lastError: unknown

  for (const [i, modelName] of GEMINI_MODELS.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000))

    try {
      const raw = await geminiFetch(modelName, [
        { role: "user", parts: [{ text: FLASHCARD_SYSTEM_PROMPT }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ])

      const { content } = parseGeminiResponse(raw)
      const parsed = JSON.parse(content) as Record<string, unknown>

      if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
        throw new Error("LLM returned no flashcards")
      }

      const cards: AIFlashCard[] = []
      for (const card of parsed.flashcards as Record<string, unknown>[]) {
        const term = String(card.term ?? "").trim()
        const question = String(card.question ?? "").trim()
        const answer = String(card.answer ?? "").trim()
        if (!term || !question || !answer) continue
        cards.push({ term, question, answer })
      }

      if (cards.length === 0) throw new Error("LLM returned no valid flashcards")
      return cards
    } catch (err) {
      lastError = err
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error("AI flashcard quota exceeded. Please try again later.")
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
