import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50)

  const [modulesRes, quizzesRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, description, category, topic_labels, content_type, created_at")
      .eq("user_id", user.id)
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(Math.ceil(limit / 2)),
    supabase
      .from("quizzes")
      .select("id, title, difficulty, topic_focus, created_at, module:modules(id, title)")
      .eq("user_id", user.id)
      .or(`title.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(Math.ceil(limit / 2)),
  ])

  const results: { id: string; title: string; type: string; subtitle: string; href: string; metadata?: Record<string, string> }[] = []

  for (const m of modulesRes.data ?? []) {
    results.push({
      id: m.id,
      title: m.title,
      type: "module",
      subtitle: m.description ?? m.category ?? "Module",
      href: `/modules/${m.id}`,
      metadata: { content_type: m.content_type, category: m.category ?? "" },
    })
  }

  for (const q of quizzesRes.data ?? []) {
    results.push({
      id: q.id,
      title: q.title,
      type: "quiz",
      subtitle: `${q.difficulty} quiz`,
      href: `/quizzes/${q.id}`,
      metadata: { difficulty: q.difficulty, module_title: (Array.isArray(q.module) ? q.module[0] : q.module as { title: string } | null)?.title ?? "" },
    })
  }

  results.sort((a, b) => {
    const aExact = a.title.toLowerCase().includes(q.toLowerCase())
    const bExact = b.title.toLowerCase().includes(q.toLowerCase())
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    return 0
  })

  return NextResponse.json({ results: results.slice(0, limit) })
}
