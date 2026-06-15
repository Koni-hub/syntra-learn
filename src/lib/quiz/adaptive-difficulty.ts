export type QuestionDifficulty = "easy" | "medium" | "hard"

const DIFFICULTY_ORDER: QuestionDifficulty[] = ["easy", "medium", "hard"]

export interface AdaptiveState {
  consecutiveCorrect: number
  consecutiveWrong: number
  currentDifficulty: QuestionDifficulty
  topicPerformance: Record<string, { correct: number; total: number; difficulty: QuestionDifficulty }>
}

export function createAdaptiveState(initialDifficulty: QuestionDifficulty = "medium"): AdaptiveState {
  return {
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    currentDifficulty: initialDifficulty,
    topicPerformance: {},
  }
}

export function getDifficultyValue(d: QuestionDifficulty): number {
  return DIFFICULTY_ORDER.indexOf(d)
}

export function fromValue(v: number): QuestionDifficulty {
  const clamped = Math.max(0, Math.min(2, Math.round(v)))
  return DIFFICULTY_ORDER[clamped]
}

export function recordAnswer(
  state: AdaptiveState,
  isCorrect: boolean,
  topic: string
): AdaptiveState {
  const next = { ...state, consecutiveCorrect: 0, consecutiveWrong: 0, topicPerformance: { ...state.topicPerformance } }

  if (isCorrect) {
    next.consecutiveCorrect = state.consecutiveCorrect + 1
    next.consecutiveWrong = 0
  } else {
    next.consecutiveWrong = state.consecutiveWrong + 1
    next.consecutiveCorrect = 0
  }

  const tp = next.topicPerformance[topic] ?? { correct: 0, total: 0, difficulty: state.currentDifficulty }
  tp.correct += isCorrect ? 1 : 0
  tp.total += 1
  tp.difficulty = state.currentDifficulty
  next.topicPerformance[topic] = tp

  let diffOffset = getDifficultyValue(state.currentDifficulty)

  if (next.consecutiveCorrect >= 3) {
    diffOffset = Math.min(2, diffOffset + 1)
    next.consecutiveCorrect = 0
  } else if (next.consecutiveWrong >= 2) {
    diffOffset = Math.max(0, diffOffset - 1)
    next.consecutiveWrong = 0
  }

  next.currentDifficulty = fromValue(diffOffset)
  return next
}

export function suggestedDifficulty(topic: string, topicPerformance: AdaptiveState["topicPerformance"]): QuestionDifficulty {
  const tp = topicPerformance[topic]
  if (!tp || tp.total < 2) return "medium"
  const accuracy = tp.correct / tp.total
  if (accuracy > 0.8) return "hard"
  if (accuracy > 0.5) return "medium"
  return "easy"
}
