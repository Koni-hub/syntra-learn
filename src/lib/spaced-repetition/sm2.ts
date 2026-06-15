import type { ReviewQuality, ReviewOutcome } from "./types"

const MIN_EASINESS = 1.3

export function calculateSM2(
  quality: ReviewQuality,
  previous: { easiness: number; interval: number; repetitions: number }
): ReviewOutcome["next"] {
  let { easiness, interval, repetitions } = previous

  if (quality < 3) {
    repetitions = 0
    interval = 0
  } else {
    easiness = Math.max(MIN_EASINESS, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easiness)
    }

    repetitions += 1
  }

  const dueAt = new Date()
  if (interval > 0) {
    dueAt.setDate(dueAt.getDate() + interval)
  } else {
    dueAt.setMinutes(dueAt.getMinutes() + 10)
  }

  return {
    easiness: Math.round(easiness * 100) / 100,
    interval,
    repetitions,
    dueAt,
  }
}

export function computeReviewOutcome(
  quality: ReviewQuality,
  schedule: { easiness: number; interval: number; repetitions: number }
): ReviewOutcome {
  const next = calculateSM2(quality, schedule)
  return {
    quality,
    previous: { easiness: schedule.easiness, interval: schedule.interval, repetitions: schedule.repetitions },
    next,
  }
}
