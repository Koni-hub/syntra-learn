"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Shuffle, Sparkles, ThumbsUp, Meh, Frown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { generateFlashcards, type FlashCard } from "@/lib/flashcard-generator"
import { calculateSM2 } from "@/lib/spaced-repetition/sm2"
import type { ReviewQuality } from "@/lib/spaced-repetition/types"

interface ModuleFlashcardProps {
  moduleId: string
}

interface ScheduledCard extends FlashCard {
  easiness: number
  interval: number
  repetitions: number
  dueAt: Date
}

const QUALITY_OPTIONS: { quality: ReviewQuality; label: string; icon: React.ReactNode; color: string }[] = [
  { quality: 1, label: "Forgot", icon: <Frown size={14} />, color: "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950" },
  { quality: 2, label: "Hard", icon: <Meh size={14} />, color: "text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950" },
  { quality: 4, label: "Good", icon: <ThumbsUp size={14} />, color: "text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950" },
]

export function ModuleFlashcard({ moduleId }: ModuleFlashcardProps) {
  const [cards, setCards] = useState<ScheduledCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"ai" | "local">("ai")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: mod } = await supabase
        .from("modules")
        .select("raw_text")
        .eq("id", moduleId)
        .single()

      if (!mod?.raw_text) { setLoading(false); return }

      let newCards: FlashCard[] = []

      try {
        const res = await fetch("/api/flashcard/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId, count: 20 }),
        })
        const data = await res.json()
        if (res.ok && data.flashcards?.length > 0) {
          newCards = data.flashcards.map((c: { question: string; answer: string; term?: string }, i: number) => ({
            id: i,
            question: c.question,
            answer: c.answer,
            term: c.term,
          }))
          setMode("ai")
        }
        if (data.error) toast.error(data.error, { id: "flashcard-ai" })
      } catch { /* fall through */ }

      if (newCards.length === 0) {
        newCards = generateFlashcards(mod.raw_text, 20)
        if (newCards.length > 0) {
          toast.info("Using local flashcards (AI unavailable)", { id: "flashcard-local", duration: 4000 })
          setMode("local")
        }
      }

      try {
        const res = await fetch(`/api/flashcard/schedule?moduleId=${moduleId}`)
        const data = await res.json()
        const scheduleMap = new Map<string, { easiness: number; interval: number; repetitions: number; due_at: string }>()
        if (data.flashcards) {
          for (const s of data.flashcards) {
            scheduleMap.set(s.term ?? s.question, s)
          }
        }
        const scheduled = newCards.map((c) => {
          const existing = scheduleMap.get(c.term ?? c.question)
          return {
            ...c,
            easiness: existing ? Number(existing.easiness) : 2.5,
            interval: existing ? existing.interval : 0,
            repetitions: existing ? existing.repetitions : 0,
            dueAt: existing ? new Date(existing.due_at) : new Date(),
          }
        })
        setCards(scheduled)
      } catch {
        setCards(newCards.map((c) => ({ ...c, easiness: 2.5, interval: 0, repetitions: 0, dueAt: new Date() })))
      }

      setLoading(false)
    }
    load()
  }, [moduleId])

  const current = cards[index]
  const total = cards.length

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
          moduleId,
          term: current.term ?? current.question,
          question: current.question,
          answer: current.answer,
          easiness: next.easiness,
          interval: next.interval,
          repetitions: next.repetitions,
          dueAt: next.dueAt.toISOString(),
        }),
      })
    } catch { /* best-effort */ }

    setFlipped(false)
    const label = ["Forgot", "Forgot", "Hard", "Hard", "Good"][quality]
    toast.success(`Marked as "${label}"`, { duration: 2000 })
    if (index < total - 1) {
      setIndex((i) => i + 1)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading flashcards...</div>
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        No content to create flashcards from.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={shuffleCards}>
          <Shuffle size={14} />
          Shuffle
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            mode === "ai" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-muted text-muted-foreground"
          )}>
            {mode === "ai" ? <Sparkles size={10} /> : null}
            {mode === "ai" ? "AI" : "Local"}
          </span>
          <span>{index + 1} / {total}</span>
        </div>
      </div>

      <div className="relative" style={{ minHeight: 300 }}>
        <div
          className="absolute inset-0 cursor-pointer select-none"
          onClick={() => !flipped && setFlipped(true)}
          style={{ perspective: "1000px" }}
        >
          <div
            className="h-full w-full rounded-xl border bg-card p-6 sm:p-10 transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateX(180deg)" : "rotateX(0deg)",
            }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-10"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Question</p>
              <p className="text-center text-base leading-relaxed whitespace-pre-wrap">{current.question}</p>
              <p className="mt-8 text-xs text-muted-foreground">Click to reveal answer</p>
            </div>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-10"
              style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
            >
              <p className="mb-4 text-xs font-medium text-green-600 uppercase tracking-wider">Answer</p>
              <p className="text-center text-base leading-relaxed whitespace-pre-wrap">{current.answer}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Next review: {current.dueAt <= new Date() ? "due now" : current.dueAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex h-2 w-full max-w-xs gap-1">
          {cards.slice(0, Math.min(total, 20)).map((_, i) => (
            <div
              key={i}
              className="h-full flex-1 rounded-full transition-colors"
              style={{
                backgroundColor: i <= index && cards[i]
                  ? i === index
                    ? "hsl(var(--primary))"
                    : "hsl(var(--primary) / 0.4)"
                  : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={index === 0}>
            <ChevronLeft size={16} />
            Previous
          </Button>
          {!flipped ? (
            <Button variant="outline" size="sm" onClick={() => setFlipped(true)}>
              Flip
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
                </Button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={goNext} disabled={index === total - 1}>
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
