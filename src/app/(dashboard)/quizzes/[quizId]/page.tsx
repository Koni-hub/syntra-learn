"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Clock, Flag, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { createAdaptiveState, recordAnswer, type AdaptiveState } from "@/lib/quiz/adaptive-difficulty"

interface QuestionData {
  id: string
  topic?: string
  question_text: string
  question_type: "mcq" | "true_false" | "short_answer"
  options: { label: string; text: string }[] | null
  correct_answer: string
  order_index: number
}

interface QuizData {
  id: string
  title: string
  time_limit_seconds: number | null
  questions: QuestionData[]
}

export default function QuizPage() {
  const router = useRouter()
  const params = useParams()
  const submittedRef = useRef(false)
  const answersRef = useRef<Record<string, string>>({})

  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const adaptRef = useRef<AdaptiveState>(createAdaptiveState("medium"))

  useEffect(() => {
    async function loadQuiz() {
      const supabase = createClient()
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id, title, time_limit_seconds")
        .eq("id", params.quizId)
        .single()

      if (!quizData) return

      const { data: questions } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", params.quizId)
        .order("order_index", { ascending: true })

      setQuiz({ ...quizData, questions: questions ?? [] })
      setLoading(false)

      if (quizData.time_limit_seconds) {
        setTimeLeft(quizData.time_limit_seconds)
      }
    }
    loadQuiz()
  }, [params.quizId])

  // Keep answersRef in sync for timer auto-submit
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submittedRef.current) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          setTimeout(() => handleSubmit(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)

    const formatted = Object.entries(answersRef.current).map(([questionId, givenAnswer]) => ({
      questionId,
      givenAnswer,
    }))

    toast.info("Submitting your answers...", { id: "quiz-submit" })

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: params.quizId, answers: formatted }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        console.error("Submit failed:", err.error)
      }
    } catch (e) {
      console.error("Submit error:", e)
    }

    toast.success("Quiz submitted!", { id: "quiz-submit" })
    router.push(`/quizzes/${params.quizId}/results`)
  }, [params.quizId, router])

  if (loading || !quiz) {
    return (
      <div className="flex items-center justify-center py-20">
        <Clock size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const questions = quiz.questions
  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === totalQuestions

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function handleAnswer(value: string) {
    setAnswers((prev) => {
      const wasUnanswered = prev[currentQuestion.id] === undefined
      const newAnswers = { ...prev, [currentQuestion.id]: value }
      if (wasUnanswered && currentQuestion) {
        const isCorrect = value === currentQuestion.correct_answer
        const topic = currentQuestion.topic ?? "general"
        adaptRef.current = recordAnswer(adaptRef.current, isCorrect, topic)
      }
      return newAnswers
    })
  }

  async function deleteQuiz() {
    if (!confirm("Delete this quiz?")) return
    const supabase = createClient()
    await supabase.from("quiz_attempts").delete().eq("quiz_id", params.quizId)
    await supabase.from("questions").delete().eq("quiz_id", params.quizId)
    await supabase.from("quizzes").delete().eq("id", params.quizId)
    toast.success("Quiz deleted")
    router.push("/quizzes")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{quiz.title}</h1>
        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Clock size={16} />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={deleteQuiz} title="Delete quiz">
            <Trash2 size={16} className="text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {questions.map((q, i) => {
            const isAnswered = answers[q.id] !== undefined
            const isCurrent = i === currentIndex
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isCurrent && "ring-2 ring-primary ring-offset-2",
                  isAnswered
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {answeredCount} of {totalQuestions} answered
        </span>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Question {currentIndex + 1} of {totalQuestions}
        </p>
        <p className="text-lg font-medium">{currentQuestion.question_text}</p>

        <div className="mt-6 space-y-2">
          {currentQuestion.question_type === "true_false" ? (
            <div className="flex gap-3">
              {["True", "False"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleAnswer(opt)}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    answers[currentQuestion.id] === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            currentQuestion.options?.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleAnswer(opt.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  answers[currentQuestion.id] === opt.label
                    ? "border-primary bg-primary/5"
                    : "bg-background hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    answers[currentQuestion.id] === opt.label
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {opt.label}
                </span>
                <span>{opt.text}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={16} />
          Previous
        </Button>

        {currentIndex === totalQuestions - 1 ? (
          <Button onClick={handleSubmit} disabled={submitted}>
            <Flag size={16} />
            {allAnswered ? "Submit Quiz" : `Submit (${totalQuestions - answeredCount} unanswered)`}
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}>
            Next
            <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  )
}
