import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractPdfText } from "@/lib/pdf-extract"

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

    const isPdf = file.name.toLowerCase().endsWith(".pdf")

    let rawText = ""
    let rawPdf: string | null = null

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      rawPdf = `data:application/pdf;base64,${Buffer.from(uint8).toString("base64")}`

      try {
        rawText = await extractPdfText(uint8)
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
      const { data, error } = await insertModule({
        user_id: user.id,
        title,
        content_type: "pdf",
        storage_path: null,
        raw_text: rawText,
        raw_pdf: rawPdf,
        status: "processing",
        topic_labels: [],
      })

      if (error?.message?.includes("raw_pdf")) {
        const { data: fallbackData, error: fallbackError } = await insertModule({
          user_id: user.id,
          title,
          content_type: "pdf",
          storage_path: null,
          raw_text: rawText,
          status: "processing",
          topic_labels: [],
        })
        moduleId = fallbackData?.id ?? null
        if (fallbackError) {
          return NextResponse.json({ error: `DB: ${fallbackError.message}` }, { status: 500 })
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
