"use client"

import { useState, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, ThumbsUp, Meh, Frown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { ReviewQuality } from "@/lib/sm2"

interface SwipeableCardProps {
  question: string
  answer: string
  flipped: boolean
  onFlip: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onReview?: (quality: ReviewQuality) => void
  children?: React.ReactNode
}

export function SwipeableCard({
  question, answer, flipped, onFlip, onSwipeLeft, onSwipeRight, onReview, children,
}: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isDragging.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (!isDragging.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isDragging.current = true
      setDragging(true)
    }

    if (isDragging.current) {
      e.preventDefault()
      setDragX(dx)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const threshold = 80
    if (dragX > threshold && onSwipeRight) {
      onSwipeRight()
      toast("Marked as Good", { duration: 1500 })
    } else if (dragX < -threshold && onSwipeLeft) {
      onSwipeLeft()
      toast("Marked as Forgot", { duration: 1500 })
    }
    setDragX(0)
    setDragging(false)
    isDragging.current = false
  }, [dragX, onSwipeLeft, onSwipeRight])

  const handleClick = useCallback(() => {
    if (!isDragging.current) {
      onFlip()
    }
  }, [onFlip])

  const swipeOpacity = Math.min(Math.abs(dragX) / 100, 1)
  const swipeRotation = dragX * 0.05
  const swipeColor = dragX > 0 ? "rgba(34, 197, 94, 0.15)" : dragX < 0 ? "rgba(239, 68, 68, 0.15)" : "transparent"

  return (
    <div className="relative touch-none" style={{ touchAction: "pan-y" }}>
      <div className="absolute inset-0 rounded-xl pointer-events-none z-10 flex items-center justify-center">
        {dragX > 40 && (
          <div className="rounded-full bg-green-500/20 p-4" style={{ opacity: swipeOpacity }}>
            <ThumbsUp size={32} className="text-green-600" />
          </div>
        )}
        {dragX < -40 && (
          <div className="rounded-full bg-red-500/20 p-4" style={{ opacity: swipeOpacity }}>
            <Frown size={32} className="text-red-600" />
          </div>
        )}
      </div>

      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className="cursor-pointer select-none overflow-hidden rounded-xl border bg-card w-full"
        style={{
          transform: dragging ? `translateX(${dragX}px) rotate(${swipeRotation}deg)` : undefined,
          transition: dragging ? "none" : "transform 0.3s ease",
          backgroundColor: swipeColor,
          perspective: "1000px",
        }}
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
            <p className="text-center text-base leading-relaxed whitespace-pre-wrap break-words">{question}</p>
            <p className="mt-6 text-xs text-muted-foreground">Tap to reveal answer</p>
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-10 min-h-[280px] max-h-[400px] overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <p className="mb-4 text-xs font-medium text-green-600 uppercase tracking-wider">Answer</p>
            <p className="text-center text-base leading-relaxed whitespace-pre-wrap break-words">{answer}</p>
          </div>
        </div>
      </div>

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-6 text-[10px] text-muted-foreground sm:hidden">
        <span className="flex items-center gap-1">
          <ChevronLeft size={10} /> Swipe left = Forgot
        </span>
        <span className="flex items-center gap-1">
          Swipe right = Good <ChevronRight size={10} />
        </span>
      </div>
    </div>
  )
}
