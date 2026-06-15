import { geminiFetch, isQuotaError, parseGeminiResponse, GEMINI_MODELS } from "./gemini-client"
import { FLASHCARD_SYSTEM_PROMPT } from "./prompts"
import { generateFlashcards } from "../flashcard-generator"

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

function validateCard(card: { term?: unknown; question?: unknown; answer?: unknown }, sourceText: string): boolean {
  const term = String(card.term ?? "").trim()
  const question = String(card.question ?? "").trim()
  const answer = String(card.answer ?? "").trim()

  if (!term || !question || !answer) return false
  if (term.length < 2 || question.length < 10 || answer.length < 5) return false
  if (question.toLowerCase() === answer.toLowerCase()) return false

  const sourceLower = sourceText.toLowerCase()
  const answerWords = answer.split(/\s+/).filter((w) => w.length > 4)
  if (answerWords.length > 0) {
    const matches = answerWords.filter((w) => sourceLower.includes(w.toLowerCase())).length
    if (matches < Math.ceil(answerWords.length * 0.3)) return false
  }

  return true
}

export async function generateAIFlashcards(input: GenerateFlashcardsInput): Promise<AIFlashCard[]> {
  const MAX_INPUT_TOKENS = 8000

  let contextText = ""
  const words = input.content.split(/\s+/)
  for (const word of words) {
    const candidate = contextText ? contextText + " " + word : word
    if (candidate.length / 4 > MAX_INPUT_TOKENS) break
    contextText = candidate
  }

  const userPrompt = `Module: "${input.moduleTitle}"\n\nContent:\n${contextText}\n\nGenerate exactly ${input.count ?? 10} flashcards covering the most important concepts and terms. Each flashcard must have a unique term, a clear question, and a precise answer derived from the content.`

  let lastError: unknown

  for (const [i, modelName] of GEMINI_MODELS.entries()) {
    if (i > 0 && !isQuotaError(lastError)) await new Promise((r) => setTimeout(r, 2000))

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
      const seenTerms = new Set<string>()

      for (const card of parsed.flashcards as Record<string, unknown>[]) {
        if (!validateCard(card, contextText)) continue

        const term = String(card.term ?? "").trim()
        const lowerTerm = term.toLowerCase()
        if (seenTerms.has(lowerTerm)) continue
        seenTerms.add(lowerTerm)

        cards.push({
          term,
          question: String(card.question ?? "").trim(),
          answer: String(card.answer ?? "").trim(),
        })
      }

      if (cards.length === 0) throw new Error("LLM returned no valid flashcards after validation")
      return cards
    } catch (err) {
      lastError = err
    }
  }

  if (isQuotaError(lastError)) {
    const localCards = generateFlashcards(input.content, input.count ?? 10)
    return localCards.map((c) => ({
      term: c.term ?? `Card ${c.id}`,
      question: c.question,
      answer: c.answer,
    }))
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
