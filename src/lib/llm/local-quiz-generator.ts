interface LocalQuestion {
  topic: string
  question_text: string
  question_type: "mcq" | "true_false"
  options: { label: string; text: string }[] | null
  correct_answer: string
  explanation: string
  difficulty: "easy" | "medium" | "hard"
}

interface LocalQuiz {
  title: string
  topic_focus: string[]
  questions: LocalQuestion[]
}

const LABELS = ["A", "B", "C", "D"]

function splitSentences(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .flatMap((p) => p.replace(/\n/g, " ").split(/(?<=[.!?])\s+/))
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 25 && s.length < 600)
}

function extractTopics(text: string, labels: string[]): string[] {
  if (labels.length > 0) return labels
  const seen = new Set<string>()
  const topics: string[] = []
  const matches = text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g)
  for (const m of matches) {
    const t = m[1].trim()
    if (t.length >= 8 && t.length <= 50 && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase())
      topics.push(t)
    }
    if (topics.length >= 6) break
  }
  return topics.length > 0 ? topics : ["general"]
}

function classifyDifficulty(sentence: string): "easy" | "medium" | "hard" {
  const wordCount = sentence.split(/\s+/).length
  const hasComplexTerms = /\b[A-Z][a-z]{6,}\b/g.test(sentence)
  const hasQualifiers = /\b(typically|often|usually|generally|frequently|rarely)\b/i.test(sentence)
  if (wordCount < 15 && !hasComplexTerms) return "easy"
  if (wordCount > 30 || hasComplexTerms) return "hard"
  if (hasQualifiers) return "medium"
  const avgWordLen =
    sentence.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / Math.max(wordCount, 1)
  if (avgWordLen > 6) return "hard"
  if (avgWordLen < 4.5) return "easy"
  return "medium"
}

function coOccurringTerms(sentence: string, allText: string): string[] {
  const words = sentence.match(/\b[A-Z][a-zA-Z]{3,}(?:\s+[A-Z][a-zA-Z]{3,})?\b/g) ?? []
  const terms = new Set(words.map((w) => w.toLowerCase()))
  const candidates: string[] = []
  const allMatches = allText.matchAll(/\b([A-Z][a-zA-Z]{3,}(?:\s+[A-Z][a-zA-Z]{3,})?)\b/g)
  for (const m of allMatches) {
    const t = m[1]
    const lower = t.toLowerCase()
    if (!terms.has(lower) && !candidates.includes(t) && t.length >= 4) {
      candidates.push(t)
    }
  }
  return candidates
}

function extractDefinitionSubject(sentence: string): string | null {
  const match = sentence.match(
    /^(.*?)\s+(is|are|was|were|refers to|means|defined as|known as|called)\s+/i
  )
  if (!match) return null
  return match[1].trim()
}

function buildTrueFalse(sentence: string, allText: string): { statement: string; isTrue: boolean } | null {
  const negationWords = /\b(not|never|no|none|without|except|unless|cannot|cannot)\b/i
  const hasNegation = negationWords.test(sentence)
  if (hasNegation) {
    const flipped = sentence.replace(negationWords, "___")
    if (flipped !== sentence && flipped.length > 20) {
      return { statement: sentence, isTrue: true }
    }
  }
  const match = sentence.match(
    /\b(is|are|was|were|has|have|can|will|must|refers to|means|defined as)\s+(.+)/i
  )
  if (!match) return null
  const core = match[2].trim()
  if (core.length < 5) return null
  const altTerms = coOccurringTerms(sentence, allText).filter(
    (t) => !sentence.toLowerCase().includes(t.toLowerCase())
  )
  if (altTerms.length > 0) {
    const alt = altTerms[Math.floor(Math.random() * altTerms.length)]
    const falseStatement = sentence.replace(core, alt)
    if (falseStatement !== sentence) {
      return Math.random() > 0.5
        ? { statement: sentence, isTrue: true }
        : { statement: falseStatement, isTrue: false }
    }
  }
  const falseStatement = sentence.replace(
    match[0],
    `${match[1]} not ${core}`
  )
  if (falseStatement !== sentence) {
    return { statement: falseStatement, isTrue: false }
  }
  return { statement: sentence, isTrue: true }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickOptions(correct: string, distractors: string[]): { label: string; text: string }[] {
  const pool = [correct, ...distractors.filter((d) => d !== correct)]
  const shuffled = shuffle(pool).slice(0, 4)
  while (shuffled.length < 4) {
    shuffled.push("None of the above")
  }
  return shuffled.map((opt, i) => ({ label: LABELS[i], text: opt }))
}

export function generateLocalQuiz(params: {
  title: string
  chunks: { content: string; tokenCount: number }[]
  questionCount: number
  difficulty: string
  topicLabels?: string[]
}): LocalQuiz {
  const { title, chunks, questionCount, topicLabels } = params

  const allText = chunks.map((c) => c.content).join("\n")
  if (allText.includes("[PDF content extraction pending]") || allText.trim().length < 20) {
    return {
      title: `Quiz: ${title}`,
      topic_focus: ["general"],
      questions: [
        {
          topic: "general",
          question_text: "No content available for quiz generation.",
          question_type: "mcq",
          options: [
            { label: "A", text: "Re-upload the PDF file" },
            { label: "B", text: "Try again later" },
            { label: "C", text: "Contact support" },
            { label: "D", text: "All of the above" },
          ],
          correct_answer: "A",
          explanation: "The PDF text could not be extracted. Please re-upload the file to enable quiz generation.",
          difficulty: "easy",
        },
      ],
    }
  }

  const sentences = splitSentences(allText)
  if (sentences.length === 0) {
    return {
      title: `Quiz: ${title}`,
      topic_focus: ["general"],
      questions: [
        {
          topic: "general",
          question_text: `What is "${title}" about?`,
          question_type: "mcq",
          options: [
            { label: "A", text: title },
            { label: "B", text: "Unknown topic" },
            { label: "C", text: "Not specified" },
            { label: "D", text: "All of the above" },
          ],
          correct_answer: "A",
          explanation: `The module is titled "${title}".`,
          difficulty: "easy",
        },
      ],
    }
  }

  const topics = extractTopics(allText, topicLabels ?? [])
  const topicFocus = topics.length > 3 ? shuffle(topics).slice(0, 3) : topics

  const topicMap = new Map<string, string[]>()
  for (const sentence of sentences) {
    const assigned =
      topics.find((t) => {
        const keywords = t.toLowerCase().split(/\s+/)
        return keywords.some((k) => sentence.toLowerCase().includes(k))
      }) ?? topics[0]
    const existing = topicMap.get(assigned) ?? []
    existing.push(sentence)
    topicMap.set(assigned, existing)
  }

  const questions: LocalQuestion[] = []
  const usedPhrases = new Set<string>()
  const questionTypes: ("mcq" | "true_false")[] = ["mcq", "true_false", "mcq"]

  const topicList = [...topicMap.entries()]
  for (let round = 0; round < 3 && questions.length < questionCount; round++) {
    for (const [topic, topicSentences] of topicList) {
      if (questions.length >= questionCount) break
      const shuffled = shuffle(topicSentences)

      for (const sentence of shuffled) {
        if (questions.length >= questionCount) break

        const sentenceKey = sentence.slice(0, 40).toLowerCase()
        if (usedPhrases.has(sentenceKey)) continue

        const difficulty = classifyDifficulty(sentence)
        if (params.difficulty === "easy" && difficulty === "hard") continue
        if (params.difficulty === "hard" && difficulty === "easy") continue

        const qType = questionTypes[questions.length % questionTypes.length]
        const distractorsAll = coOccurringTerms(sentence, allText)

        if (qType === "true_false") {
          const tf = buildTrueFalse(sentence, allText)
          if (tf) {
            usedPhrases.add(sentenceKey)
            questions.push({
              topic,
              question_text: `True or False: "${tf.statement}"`,
              question_type: "true_false",
              options: [
                { label: "A", text: "True" },
                { label: "B", text: "False" },
              ],
              correct_answer: tf.isTrue ? "A" : "B",
              explanation: tf.isTrue
                ? `This is stated in the module content: "${sentence}"`
                : `This is false. The module states: "${sentence}"`,
              difficulty,
            })
          }
        } else {
          const definitionSubject = extractDefinitionSubject(sentence)
          if (definitionSubject && distractorsAll.length >= 3) {
            usedPhrases.add(sentenceKey)
            const correct = definitionSubject
            const distractors = shuffle(distractorsAll).slice(0, 3)
            const options = pickOptions(correct, distractors)
            const correctLabel = options.find((o) => o.text === correct)?.label ?? "A"
            questions.push({
              topic,
              question_text: `What is ${definitionSubject}?`,
              question_type: "mcq",
              options,
              correct_answer: correctLabel,
              explanation: `The module defines this as: "${sentence}"`,
              difficulty,
            })
          } else {
            const words = sentence.match(/\b[A-Z][a-zA-Z]{4,}\b/g) ?? []
            const validWords = words.filter(
              (w) => !usedPhrases.has(w.toLowerCase()) && w.length >= 5
            )
            if (validWords.length > 0 && distractorsAll.length >= 2) {
              const chosen = validWords[0]
              usedPhrases.add(chosen.toLowerCase())
              usedPhrases.add(sentenceKey)
              const correct = chosen
              const distractors = shuffle(distractorsAll).filter(
                (d) => d.toLowerCase() !== chosen.toLowerCase()
              ).slice(0, 3)
              const options = pickOptions(correct, distractors)
              const correctLabel = options.find((o) => o.text === correct)?.label ?? "A"
              questions.push({
                topic,
                question_text: `Which term best fits this description: "${sentence}"`,
                question_type: "mcq",
                options,
                correct_answer: correctLabel,
                explanation: `The correct term is "${chosen}". Context: "${sentence}"`,
                difficulty,
              })
            }
          }
        }
      }
    }
  }

  if (questions.length === 0) {
    const s = shuffle(sentences)[0]
    questions.push({
      topic: topicFocus[0] ?? "general",
      question_text: `Is the following statement true or false? "${s}"`,
      question_type: "true_false",
      options: [
        { label: "A", text: "True" },
        { label: "B", text: "False" },
      ],
      correct_answer: "A",
      explanation: `This is directly from the module content: "${s}"`,
      difficulty: "medium",
    })
  }

  return {
    title: `Quiz: ${title}`,
    topic_focus: topicFocus,
    questions,
  }
}
