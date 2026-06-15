import Link from "next/link"
import { BrainCircuit, TrendingUp, BookOpen, Target } from "lucide-react"
import { ScoreCard } from "@/components/dashboard/score-card"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const [snapshotsRes, topicsRes, attemptsRes] = await Promise.all([
    supabase
      .from("analytics_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(1),
    supabase.from("topic_mastery").select("*").eq("user_id", userId),
    supabase
      .from("quiz_attempts")
      .select("*, quiz:quizzes(title)")
      .eq("user_id", userId)
      .order("attempted_at", { ascending: false })
      .limit(10),
  ])

  const latestSnapshot = snapshotsRes.data?.[0]
  const topics = topicsRes.data ?? []
  const recentAttempts = attemptsRes.data ?? []

  const understanding = latestSnapshot?.overall_understanding ?? 0
  const retention = latestSnapshot?.overall_retention ?? 0
  const quizzesTaken = latestSnapshot?.quizzes_taken ?? 0
  const topicsCovered = latestSnapshot?.topics_covered ?? 0

  const lowScoreTopics = topics
    .filter((t) => t.understanding_score < 60)
    .sort((a, b) => a.understanding_score - b.understanding_score)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here is your learning overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          title="Understanding Score"
          score={understanding}
          icon={<BrainCircuit size={20} />}
          trend={understanding >= 60 ? "up" : "down"}
        />
        <ScoreCard
          title="Retention Score"
          score={retention}
          icon={<TrendingUp size={20} />}
          trend={retention >= 60 ? "up" : "down"}
        />
        <ScoreCard
          title="Quizzes Taken"
          score={Math.min(quizzesTaken * 10, 100)}
          icon={<BookOpen size={20} />}
          trend="stable"
          subtitle={`${quizzesTaken} total`}
        />
        <ScoreCard
          title="Topics Covered"
          score={Math.min(topicsCovered * 10, 100)}
          icon={<Target size={20} />}
          trend="stable"
          subtitle={`${topicsCovered} topics`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          {recentAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <div>
                    <span className="font-medium">{attempt.quiz?.title ?? "Quiz"}</span>
                    <span className="ml-2 text-muted-foreground">
                      {new Date(attempt.attempted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={attempt.is_correct ? "text-green-600" : "text-red-600"}>
                    {attempt.is_correct ? "Correct" : "Incorrect"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Topics to Review</h2>
          {lowScoreTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">All topics are looking good!</p>
          ) : (
            <ul className="space-y-3">
              {lowScoreTopics.map((topic) => (
                <li key={topic.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span className="font-medium">{topic.topic}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-red-600">{topic.understanding_score}%</span>
                    <Link href="/quizzes/generate" className="text-xs text-primary hover:underline">
                      Practice
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {lowScoreTopics.length >= 3 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Try spaced repetition flashcards to improve retention on these topics.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
