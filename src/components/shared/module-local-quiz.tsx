"use client"

import { useState, useCallback, useRef } from "react"
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createAdaptiveState, recordAnswer, type AdaptiveState } from "@/lib/quiz/adaptive-difficulty"

interface Option {
  label: string
  text: string
}

interface Question {
  topic?: string
  question_text: string
  question_type: "mcq" | "true_false"
  options: Option[] | null
  correct_answer: string
  explanation: string
}

type QuizState = "idle" | "loading" | "ready" | "finished"

interface ModuleLocalQuizProps {
  moduleId: string
}

export function ModuleLocalQuiz({ moduleId }: ModuleLocalQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>("idle")
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const adaptiveRef = useRef<AdaptiveState>(createAdaptiveState("medium"))

  const handleGenerate = useCallback(async () => {
    setQuizState("loading")
    toast.info("Generating quiz from module content...", { id: "local-quiz-gen" })
    try {
      const res = await fetch("/api/quiz/generate-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, questionCount: 5, difficulty: "medium" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed")

      setQuestions(data.questions)
      setQuizState("ready")
      setIndex(0)
      setAnswers({})
      setShowResults(false)
      toast.success("Quiz ready!", { id: "local-quiz-gen" })
    } catch {
      toast.error("Failed to generate quiz", { id: "local-quiz-gen" })
      setQuizState("idle")
    }
  }, [moduleId])

  function handleAnswer(label: string) {
    setAnswers((prev) => {
      const wasUnanswered = prev[index] === undefined
      const newAnswers = { ...prev, [index]: label }
      if (wasUnanswered) {
        const q = questions[index]
        const isCorrect = label === q.correct_answer
        const topic = q.topic ?? "general"
        adaptiveRef.current = recordAnswer(adaptiveRef.current, isCorrect, topic)
      }
      return newAnswers
    })
  }

  function handleSubmit() {
    setShowResults(true)
    setQuizState("finished")
    const total = questions.length
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length
    const pct = Math.round((correct / total) * 100)
    toast.success(`Quiz complete! ${correct}/${total} correct (${pct}%)`)
  }

  function handleReset() {
    setQuizState("idle")
    setQuestions([])
    setAnswers({})
    setShowResults(false)
  }

  if (quizState === "loading") {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 size={24} className="animate-spin mr-2" />
        Generating quiz from module content...
      </div>
    )
  }

  if (quizState === "idle") {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Generate a quiz by scanning the content of this module.
        </p>
        <Button onClick={handleGenerate}>Generate Quiz</Button>
      </div>
    )
  }

  if (quizState === "finished" && showResults) {
    const total = questions.length
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length
    const percentage = Math.round((correct / total) * 100)

    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Quiz Complete!</h2>
        <div className="text-4xl font-bold text-primary">{percentage}%</div>
        <p className="text-muted-foreground">{correct} / {total} correct</p>

        <div className="space-y-3 text-left">
          {questions.map((q, i) => {
            const userAnswer = answers[i]
            const isCorrect = userAnswer === q.correct_answer
            return (
              <div key={i} className={cn(
                "rounded-lg border p-3 text-sm",
                isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              )}>
                <div className="flex items-start gap-2">
                  {isCorrect ? <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600" /> : <XCircle size={16} className="shrink-0 mt-0.5 text-red-600" />}
                  <div>
                    <p className="font-medium">{q.question_text}</p>
                    <p className="text-muted-foreground mt-1">Your answer: {q.options?.find((o) => o.label === userAnswer)?.text ?? userAnswer}</p>
                    <p className="text-muted-foreground">Correct answer: {q.options?.find((o) => o.label === q.correct_answer)?.text ?? q.correct_answer}</p>
                    <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Button variant="outline" onClick={handleReset}>
          <RotateCcw size={16} />
          Generate New Quiz
        </Button>
      </div>
    )
  }

  const current = questions[index]
  const total = questions.length
  const answeredCount = Object.keys(answers).length

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Question {index + 1} of {total}</span>
        <span className="text-xs text-muted-foreground">{answeredCount} answered</span>
      </div>

      <div className="flex gap-1">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              i === index ? "bg-primary" : answers[i] ? "bg-primary/50" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div>
        <p className="text-base font-medium">{current.question_text}</p>
        <div className="mt-4 space-y-2">
          {current.options?.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleAnswer(opt.label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                answers[index] === opt.label
                  ? "border-primary bg-primary/5"
                  : "bg-background hover:bg-accent"
              )}
            >
              <span className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                answers[index] === opt.label
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {opt.label}
              </span>
              <span>{opt.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft size={14} /> Previous
        </Button>

        {index === total - 1 ? (
          <Button size="sm" onClick={handleSubmit} disabled={answeredCount < total}>
            Submit
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
            Next <ChevronRight size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}
