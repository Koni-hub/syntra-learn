import { notFound, redirect } from "next/navigation"
import { ArrowLeft, BookOpen, FileText, FileCode, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { DeleteButton } from "@/components/modules/delete-button"
import { createClient } from "@/lib/supabase/server"
import { ModuleTabs } from "@/components/modules/module-tabs"
import { Breadcrumbs } from "@/components/modules/breadcrumbs"

const statusIcon: Record<string, React.ReactNode> = {
  processing: <Loader2 size={14} className="animate-spin text-amber-500" />,
  ready: <CheckCircle2 size={14} className="text-green-500" />,
  failed: <AlertCircle size={14} className="text-red-500" />,
}

const statusLabel: Record<string, string> = {
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
}

const typeIcon: Record<string, React.ReactNode> = {
  pdf: <FileText size={20} />,
  markdown: <FileCode size={20} />,
  text: <FileCode size={20} />,
}

async function deleteModule(moduleId: string) {
  "use server"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("module_chunks").delete().eq("module_id", moduleId)
  await supabase.from("modules").delete().eq("id", moduleId).eq("user_id", user.id)
  redirect("/modules")
}

export default async function ModuleDetailPage({ params }: {
  params: Promise<{ moduleId: string }>
}) {
  const { moduleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .eq("user_id", user.id)
    .single()

  if (!mod) return notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumbs items={[
          { label: "Modules", href: "/modules" },
          { label: mod.title },
        ]} />
        <DeleteButton action={deleteModule.bind(null, moduleId)} label="Module" />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              {typeIcon[mod.content_type] ?? <BookOpen size={20} />}
            </div>
            <div>
              <h1 className="text-xl font-bold line-clamp-1">{mod.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs">
                  {statusIcon[mod.status]}
                  <span>{statusLabel[mod.status]}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(mod.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {mod.description && (
          <p className="mt-4 text-sm text-muted-foreground">{mod.description}</p>
        )}

        {mod.topic_labels?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {mod.topic_labels.map((topic: string) => (
              <span key={topic} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <ModuleTabs
        moduleId={moduleId}
        rawPdf={mod.raw_pdf}
        rawText={mod.raw_text}
        title={mod.title}
      />
    </div>
  )
}

