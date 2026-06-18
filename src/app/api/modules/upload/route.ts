import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractPdfContent } from "@/lib/pdf-extract"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [".pdf", ".txt", ".md"]
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF

function isPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  return bytes[0] === PDF_MAGIC[0] && bytes[1] === PDF_MAGIC[1] &&
    bytes[2] === PDF_MAGIC[2] && bytes[3] === PDF_MAGIC[3]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? "Unauthorized" }, { status: 401 })
    }

    await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: user.user_metadata?.display_name ?? user.email ?? "" }, { onConflict: "id" })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null
    const category = formData.get("category") as string | null
    if (!file || !title) {
      return NextResponse.json({ error: "file and title are required" }, { status: 400 })
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!ALLOWED_TYPES.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: ${ext}. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB` }, { status: 400 })
    }

    const isPdf = ext === ".pdf"

    let rawText = ""
    let rawPdf: string | null = null
    let structuredContent: Record<string, unknown> | null = null

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)

      if (!isPdfMagic(uint8)) {
        return NextResponse.json({ error: "File has .pdf extension but is not a valid PDF" }, { status: 400 })
      }

      rawPdf = `data:application/pdf;base64,${Buffer.from(uint8).toString("base64")}`

      try {
        const extracted = await extractPdfContent(uint8)
        rawText = extracted.text
        structuredContent = {
          tables: extracted.tables,
          sections: extracted.sections,
          pageCount: extracted.pageCount,
          hasImages: extracted.hasImages,
          source: extracted.source,
        }
      } catch (e) {
        const msg = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack?.slice(0, 500)}` : String(e)
        console.error("PDF extraction failed:", msg)
        rawText = `[PDF extraction failed: ${msg.slice(0, 200)}]`
      }
    } else {
      rawText = await file.text()
    }

    async function insertModule(insert: Record<string, unknown>) {
      const { data, error } = await supabase
        .from("modules")
        .insert({ category: category || null, ...insert })
        .select("id")
        .single()

      if (error?.message?.includes("category")) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("modules")
          .insert(insert)
          .select("id")
          .single()
        if (fallbackError) return { data: null, error: fallbackError }
        return { data: fallbackData, error: null }
      }
      return { data, error }
    }

    let moduleId: string | null = null

    if (rawPdf) {
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        title,
        content_type: "pdf",
        storage_path: null,
        raw_text: rawText,
        raw_pdf: rawPdf,
        status: "processing",
        topic_labels: [],
      }
      if (structuredContent) {
        insertData.structured_content = structuredContent
      }

      const { data, error } = await insertModule(insertData)

      if (error?.message?.includes("raw_pdf") || error?.message?.includes("structured_content")) {
        const fallbackData: Record<string, unknown> = {
          user_id: user.id,
          title,
          content_type: "pdf",
          storage_path: null,
          raw_text: rawText,
          status: "processing",
          topic_labels: [],
        }
        const { data: fb, error: fbErr } = await insertModule(fallbackData)
        moduleId = fb?.id ?? null
        if (fbErr) {
          return NextResponse.json({ error: `DB: ${fbErr.message}` }, { status: 500 })
        }
      } else if (error) {
        return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 })
      } else {
        moduleId = data?.id ?? null
      }
    } else {
      const { data, error } = await insertModule({
        user_id: user.id,
        title,
        content_type: "text",
        storage_path: null,
        raw_text: rawText,
        status: "processing",
        topic_labels: [],
      })

      if (error) {
        return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 })
      }
      moduleId = data?.id ?? null
    }

    if (!moduleId) {
      return NextResponse.json({ error: "No module returned" }, { status: 500 })
    }

    return NextResponse.json({ moduleId })
  } catch (err) {
    return NextResponse.json({ error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
