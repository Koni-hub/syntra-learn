import { ChartNoAxesCombined, TrendingUp, Target } from "lucide-react"
import { ScoreTrendChart } from "@/components/analytics/score-trend-chart"
import { TopicRadarChart } from "@/components/analytics/topic-radar-chart"
import { createClient } from "@/lib/supabase/server"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [snapshotsRes, topicsRes] = await Promise.all([
    supabase
      .from("analytics_snapshots")
      .select("*")
      .eq("user_id", userId)
      .gte("snapshot_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true }),
    supabase.from("topic_mastery").select("*").eq("user_id", userId),
  ])

  const trendData = (snapshotsRes.data ?? []).map((s) => ({
    date: s.snapshot_date,
    understanding: s.overall_understanding,
    retention: s.overall_retention,
  }))

  const topicData = (topicsRes.data ?? []).map((t) => ({
    topic: t.topic,
    understanding: t.understanding_score,
    retention: t.retention_score,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your learning progress over time.</p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp size={18} />
          Score Trend (Last 30 Days)
        </h2>
        {trendData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No trend data available yet.</p>
        ) : (
          <ScoreTrendChart data={trendData} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 min-w-0">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ChartNoAxesCombined size={18} />
            Topic Mastery
          </h2>
          {topicData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No topic data available yet.</p>
          ) : (
            <TopicRadarChart data={topicData} />
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 min-w-0">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Target size={18} />
            Topics
          </h2>
          {topicData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No topics assessed yet.</p>
          ) : (
            <div className="space-y-3">
              {topicData.map((t) => (
                <div key={t.topic} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-medium">{t.topic}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">U: {t.understanding}%</span>
                    <span className="text-xs text-muted-foreground">R: {t.retention}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
