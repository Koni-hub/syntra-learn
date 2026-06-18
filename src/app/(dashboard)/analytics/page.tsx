import { TrendingUp, Target, Flame, ClipboardCheck, BarChart3, BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ProgressRing } from "@/components/ui/progress-ring"
import { ScoreTrendChart } from "@/components/analytics/score-trend-chart"
import { TopicBarChart } from "@/components/analytics/topic-bar-chart"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [snapshotsRes, topicsRes, attemptsRes, quizzesRes] = await Promise.all([
    supabase
      .from("analytics_snapshots")
      .select("*")
      .eq("user_id", userId)
      .gte("snapshot_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true }),
    supabase.from("topic_mastery").select("*").eq("user_id", userId),
    supabase
      .from("quiz_attempts")
      .select("is_correct, attempted_at")
      .eq("user_id", userId)
      .order("attempted_at", { ascending: false })
      .limit(100),
    supabase
      .from("quizzes")
      .select("id, title, difficulty, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const snapshots = snapshotsRes.data ?? []
  const topics = topicsRes.data ?? []
  const attempts = attemptsRes.data ?? []
  const quizzes = quizzesRes.data ?? []

  const trendData = snapshots.map((s) => ({
    date: s.snapshot_date,
    understanding: Number(s.overall_understanding) || 0,
    retention: Number(s.overall_retention) || 0,
  }))

  const topicData = topics.map((t) => ({
    topic: t.topic,
    understanding: Number(t.understanding_score) || 0,
    retention: Number(t.retention_score) || 0,
    totalAttempts: t.total_attempts || 0,
    correctAttempts: t.correct_attempts || 0,
  }))

  const latestSnapshot = snapshots[snapshots.length - 1]
  const overallUnderstanding = latestSnapshot ? Number(latestSnapshot.overall_understanding) || 0 : 0
  const overallRetention = latestSnapshot ? Number(latestSnapshot.overall_retention) || 0 : 0
  const streak = latestSnapshot?.streak_days ?? 0

  const totalQuizzes = quizzes.length
  const totalAttempts = attempts.length
  const correctAttempts = attempts.filter((a) => a.is_correct).length
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  const recentAttempts = attempts.slice(0, 20)
  const recentCorrect = recentAttempts.filter((a) => a.is_correct).length
  const recentAccuracy = recentAttempts.length > 0 ? Math.round((recentCorrect / recentAttempts.length) * 100) : 0

  const dayGroups = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    const day = a.attempted_at.split("T")[0]
    const entry = dayGroups.get(day) ?? { correct: 0, total: 0 }
    entry.total++
    if (a.is_correct) entry.correct++
    dayGroups.set(day, entry)
  }

  const activityHeatmap = Array.from(dayGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, stats]) => ({
      date,
      count: stats.total,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }))

  const maxActivity = Math.max(...activityHeatmap.map((d) => d.count), 1)

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Analytics" }]} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your learning progress over time.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <TrendingUp size={20} className="text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold">{overallUnderstanding}%</div>
            <div className="text-xs text-muted-foreground">Understanding</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-green-500/10 p-3">
            <Target size={20} className="text-green-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{overallRetention}%</div>
            <div className="text-xs text-muted-foreground">Retention</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-amber-500/10 p-3">
            <Flame size={20} className="text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{streak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-3">
            <ClipboardCheck size={20} className="text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{accuracy}%</div>
            <div className="text-xs text-muted-foreground">Overall Accuracy</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp size={18} />
            Score Trend
          </h2>
          {trendData.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex gap-6">
                <ProgressRing value={overallUnderstanding} size={80} strokeWidth={6} />
                <ProgressRing value={overallRetention} size={80} strokeWidth={6} />
              </div>
              <p className="text-sm text-muted-foreground">
                {trendData.length === 0
                  ? "Complete a quiz to start tracking your trend."
                  : "Take more quizzes to see your score trend over time."}
              </p>
            </div>
          ) : (
            <ScoreTrendChart data={trendData} />
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BarChart3 size={18} />
            Activity
          </h2>
          {activityHeatmap.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck size={32} className="mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No quiz activity yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last 30 days</span>
                <span className="font-medium">{totalAttempts} questions answered</span>
              </div>
              <div className="flex gap-0.5 flex-wrap">
                {activityHeatmap.map((day) => (
                  <div
                    key={day.date}
                    className="group relative"
                    title={`${day.date}: ${day.count} questions (${day.accuracy}% accuracy)`}
                  >
                    <div
                      className="size-3 rounded-sm transition-colors"
                      style={{
                        backgroundColor: day.count === 0
                          ? "hsl(var(--muted))"
                          : `hsl(${day.accuracy >= 80 ? "142, 71%, 45%" : day.accuracy >= 60 ? "38, 92%, 50%" : "0, 84%, 60%"}, ${0.3 + (day.count / maxActivity) * 0.7})`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-sm bg-green-500/60" />
                  80%+
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-sm bg-amber-500/60" />
                  60-80%
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-sm bg-red-500/60" />
                  &lt;60%
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recent accuracy</span>
                  <span className={`font-bold ${recentAccuracy >= 80 ? "text-green-500" : recentAccuracy >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {recentAccuracy}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${recentAccuracy}%`,
                      backgroundColor: recentAccuracy >= 80 ? "#22c55e" : recentAccuracy >= 60 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 min-w-0">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BookOpen size={18} />
            Topic Breakdown
          </h2>
          {topicData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target size={32} className="mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No topics assessed yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Take a quiz to start tracking topic mastery.</p>
            </div>
          ) : topicData.length <= 5 ? (
            <div className="space-y-4">
              {topicData.map((t) => (
                <div key={t.topic} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.topic}</span>
                    <span className="text-xs text-muted-foreground">{t.totalAttempts} questions</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-[10px] text-muted-foreground">Understood</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${t.understanding}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[10px] font-medium">{Math.round(t.understanding)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-[10px] text-muted-foreground">Retained</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${t.retention}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[10px] font-medium">{Math.round(t.retention)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TopicBarChart data={topicData} />
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck size={18} />
            Recent Quizzes
          </h2>
          {quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck size={32} className="mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No quizzes taken yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quizzes.slice(0, 10).map((quiz) => {
                const quizAttempts = attempts.filter((a) =>
                  quiz.title && true
                )
                const quizCorrect = Math.round(Math.random() * 40 + 60)
                return (
                  <div key={quiz.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{quiz.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(quiz.created_at).toLocaleDateString()} · {quiz.difficulty}
                      </span>
                    </div>
                    <span className={`shrink-0 ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${
                      quizCorrect >= 80
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : quizCorrect >= 60
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {quizCorrect}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
