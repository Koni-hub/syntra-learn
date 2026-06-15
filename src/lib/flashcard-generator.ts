export interface FlashCard {
  id: number
  question: string
  answer: string
  term?: string
}

const STOP_WORDS = new Set([
  "this", "that", "these", "those", "here", "there", "they", "them", "their",
  "which", "what", "when", "where", "who", "whom", "whose",
  "about", "above", "after", "again", "against", "all", "also", "any", "are",
  "because", "been", "before", "being", "between", "both", "but", "can",
  "come", "could", "did", "does", "done", "each", "else", "every", "few",
  "for", "from", "further", "get", "give", "go", "has", "have", "having",
  "here", "how", "into", "just", "know", "like", "make", "many", "may",
  "more", "most", "much", "must", "need", "never", "new", "next", "now",
  "often", "once", "only", "other", "over", "own", "part", "place", "put",
  "same", "see", "should", "show", "some", "such", "take", "than", "that",
  "then", "there", "these", "they", "thing", "think", "three", "through",
  "thus", "time", "too", "under", "upon", "use", "used", "uses", "using",
  "value", "very", "want", "way", "well", "were", "what", "when", "where",
  "which", "while", "who", "why", "will", "with", "without", "work", "would",
  "year", "years",
])

const SENTENCE_END = /(?<=[.!?])\s+/
const PARAGRAPH_BREAK = /\n\s*\n/

function splitSentences(text: string): string[] {
  return text
    .split(PARAGRAPH_BREAK)
    .flatMap((p) => p.replace(/\n/g, " ").split(SENTENCE_END))
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= 20 && s.length <= 800 && /^[A-Z]/.test(s))
}

function getContentWords(text: string): string[] {
  return text.match(/\b[a-zA-Z]{4,}\b/g)?.filter((w) => !STOP_WORDS.has(w.toLowerCase())) ?? []
}

function buildCoOccurrence(sentences: string[]): Map<string, Map<string, number>> {
  const cooc = new Map<string, Map<string, number>>()
  for (const s of sentences) {
    const words = getContentWords(s)
    const unique = [...new Set(words.map((w) => w.toLowerCase()))]
    for (const a of unique) {
      if (!cooc.has(a)) cooc.set(a, new Map())
      const row = cooc.get(a)!
      for (const b of unique) {
        if (a === b) continue
        row.set(b, (row.get(b) ?? 0) + 1)
      }
    }
  }
  return cooc
}

function scoreSentences(sentences: string[], cooc: Map<string, Map<string, number>>): { sentence: string; score: number; terms: string[] }[] {
  return sentences.map((sentence) => {
    const words = getContentWords(sentence)
    const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))]
    let termScore = 0
    const topTerms: string[] = []
    for (const w of uniqueWords) {
      const connections = cooc.get(w)
      if (connections) {
        const connCount = connections.size
        if (connCount >= 2) {
          termScore += connCount
          topTerms.push(w)
        }
      }
    }
    const isDefinition = /\b(is|are|was|were|refers to|means|defined as|known as|called|also known as|consists of|comprises|involves|describes|represents)\b/i.test(sentence)
    const positionScore = 1 + (uniqueWords.filter((w) => w.length > 7).length * 0.5)
    const score = (isDefinition ? 3 : 1) * (termScore / Math.max(sentence.split(/\s+/).length, 1)) * positionScore
    return { sentence, score, terms: topTerms.slice(0, 3).map((t) => {
      const idx = sentence.toLowerCase().indexOf(t)
      return idx >= 0 ? sentence.slice(idx, idx + t.length) : t
    }) }
  }).sort((a, b) => b.score - a.score)
}

function extractQAPair(sentence: string, term: string): { question: string; answer: string } | null {
  const clean = sentence.replace(/^[^a-zA-Z]+/, "").trim()
  if (!clean) return null

  const defMatch = clean.match(
    new RegExp(`^(.*?${escapeRegex(term)}.*?)\\s+(is|are|was|were|refers to|means|defined as|known as|called)\\s+(.+)`, "i")
  )
  if (defMatch) {
    const subject = defMatch[1].trim()
    const definition = defMatch[3].trim().replace(/[.!;]+$/, "")
    return {
      question: `What is ${subject}?`,
      answer: `${subject} is ${definition}.`,
    }
  }

  const quoteMatch = clean.match(new RegExp(`[""\`]([^""\`]{10,})[""\`]\\s+(is|are|was|were|refers to|means)\\s+(.+)`, "i"))
  if (quoteMatch) {
    return {
      question: `What does the term "${quoteMatch[1]}" mean?`,
      answer: quoteMatch[3].trim().replace(/[.!;]+$/, "") + ".",
    }
  }

  return {
    question: `What does the text say about "${term}"?`,
    answer: clean.replace(/[.!;]+$/, "") + ".",
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function generateFlashcards(text: string, maxCards = 30): FlashCard[] {
  const allSentences = splitSentences(text)

  if (allSentences.length === 0) return []

  const cooc = buildCoOccurrence(allSentences)
  const scored = scoreSentences(allSentences, cooc)
  const usedTerms = new Set<string>()
  const cards: FlashCard[] = []
  let id = 0

  for (const { sentence, terms } of scored) {
    if (cards.length >= maxCards) break
    for (const term of terms) {
      if (cards.length >= maxCards) break
      const lower = term.toLowerCase()
      if (usedTerms.has(lower) || term.length < 3) continue
      usedTerms.add(lower)

      const qa = extractQAPair(sentence, term)
      if (qa) {
        cards.push({
          id: id++,
          question: qa.question,
          answer: qa.answer,
          term,
        })
      }
    }
  }

  if (cards.length < 3) {
    for (const { sentence, terms } of scored) {
      if (cards.length >= maxCards) break
      const fallbackTerm = terms[0] ?? `topic ${id}`
      const lower = fallbackTerm.toLowerCase()
      if (usedTerms.has(lower)) continue
      usedTerms.add(lower)
      cards.push({
        id: id++,
        question: `What key point is made about "${fallbackTerm}"?`,
        answer: sentence.replace(/[.!;]+$/, "") + ".",
        term: fallbackTerm,
      })
    }
  }

  return cards
}
