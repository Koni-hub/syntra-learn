"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Shuffle, Sparkles, ThumbsDown, ThumbsUp, Meh, Frown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { generateFlashcards, type FlashCard } from "@/lib/flashcard-generator"
import { calculateSM2 } from "@/lib/spaced-repetition/sm2"
import type { ReviewQuality } from "@/lib/spaced-repetition/types"

interface ScheduledCard extends FlashCard {
  easiness: number
  interval: number
  repetitions: number
  dueAt: Date
}

const QUALITY_OPTIONS: { quality: ReviewQuality; label: string; icon: React.ReactNode; color: string }[] = [
  { quality: 1, label: "Forgot", icon: <Frown size={16} />, color: "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950" },
  { quality: 2, label: "Hard", icon: <Meh size={16} />, color: "text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950" },
  { quality: 4, label: "Good", icon: <ThumbsUp size={16} />, color: "text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950" },
  { quality: 5, label: "Easy", icon: <ThumbsDown size={16} className="rotate-180" />, color: "text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950" },
]

export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const [cards, setCards] = useState<ScheduledCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"ai" | "local">("ai")
  const [showReview, setShowReview] = useState(false)

  const loadSchedules = useCallback(async (newCards: FlashCard[]) => {
    try {
      const res = await fetch(`/api/flashcard/schedule?moduleId=${params.moduleId}`)
      const data = await res.json()
      const scheduleMap = new Map<string, { easiness: number; interval: number; repetitions: number; due_at: string }>()
      if (data.flashcards) {
        for (const s of data.flashcards) {
          scheduleMap.set(s.term ?? s.question, s)
        }
      }
      return newCards.map((c) => {
        const existing = scheduleMap.get(c.term ?? c.question)
        return {
          ...c,
          easiness: existing ? Number(existing.easiness) : 2.5,
          interval: existing ? existing.interval : 0,
          repetitions: existing ? existing.repetitions : 0,
          dueAt: existing ? new Date(existing.due_at) : new Date(),
        }
      })
    } catch {
      return newCards.map((c) => ({
        ...c,
        easiness: 2.5,
        interval: 0,
        repetitions: 0,
        dueAt: new Date(),
      }))
    }
  }, [params.moduleId])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: mod } = await supabase
        .from("modules")
        .select("raw_text")
        .eq("id", params.moduleId)
        .single()

      if (!mod?.raw_text) { setLoading(false); return }

      try {
        const res = await fetch("/api/flashcard/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId: params.moduleId, count: 30 }),
        })
        const data = await res.json()
        if (res.ok && data.flashcards?.length > 0) {
          toast.success(`Generated ${data.flashcards.length} flashcards`, { id: "flashcard-load" })
          const mapped = data.flashcards.map((c: { question: string; answer: string; term?: string }, i: number) => ({
            id: i,
            question: c.question,
            answer: c.answer,
            term: c.term,
          }))
          const scheduled = await loadSchedules(mapped)
          setCards(scheduled)
          setMode("ai")
          setLoading(false)
          return
        }
      } catch { /* fall through to local */ }

      const localCards = generateFlashcards(mod.raw_text, 30)
      const scheduled = await loadSchedules(localCards)
      setCards(scheduled)
      setMode("local")
      setLoading(false)
      if (localCards.length > 0) {
        toast.info(`Using ${localCards.length} locally-generated flashcards`, { id: "flashcard-load", duration: 3000 })
      }
    }
    load()
  }, [params.moduleId, loadSchedules])

  const current = cards[index]
  const total = cards.length
  const dueCards = cards.filter((c) => new Date(c.dueAt) <= new Date())

  function goNext() { setFlipped(false); setIndex((i) => Math.min(total - 1, i + 1)) }
  function goPrev() { setFlipped(false); setIndex((i) => Math.max(0, i - 1)) }

  function shuffleCards() {
    setFlipped(false)
    setCards((prev) => {
      const a = [...prev]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    })
    setIndex(0)
  }

  function showDueOnly() {
    setFlipped(false)
    const due = cards.filter((c) => new Date(c.dueAt) <= new Date())
    if (due.length > 0) {
      setCards(due)
      setIndex(0)
    }
    setShowReview(true)
  }

  async function handleReview(quality: ReviewQuality) {
    if (!current) return

    const next = calculateSM2(quality, {
      easiness: current.easiness,
      interval: current.interval,
      repetitions: current.repetitions,
    })

    setCards((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, easiness: next.easiness, interval: next.interval, repetitions: next.repetitions, dueAt: next.dueAt }
          : c
      )
    )

    try {
      await fetch("/api/flashcard/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: params.moduleId,
          term: current.term ?? current.question,
          question: current.question,
          answer: current.answer,
          easiness: next.easiness,
          interval: next.interval,
          repetitions: next.repetitions,
          dueAt: next.dueAt.toISOString(),
        }),
      })
    } catch { /* best-effort persistence */ }

    setFlipped(false)
    const label = ["Forgot", "Forgot", "Hard", "Hard", "Good", "Easy"][quality]
    toast.success(`Marked as "${label}"`, { duration: 2000 })
    if (index < total - 1) {
      setIndex((i) => i + 1)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <p className="text-muted-foreground">No content to create flashcards from.</p>
        <Button variant="outline" onClick={() => router.push(`/modules/${params.moduleId}`)}>Back</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/modules/${params.moduleId}`)}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            mode === "ai" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-muted text-muted-foreground"
          )}>
            {mode === "ai" ? <Sparkles size={10} /> : null}
            {mode === "ai" ? "AI" : "Local"}
          </span>
          <Button variant="outline" size="sm" onClick={shuffleCards}>
            <Shuffle size={14} />
            Shuffle
          </Button>
          <Button variant="outline" size="sm" onClick={showDueOnly}>
            Review Due ({dueCards.length})
          </Button>
          <span className="text-sm text-muted-foreground">{index + 1} / {total}</span>
        </div>
      </div>

      {showReview && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-center text-xs text-muted-foreground">
          Review mode: showing {total} card{total !== 1 ? "s" : ""}
        </div>
      )}

      <div
        className="cursor-pointer select-none"
        onClick={() => !flipped && setFlipped(true)}
        style={{ perspective: "1000px", minHeight: "300px" }}
      >
        <div
          className={cn(
            "relative h-full min-h-[300px] transition-transform duration-500 rounded-xl border bg-card",
            flipped && "[transform:rotateX(180deg)]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Question</p>
            <p className="text-base leading-relaxed text-center whitespace-pre-wrap">{current.question}</p>
            <p className="mt-6 text-xs text-muted-foreground">Click to reveal answer</p>
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <p className="mb-4 text-xs font-medium text-green-600 uppercase tracking-wider">Answer</p>
            <p className="text-base leading-relaxed text-center whitespace-pre-wrap">{current.answer}</p>
            {showReview && (
              <p className="mt-4 text-xs text-muted-foreground">
                Next review: {current.dueAt <= new Date() ? "due now" : current.dueAt.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={goPrev} disabled={index === 0}>
          <ChevronLeft size={16} />
          Previous
        </Button>
        <Button variant="outline" onClick={() => setFlipped((f) => !f)}>
          <RotateCw size={16} />
          Flip
        </Button>
        {flipped && showReview && (
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <Button
                key={opt.quality}
                variant="outline"
                size="sm"
                onClick={() => handleReview(opt.quality)}
                className={cn("border-2", opt.color)}
                title={opt.label}
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={goNext} disabled={index === total - 1}>
          Next
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Card {index + 1} of {total}
      </div>
    </div>
  )
}
