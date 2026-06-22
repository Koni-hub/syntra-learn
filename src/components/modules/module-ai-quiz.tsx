"use client"

import { useState, useCallback } from "react"
import { Sparkles, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createAdaptiveState, recordAnswer, type QuestionDifficulty, type AdaptiveState } from "@/lib/adaptive-difficulty"

interface Option {
  label: string
  text: string
}

interface Question {
  id?: string
  topic?: string
  question_text: string
  question_type: "mcq" | "true_false"
  options: Option[] | null
  correct_answer: string
  explanation: string
}

type QuizState = "config" | "loading" | "ready" | "submitting" | "finished" | "error"

interface ModuleAiQuizProps {
  moduleId: string
}

const modes = ["mixed", "mcq", "true_false"] as const
const counts = [5, 10, 15, 20]
const difficulties = ["easy", "medium", "hard"] as const

export function ModuleAiQuiz({ moduleId }: ModuleAiQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>("config")
  const [mode, setMode] = useState<"mixed" | "mcq" | "true_false">("mixed")
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("medium")
  const [quizId, setQuizId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>(createAdaptiveState("medium"))

  const handleGenerate = useCallback(async () => {
    setQuizState("loading")
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          questionCount: numQuestions,
          difficulty,
          quizMode: mode,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed")

      setQuizId(data.quizId)
      setQuestions(data.questions)
      setQuizState("ready")
      setIndex(0)
      setAnswers({})
      setShowResults(false)
      const modeLabel = mode === "mixed" ? "Mixed" : mode === "mcq" ? "MCQ" : mode === "true_false" ? "True/False" : "Short Answer"
      toast.success(`Generated ${numQuestions}-question ${modeLabel} quiz`, { id: "quiz-ai" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate quiz"
      toast.error(msg, { id: "quiz-ai" })
      setErrorMessage(msg)
      setQuizState("error")
    }
  }, [moduleId, mode, numQuestions, difficulty])

  async function handleSubmit() {
    if (!quizId) return
    setQuizState("submitting")
    setShowResults(true)

    const formatted = Object.entries(answers).map(([qIndex, givenAnswer]) => ({
      questionId: questions[Number(qIndex)].id ?? "",
      givenAnswer,
    }))

    try {
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers: formatted }),
      })
    } catch {
      // submission is best-effort for analytics
    }

    setQuizState("finished")
    const total = questions.length
    const answered = Object.keys(answers).length
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length
    const pct = Math.round((correct / total) * 100)
    toast.success(`Quiz complete! ${correct}/${total} correct (${pct}%)`)
  }

  function handleAnswer(label: string) {
    setAnswers((prev) => {
      if (prev[index] !== undefined) return prev
      return { ...prev, [index]: label }
    })

    const currentQ = questions[index]
    const isCorrect = label === currentQ.correct_answer
    const topic = currentQ.topic ?? "general"
    setAdaptiveState((prev) => recordAnswer(prev, isCorrect, topic))
  }

  function handleReset() {
    setQuizState("config")
    setQuizId(null)
    setQuestions([])
    setAnswers({})
    setShowResults(false)
  }

  if (quizState === "loading") {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 size={24} className="animate-spin mr-2" />
        Generating AI quiz...
      </div>
    )
  }

  if (quizState === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4 text-sm text-red-800 dark:text-red-200">
          {errorMessage}
        </div>
        <Button variant="outline" className="w-full" onClick={() => { setQuizState("config"); setErrorMessage("") }}>
          Try Again
        </Button>
      </div>
    )
  }

  if (quizState === "config") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Configure your quiz and let AI generate it from the module content.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Question Type</label>
          <div className="flex gap-2">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  mode === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                )}
              >
                {m === "mixed" ? "Mixed" : m === "mcq" ? "MCQ" : "True/False"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Questions</label>
          <div className="flex gap-2">
            {counts.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumQuestions(n)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  numQuestions === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <div className="flex gap-2">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  difficulty === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={handleGenerate}>
          <Sparkles size={16} />
          Generate with AI
        </Button>
      </div>
    )
  }

  if ((quizState === "finished" || quizState === "submitting") && showResults) {
    const total = questions.length
    const answeredCount = Object.keys(answers).length
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    if (quizState === "submitting") {
      return (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={24} className="animate-spin mr-2" />
          Scoring your quiz...
        </div>
      )
    }

    return (
      <div className="w-full rounded-xl border bg-card p-6 text-center space-y-4">
        <h2 className="text-xl font-bold">Quiz Complete!</h2>
        <div className="text-4xl font-bold text-primary">{percentage}%</div>
        <p className="text-muted-foreground">{correct} / {total} correct ({answeredCount} answered)</p>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            Current level: <strong className="capitalize text-foreground">{adaptiveState.currentDifficulty}</strong>
          </span>
          {Object.entries(adaptiveState.topicPerformance).length > 0 && (
            <span className="flex items-center gap-1">
              Topics tracked: <strong className="text-foreground">{Object.keys(adaptiveState.topicPerformance).length}</strong>
            </span>
          )}
        </div>

        <div className="space-y-3 text-left">
          {questions.map((q, i) => {
            const userAnswer = answers[i]
            const isCorrect = userAnswer === q.correct_answer
            return (
              <div key={i} className={cn(
                "rounded-lg border p-3 text-sm",
                isCorrect ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
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

  if (questions.length === 0) return null

  const current = questions[index]
  const total = questions.length
  const answeredCount = Object.keys(answers).length

  return (
    <div className="w-full rounded-xl border bg-card p-6 space-y-4">
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
          {current.question_type === "true_false" ? (
            <div className="flex gap-3">
              {["True", "False"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleAnswer(opt)}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    answers[index] === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            current.options?.map((opt) => (
              <button
                key={opt.label}
                type="button"
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
            ))
          )}
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

