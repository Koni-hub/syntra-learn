"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Shuffle, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { generateFlashcards, type FlashCard } from "@/lib/flashcard-generator"

export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const [cards, setCards] = useState<FlashCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [knownCount, setKnownCount] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: mod } = await supabase
        .from("modules")
        .select("raw_text")
        .eq("id", params.moduleId)
        .single()

      if (mod?.raw_text) {
        setCards(generateFlashcards(mod.raw_text, 30))
      }
      setLoading(false)
    }
    load()
  }, [params.moduleId])

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
    setKnownCount(0)
  }

  function markKnown() {
    setKnownCount((c) => c + 1)
    goNext()
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
          <Button variant="outline" size="sm" onClick={shuffleCards}>
            <Shuffle size={14} />
            Shuffle
          </Button>
          <span className="text-sm text-muted-foreground">{index + 1} / {total}</span>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Known: {knownCount} / {total}
      </div>

      <div
        className="cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
        style={{ perspective: "1000px", minHeight: "300px" }}
      >
        <div
          className={cn(
            "relative h-full min-h-[300px] transition-transform duration-500 rounded-xl border bg-card",
            flipped && "[transform:rotateX(180deg)]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Question</p>
            <p className="text-base leading-relaxed text-center whitespace-pre-wrap">{current.question}</p>
            <p className="mt-6 text-xs text-muted-foreground">Click to reveal answer</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <p className="mb-4 text-xs font-medium text-green-600 uppercase tracking-wider">Answer</p>
            <p className="text-base leading-relaxed text-center whitespace-pre-wrap">{current.answer}</p>
            <p className="mt-6 text-xs text-muted-foreground">Click to flip back</p>
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
        {flipped && (
          <Button variant="default" onClick={markKnown} disabled={index === total - 1}>
            <ThumbsUp size={16} />
            Got it
          </Button>
        )}
        <Button variant="outline" onClick={goNext} disabled={index === total - 1}>
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
