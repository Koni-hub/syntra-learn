"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, CheckCircle2, Loader2, XCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type UploadStep = "idle" | "uploading" | "extracting" | "chunking" | "ready" | "failed"

const steps: { key: UploadStep; label: string }[] = [
  { key: "uploading", label: "Uploaded" },
  { key: "extracting", label: "Extracting" },
  { key: "chunking", label: "Chunking" },
  { key: "ready", label: "Ready" },
]

export default function ModuleUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState("")
  const [moduleId, setModuleId] = useState<string | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [failed, setFailed] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setFailed(false)
    setCurrentStepIndex(-1)
    setUploading(true)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("title", selectedFile.name.replace(/\.[^/.]+$/, ""))
    formData.append("category", category)

    setCurrentStepIndex(0)
    toast.info("Uploading module...", { id: "module-upload" })

    try {
      const res = await fetch("/api/modules/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const id: string = data.moduleId ?? data.module_id
      setModuleId(id)

      setCurrentStepIndex(1)
      toast.success("Uploaded! Extracting text...", { id: "module-upload" })

      const chunkRes = await fetch("/api/modules/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: id }),
      })
      if (!chunkRes.ok) throw new Error("Chunking failed")

      setCurrentStepIndex(2)

      const poll = async () => {
        const pollRes = await fetch(`/api/modules/${id}/status`)
        if (!pollRes.ok) { pollRef.current = setTimeout(poll, 1500); return }
        const pollData = await pollRes.json()
        if (pollData.status === "ready") {
          setCurrentStepIndex(steps.length)
          setUploading(false)
          toast.success("Module ready to use!", { id: "module-upload", duration: 4000 })
        } else if (pollData.status === "failed") {
          setFailed(true)
          setUploading(false)
          toast.error("Module processing failed", { id: "module-upload" })
        } else {
          pollRef.current = setTimeout(poll, 1500)
        }
      }
      poll()
    } catch {
      setFailed(true)
      setUploading(false)
      toast.error("Upload failed. Please try again.", { id: "module-upload" })
    }
  }, [category])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Module</h1>
        <p className="text-muted-foreground">Upload a PDF, TXT, or Markdown file.</p>
      </div>

      {currentStepIndex < 0 && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject / Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Mathematics, Science, History..."
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            <Upload size={40} className="mb-4 text-muted-foreground" />
            <p className="text-sm font-medium">Drop file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, TXT, MD up to 10MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        </>
      )}

      {file && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            {failed ? (
              <XCircle size={20} className="shrink-0 text-red-500" />
            ) : currentStepIndex >= steps.length ? (
              <CheckCircle2 size={20} className="shrink-0 text-green-500" />
            ) : (
              <Loader2 size={20} className="shrink-0 animate-spin text-amber-500" />
            )}
          </div>
        </div>
      )}

      {currentStepIndex >= 0 && (
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex
            const isDone = idx < currentStepIndex
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-sm",
                  isDone && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
                  isActive && !failed && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
                  failed && "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
                  !isActive && !isDone && !failed && "text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle2 size={16} className="shrink-0" />
                ) : isActive && !failed ? (
                  <Loader2 size={16} className="shrink-0 animate-spin" />
                ) : failed && idx >= currentStepIndex ? (
                  <XCircle size={16} className="shrink-0" />
                ) : (
                  <div className="size-4 shrink-0 rounded-full border-2 border-current" />
                )}
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {currentStepIndex >= steps.length && moduleId && (
        <div className="flex justify-center gap-3">
          <Button onClick={() => router.push("/modules")}>
            View All Modules
            <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {failed && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => { setFile(null); setCurrentStepIndex(-1); setFailed(false); setUploading(false) }}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
