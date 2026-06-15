export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5

export interface FlashcardSchedule {
  id: string
  userId: string
  moduleId: string
  term: string
  question: string
  answer: string
  easiness: number
  interval: number
  repetitions: number
  dueAt: Date
}

export interface ReviewOutcome {
  quality: ReviewQuality
  previous: Pick<FlashcardSchedule, "easiness" | "interval" | "repetitions">
  next: Pick<FlashcardSchedule, "easiness" | "interval" | "repetitions" | "dueAt">
}

export const QUALITY_LABELS: Record<ReviewQuality, string> = {
  0: "Forgot",
  1: "Forgot",
  2: "Hard",
  3: "Hard",
  4: "Good",
  5: "Easy",
}
