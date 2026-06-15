export interface FlashCard {
  id: number
  question: string
  answer: string
}

const SENTENCE_STARTERS = new Set([
  "here", "there", "this", "that", "these", "those", "it", "they",
  "one", "two", "three", "some", "many", "most", "several", "another",
  "each", "every", "all", "both", "neither", "either",
  "first", "second", "third", "next", "then", "finally", "also",
  "however", "therefore", "thus", "hence",
  "what", "which", "who", "whom", "whose",
  "our", "we", "you", "your", "my", "his", "her", "its", "their",
  "typically", "usually", "often", "sometimes",
  "basically", "essentially", "importantly", "notably",
  "interestingly", "consequently", "additionally",
  "furthermore", "moreover", "nevertheless", "nonetheless",
  "for", "but", "and", "so", "or", "yet",
])

const COMMON_NOUNS = new Set([
  "application", "applications", "approach", "approaches", "example", "examples",
  "method", "methods", "technique", "techniques", "process", "processes",
  "system", "systems", "model", "models", "algorithm", "algorithms",
  "function", "functions", "data", "information", "result", "results",
  "output", "input", "value", "values", "type", "types", "part", "parts",
  "component", "components", "feature", "features", "property", "properties",
  "concept", "concepts", "principle", "principles", "theory", "theories",
  "framework", "tool", "tools", "platform", "platforms",
])

function splitSentences(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .flatMap((p) => p.replace(/\n/g, " ").split(/(?<=[.!?])\s+/))
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= 30 && s.length <= 1000 && /^[A-Za-z]/.test(s))
}

function isRealTerm(word: string): boolean {
  const lc = word.toLowerCase()
  if (lc.length < 4) return false
  if (SENTENCE_STARTERS.has(lc)) return false
  if (COMMON_NOUNS.has(lc)) return false
  if (/^\d/.test(lc)) return false
  return true
}

function cleanTerm(term: string): string {
  return term.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9\s-]+$/g, "").trim()
}

interface WordFreq {
  word: string
  count: number
}

function buildFreqMap(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const s of sentences) {
    const words = s.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || []
    for (const w of words) {
      if (!SENTENCE_STARTERS.has(w) && !COMMON_NOUNS.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1)
      }
    }
  }
  return freq
}

function extractDefinitionSubject(sentence: string): string | null {
  const trimmed = sentence.trim()
  const match = trimmed.match(
    /^(.*?)\s+(is|are|was|were|refers to|means|defined as|known as|called)\s+/i
  )
  if (!match) return null

  let subject = cleanTerm(match[1].trim())
  if (!subject || subject.length < 3) return null

  const firstWord = subject.split(/\s+/)[0].toLowerCase()

  if (SENTENCE_STARTERS.has(firstWord)) return null

  if (subject.split(/\s+/).length === 1 && subject.length < 7) {
    if (COMMON_NOUNS.has(subject.toLowerCase())) return null
  }

  return subject
}

function extractKeyTerm(sentence: string, freq: Map<string, number>): string | null {
  const trimmed = sentence.trim()

  const quoted = trimmed.match(/[""]([A-Za-z0-9][A-Za-z0-9\s-]{4,})[""]/)
  if (quoted) {
    const term = cleanTerm(quoted[1])
    if (term.length >= 5) return term
  }

  const multiWord = trimmed.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/)
  if (multiWord) {
    const term = cleanTerm(multiWord[1])
    if (term.length >= 6) return term
  }

  const words = trimmed.match(/\b([A-Z][a-zA-Z]{5,})\b/g) || []
  const valid = words.filter(isRealTerm)
  if (valid.length > 0) {
    const scored = valid.map((w) => ({
      word: w,
      score: (freq.get(w.toLowerCase()) || 0) * 10 + w.length,
    }))
    scored.sort((a, b) => b.score - a.score)
    return scored[0].word
  }

  const allWords = trimmed.match(/\b([a-zA-Z]{7,})\b/g) || []
  const validLong = allWords.filter((w) => {
    const lc = w.toLowerCase()
    return !SENTENCE_STARTERS.has(lc) && !COMMON_NOUNS.has(lc)
  })
  if (validLong.length > 0) {
    const scored = validLong.map((w) => ({
      word: w,
      score: (freq.get(w.toLowerCase()) || 0) * 10 + w.length,
    }))
    scored.sort((a, b) => b.score - a.score)
    return scored[0].word
  }

  return null
}

export function generateFlashcards(text: string, maxCards = 30): FlashCard[] {
  const cards: FlashCard[] = []
  const seen = new Set<string>()
  let id = 0

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 30)
  const allSentences = splitSentences(text)
  const freq = buildFreqMap(allSentences)

  const definitionPattern = /\b(is|are|was|were|refers to|means|defined as|known as|called)\b/i
  const factPattern = /\b(involves|consists of|comprises|includes|contains|composed of|describes|represents|occurs when|happens when|leads to|results in|causes|produces|creates|triggers|requires|needs|uses|employs|utilizes|depends on|relies on|is used for|is used to|serves as|acts as|functions as|is characterized by)\b/i

  for (const para of paragraphs) {
    if (cards.length >= maxCards) break

    const clean = para.replace(/\n/g, " ").replace(/\s+/g, " ").trim()
    const sentences = splitSentences(clean)

    for (const sentence of sentences) {
      if (cards.length >= maxCards) break

      if (!definitionPattern.test(sentence)) continue

      const subject = extractDefinitionSubject(sentence)
      if (!subject) continue

      const key = subject.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      cards.push({
        id: id++,
        question: `What is ${subject}?`,
        answer: sentence.replace(/[.!;]+$/, "") + ".",
      })
    }
  }

  if (cards.length < Math.max(5, Math.floor(maxCards * 0.5))) {
    for (const sentence of allSentences) {
      if (cards.length >= maxCards) break
      if (!factPattern.test(sentence)) continue

      const term = extractKeyTerm(sentence, freq)
      if (!term) continue

      const key = term.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      cards.push({
        id: id++,
        question: `What does the module say about ${term}?`,
        answer: sentence.replace(/[.!;]+$/, "") + ".",
      })
    }
  }

  if (cards.length < 3) {
    const scored: { sentence: string; score: number }[] = []

    for (const sentence of allSentences) {
      const words = sentence.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || []
      const termScore = words.reduce((sum, w) => sum + (freq.get(w) || 0), 1)
      scored.push({ sentence, score: termScore })
    }

    scored.sort((a, b) => b.score - a.score)

    for (const { sentence } of scored) {
      if (cards.length >= 8) break
      const term = extractKeyTerm(sentence, freq)
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
    const mid = Math.floor(allSentences.length / 2)
    if (mid > 0) {
      cards.push({
        id: id++,
        question: "What is the main topic covered in this module?",
        answer: allSentences.slice(0, mid).join(" ").slice(0, 400) + ".",
      })
    }
    if (allSentences.length > mid + 1) {
      cards.push({
        id: id++,
        question: "What additional topics does this module discuss?",
        answer: allSentences.slice(mid).join(" ").slice(0, 400) + ".",
      })
    }
  }

  return cards
}
