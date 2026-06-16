import Link from "next/link"
import { BrainCircuit, ChevronRight, BarChart3, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/shared/score-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

const difficultyColor: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default async function QuizzesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("*, module:modules(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, is_correct")
    .eq("user_id", userId)

  const scoreMap: Record<string, { correct: number; total: number }> = {}
  for (const a of attempts ?? []) {
    if (!scoreMap[a.quiz_id]) scoreMap[a.quiz_id] = { correct: 0, total: 0 }
    scoreMap[a.quiz_id].total++
    if (a.is_correct) scoreMap[a.quiz_id].correct++
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">Take quizzes to test your understanding.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/quizzes/generate">
            <Button>
              <ClipboardCheck size={16} />
              AI Quiz
            </Button>
          </Link>
          <Link href="/quizzes/generate-local">
            <Button variant="secondary">
              <ClipboardCheck size={16} />
              Local Quiz
            </Button>
          </Link>
        </div>
      </div>

      {!quizzes || quizzes.length === 0 ? (
        <EmptyState
          icon={<BrainCircuit size={48} />}
          title="No quizzes yet"
          description="Upload a module and generate a quiz to get started."
          action={{ label: "Generate Quiz", href: "/quizzes/generate" }}
        />
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const attempt = scoreMap[quiz.id]
            const pct = attempt ? Math.round((attempt.correct / attempt.total) * 100) : null
            return (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="block">
                <div className="flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">{quiz.module?.title ?? "Unknown module"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium capitalize", difficultyColor[quiz.difficulty])}>
                        {quiz.difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </span>
                      {pct !== null && <ScoreBadge score={pct} size="sm" />}
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

