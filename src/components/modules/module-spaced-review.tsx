"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, RotateCw, Frown, Meh, ThumbsUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { calculateSM2 } from "@/lib/sm2"
import type { ReviewQuality } from "@/lib/sm2"

interface ModuleSpacedReviewProps {
  moduleId: string
}

interface ReviewCard {
  id: string
  term: string
  question: string
  answer: string
  easiness: number
  interval: number
  repetitions: number
  dueAt: Date
}

const QUALITY_OPTIONS: { quality: ReviewQuality; label: string; icon: React.ReactNode; color: string }[] = [
  { quality: 1, label: "Forgot", icon: <Frown size={14} />, color: "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950" },
  { quality: 2, label: "Hard", icon: <Meh size={14} />, color: "text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950" },
  { quality: 4, label: "Good", icon: <ThumbsUp size={14} />, color: "text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950" },
  { quality: 5, label: "Easy", icon: <ThumbsUp size={14} />, color: "text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950" },
]

export function ModuleSpacedReview({ moduleId }: ModuleSpacedReviewProps) {
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/flashcard/schedule?moduleId=${moduleId}`)
        const data = await res.json()
        const due = (data.flashcards ?? []).filter(
          (c: { due_at: string }) => new Date(c.due_at) <= new Date()
        )
        if (due.length === 0) {
          const genRes = await fetch("/api/flashcard/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ moduleId, count: 10 }),
          })
          const genData = await genRes.json()
          if (genRes.ok && genData.flashcards?.length > 0) {
            const newCards = genData.flashcards.map((c: { term?: string; question: string; answer: string }) => ({
              id: c.term ?? c.question,
              term: c.term ?? "",
              question: c.question,
              answer: c.answer,
              easiness: 2.5,
              interval: 0,
              repetitions: 0,
              dueAt: new Date(),
            }))
            for (const nc of newCards) {
              await fetch("/api/flashcard/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  moduleId,
                  term: nc.term,
                  question: nc.question,
                  answer: nc.answer,
                  correct: false,
                }),
              })
            }
            setCards(newCards)
            setLoading(false)
            return
          }
        }
        setCards(
          due.map((c: { id: string; term: string; question: string; answer: string; easiness: number; interval: number; repetitions: number; due_at: string }) => ({
            id: c.id,
            term: c.term,
            question: c.question,
            answer: c.answer,
            easiness: Number(c.easiness),
            interval: c.interval,
            repetitions: c.repetitions,
            dueAt: new Date(c.due_at),
          }))
        )
      } catch { /* empty */ }
      setLoading(false)
    }
    load()
  }, [moduleId])

  const current = cards[index]
  const total = cards.length

  function goNext() { setFlipped(false); setIndex((i) => Math.min(total - 1, i + 1)) }
  function goPrev() { setFlipped(false); setIndex((i) => Math.max(0, i - 1)) }

  async function handleReview(quality: ReviewQuality) {
    if (!current) return
    const next = calculateSM2(quality, {
      easiness: current.easiness,
      interval: current.interval,
      repetitions: current.repetitions,
    })

    await fetch("/api/flashcard/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId,
        term: current.term,
        question: current.question,
        answer: current.answer,
        correct: quality >= 4,
      }),
    })

    setCards((prev) => prev.filter((_, i) => i !== index))
    setFlipped(false)
    const label = ["Forgot", "Forgot", "Hard", "Hard", "Good", "Easy"][quality]
    toast.success(`Reviewed as "${label}"`, { duration: 2000 })
    if (index >= cards.length - 1 && index > 0) {
      setIndex((i) => i - 1)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading review queue...</div>
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">No cards due for review. Great job!</p>
        <p className="text-xs text-muted-foreground">New cards will appear here once you review flashcards and they become due.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center text-xs text-muted-foreground">
        {total} card{total !== 1 ? "s" : ""} due for review
      </div>

      <div
        className="cursor-pointer select-none overflow-hidden rounded-xl border bg-card w-full"
        onClick={() => !flipped && setFlipped(true)}
      >
        <div
          className={cn(
            "relative transition-transform duration-500",
            flipped && "[transform:rotateX(180deg)]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[280px] max-h-[400px] overflow-y-auto"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Question</p>
            <p className="text-base leading-relaxed text-center whitespace-pre-wrap break-words">{current.question}</p>
            <p className="mt-6 text-xs text-muted-foreground">Tap to reveal</p>
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-10 min-h-[280px] max-h-[400px] overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <p className="mb-4 text-xs font-medium text-green-600 uppercase tracking-wider">Answer</p>
            <p className="text-base leading-relaxed text-center whitespace-pre-wrap break-words">{current.answer}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={index === 0}>
          <ChevronLeft size={16} />
        </Button>
        {!flipped ? (
          <Button variant="outline" size="sm" onClick={() => setFlipped(true)}>
            <RotateCw size={14} /> Flip
          </Button>
        ) : (
          <div className="flex gap-1">
            {QUALITY_OPTIONS.map((opt) => (
              <Button
                key={opt.quality}
                variant="outline"
                size="sm"
                onClick={() => handleReview(opt.quality)}
                className={cn("border-2 px-2", opt.color)}
                title={opt.label}
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={goNext} disabled={index === total - 1}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        {index + 1} / {total}
      </div>
    </div>
  )
}
