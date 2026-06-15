"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sparkles, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function GenerateLocalQuizPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [modules, setModules] = useState<{ id: string; title: string }[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState(searchParams.get("moduleId") ?? "")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [numQuestions, setNumQuestions] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadModules() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("modules")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("status", "ready")
      if (data) setModules(data)
    }
    loadModules()
  }, [])

  async function handleGenerate() {
    if (!selectedModuleId) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/quiz/generate-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: selectedModuleId,
        difficulty,
        questionCount: numQuestions,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }))
      toast.error(err.error ?? "Failed to generate quiz")
      setError(err.error ?? "Failed to generate quiz")
      setLoading(false)
      return
    }

    const data = await res.json()
    toast.success("Quiz generated successfully!")
    router.push(`/quizzes/${data.quizId}`)
  }

  const difficulties = ["easy", "medium", "hard"] as const
  const questionCounts = [5, 10, 15, 20]

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generate Local Quiz</h1>
        <p className="text-muted-foreground">Quiz generated from module content — no AI needed.</p>
      </div>

      <div className="space-y-6 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Module</label>
          <select
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a module...</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <div className="flex gap-2">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  difficulty === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Questions</label>
          <div className="flex gap-2">
            {questionCounts.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumQuestions(n)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  numQuestions === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={loading || !selectedModuleId}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Quiz
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}