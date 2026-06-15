"use client"

import { useState } from "react"
import { PdfViewer } from "./pdf-viewer"
import { ModuleChat } from "./module-chat"
import { ModuleLocalQuiz } from "./module-local-quiz"
import { ModuleAiQuiz } from "./module-ai-quiz"
import { ModuleFlashcard } from "./module-flashcard"
import { ModuleSpacedReview } from "./module-spaced-review"

interface ModuleTabsProps {
  moduleId: string
  rawPdf: string | null
  title: string
}

type Tab = "handout" | "local-quiz" | "ai-quiz" | "flashcard" | "spaced-review"

export function ModuleTabs({ moduleId, rawPdf, title }: ModuleTabsProps) {
  const [tab, setTab] = useState<Tab>("handout")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {(["handout", "local-quiz", "ai-quiz", "flashcard", "spaced-review"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "handout" ? "Handout & Chat" : t === "local-quiz" ? "Local Quiz" : t === "ai-quiz" ? "AI Quiz" : t === "flashcard" ? "Flashcard" : "Spaced Review"}
          </button>
        ))}
      </div>

      {tab === "handout" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 h-[calc(100vh-300px)]">
          {rawPdf ? (
            <PdfViewer dataUrl={rawPdf} title={title} />
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
              No PDF preview available for this module.
            </div>
          )}
          <ModuleChat moduleId={moduleId} />
        </div>
      )}

      {tab === "local-quiz" && (
        <div className="max-w-2xl mx-auto">
          <ModuleLocalQuiz moduleId={moduleId} />
        </div>
      )}

      {tab === "ai-quiz" && (
        <div className="max-w-2xl mx-auto">
          <ModuleAiQuiz moduleId={moduleId} />
        </div>
      )}

      {tab === "flashcard" && (
        <div className="max-w-2xl mx-auto">
          <ModuleFlashcard moduleId={moduleId} />
        </div>
      )}

      {tab === "spaced-review" && (
        <div className="max-w-2xl mx-auto">
          <ModuleSpacedReview moduleId={moduleId} />
        </div>
      )}
    </div>
  )
}
