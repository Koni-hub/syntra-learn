export interface FlashCard {
  id: number
  question: string
  answer: string
}

const STOP_WORDS = new Set([
  "this", "that", "these", "those", "which", "what", "when", "where",
  "there", "their", "them", "they", "have", "has", "had", "been",
  "being", "does", "done", "some", "such", "each", "every", "both",
  "first", "second", "third", "also", "very", "just", "more", "most",
  "only", "other", "over", "than", "then", "with", "without", "because",
  "before", "after", "between", "through", "during", "about", "into",
])

function splitSentences(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .flatMap((p) => p.replace(/\n/g, " ").split(/(?<=[.!?])\s+/))
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => {
      if (s.length < 30 || s.length > 800) return false
      if (/^[^a-zA-Z]/.test(s)) return false
      return true
    })
}

const DEFINITION_VERBS = /\b(is|are|was|were|refers to|means|defined as|known as|called|also called|also known as)\b/i
const PATTERN_VERBS = /\b(involves|consists of|comprises|includes|contains|composed of|describes|represents|occurs when|happens when|leads to|results in|causes|produces|creates|triggers|requires|needs|uses|employs|utilizes|depends on|relies on|is used for|is used to|serves as|acts as|functions as|is characterized by|is distinguished by)\b/i

function extractDefinitionTerm(sentence: string): string | null {
  const match = sentence.match(
    /^([A-Z][a-zA-Z0-9]*(?:\s+[A-Za-z][a-zA-Z0-9]*)?(?:\s+[A-Za-z][a-zA-Z0-9]*)?(?:\s+[A-Za-z][a-zA-Z0-9]*)?(?:\s+[A-Za-z][a-zA-Z0-9]*)?)\s+(is|are|was|were|refers to|means|defined as|known as|called)\s+/i
  )
  if (match) {
    const term = match[1].trim()
    if (term.length >= 3 && !STOP_WORDS.has(term.toLowerCase())) return term
  }
  return null
}

function extractContextTerm(sentence: string): string | null {
  const quoted = sentence.match(/[""]([A-Za-z][A-Za-z\s-]{3,})[""]/)
  if (quoted) {
    const term = quoted[1].trim()
    if (term.length >= 4) return term
  }

  const multiWord = sentence.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?))\b/)
  if (multiWord) {
    const term = multiWord[1].trim()
    if (!STOP_WORDS.has(term.toLowerCase()) && term.length >= 6) return term
  }

  const singleCap = sentence.match(/\b([A-Z][a-z]{4,})\b/)
  if (singleCap) {
    const term = singleCap[1]
    if (!STOP_WORDS.has(term.toLowerCase())) return term
  }

  const longWords = sentence.match(/\b([a-zA-Z]{8,})\b/g)
  if (longWords) {
    const sorted = longWords
      .map((w) => w.toLowerCase())
      .filter((w) => !STOP_WORDS.has(w))
      .sort((a, b) => b.length - a.length)
    if (sorted.length > 0) return sorted[0]
  }

  return null
}

export function generateFlashcards(text: string, maxCards = 30): FlashCard[] {
  const cards: FlashCard[] = []
  const seen = new Set<string>()
  let id = 0

  const sentences = splitSentences(text)

  for (const sentence of sentences) {
    if (cards.length >= maxCards) break

    const term = extractDefinitionTerm(sentence)
    if (!term) continue

    const key = term.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const answer = sentence.replace(/[.!;]+$/, "") + "."
    cards.push({
      id: id++,
      question: `What is ${term}?`,
      answer,
    })
  }

  if (cards.length < maxCards * 0.5) {
    for (const sentence of sentences) {
      if (cards.length >= maxCards) break
      if (PATTERN_VERBS.test(sentence)) {
        const term = extractContextTerm(sentence)
        if (!term) continue

        const key = term.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)

        cards.push({
          id: id++,
          question: `Explain "${term}" based on the module:`,
          answer: sentence.replace(/[.!;]+$/, "") + ".",
        })
      }
    }
  }

  if (cards.length < 5) {
    for (const sentence of sentences) {
      if (cards.length >= 10) break
      const term = extractContextTerm(sentence)
      if (!term) continue

      const key = term.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      cards.push({
        id: id++,
        question: `What does the text say about "${term}"?`,
        answer: sentence.replace(/[.!;]+$/, "") + ".",
      })
    }
  }

  if (cards.length === 0) {
    const mid = Math.floor(sentences.length / 2)
    const firstHalf = sentences.slice(0, mid).join(" ")
    const secondHalf = sentences.slice(mid).join(" ")

    if (firstHalf.length > 20) {
      cards.push({
        id: id++,
        question: "What is the main topic of this module?",
        answer: firstHalf.length > 300 ? firstHalf.slice(0, 300) + "..." : firstHalf,
      })
    }
    if (secondHalf.length > 20) {
      cards.push({
        id: id++,
        question: "What else does this module cover?",
        answer: secondHalf.length > 300 ? secondHalf.slice(0, 300) + "..." : secondHalf,
      })
    }
  }

  return cards
}
