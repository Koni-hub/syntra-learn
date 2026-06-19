import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"

// Disable worker for serverless environments — no fake worker, no eval()
;(pdfjsLib.GlobalWorkerOptions as unknown as { workerPort: Worker | null }).workerPort = null

interface ExtractedTable {
  rows: string[][]
  startIndex: number
  endIndex: number
}

interface ExtractedSection {
  heading: string
  level: number
  startIndex: number
}

export interface ExtractedContent {
  text: string
  tables: ExtractedTable[]
  sections: ExtractedSection[]
  pageCount: number
  hasImages: boolean
  source: "pdfjs" | "ocr"
}

function detectTables(text: string): ExtractedTable[] {
  const tables: ExtractedTable[] = []
  const lines = text.split("\n")
  let tableLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    const pipeCount = (trimmed.match(/\|/g) || []).length
    const tabCount = (trimmed.match(/\t/g) || []).length
    const isTableLine = pipeCount >= 2 || (tabCount >= 2 && trimmed.length > 10)

    if (isTableLine) {
      tableLines.push(trimmed)
    } else {
      if (tableLines.length >= 2) {
        const rows = tableLines.map((l) =>
          l.split(/[|\t]/).map((c) => c.trim()).filter((c) => c.length > 0)
        )
        tables.push({ rows, startIndex: 0, endIndex: 0 })
      }
      tableLines = []
    }
  }

  if (tableLines.length >= 2) {
    const rows = tableLines.map((l) =>
      l.split(/[|\t]/).map((c) => c.trim()).filter((c) => c.length > 0)
    )
    tables.push({ rows, startIndex: 0, endIndex: 0 })
  }

  return tables
}

function detectSections(text: string): ExtractedSection[] {
  const sections: ExtractedSection[] = []
  const lines = text.split("\n")
  let charOffset = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 3 || trimmed.length > 200) {
      charOffset += line.length + 1
      continue
    }

    let level = 0
    if (/^#{1,3}\s/.test(trimmed)) {
      level = trimmed.match(/^#+/)?.[0]?.length ?? 1
    } else if (/^[A-Z][A-Z\s]{3,}$/.test(trimmed) && trimmed.length < 80) {
      level = 1
    } else if (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length < 100) {
      level = 3
    } else if (/^[A-Z][a-z]/.test(trimmed) && trimmed.length < 80 && !trimmed.includes(".")) {
      level = 2
    }

    if (level > 0) {
      const heading = trimmed.replace(/^#{1,3}\s/, "")
      sections.push({ heading, level, startIndex: charOffset })
    }

    charOffset += line.length + 1
  }

  return sections
}

async function extractWithPdfJs(uint8: Uint8Array): Promise<ExtractedContent> {
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    isEvalSupported: false,
    useWorkerFetch: false,
  })

  const doc = await loadingTask.promise
  let fullText = ""

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    fullText += pageText + "\n\n"
    page.cleanup()
  }

  const sections = detectSections(fullText)
  for (const s of sections) {
    fullText = fullText.replace(s.heading, "#".repeat(s.level) + " " + s.heading)
  }

  const tables = detectTables(fullText)
  for (const table of tables) {
    const tableText = table.rows.map((r) => r.join(" | ")).join("\n")
    fullText += "\n\n[Table]\n" + tableText + "\n[/Table]"
  }

  return {
    text: fullText,
    tables,
    sections,
    pageCount: doc.numPages,
    hasImages: false,
    source: "pdfjs",
  }
}

async function extractWithOcr(uint8: Uint8Array): Promise<ExtractedContent> {
  const Tesseract = await import("tesseract.js")

  const buffer = Buffer.from(uint8)
  const { data } = await Tesseract.recognize(buffer, "eng", {
    logger: () => {},
  })

  const text = data.text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")

  return {
    text,
    tables: [],
    sections: [],
    pageCount: 1,
    hasImages: true,
    source: "ocr",
  }
}

export async function extractPdfText(uint8: Uint8Array): Promise<string> {
  const result = await extractPdfContent(uint8)
  return result.text
}

export async function extractPdfContent(uint8: Uint8Array): Promise<ExtractedContent> {
  let result = await extractWithPdfJs(uint8)

  const cleanText = result.text
    .replace(/\[Table\][\s\S]*?\[\/Table\]/g, "")
    .replace(/#{1,3}\s/g, "")
    .trim()

  const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length

  if (wordCount < 50) {
    try {
      const ocrPromise = extractWithOcr(uint8)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timed out")), 25000)
      )
      const ocrResult = await Promise.race([ocrPromise, timeoutPromise])
      if (ocrResult.text.split(/\s+/).length > wordCount) {
        return ocrResult
      }
    } catch (e) {
      console.warn("OCR failed, using pdfjs result:", e)
    }
  }

  return result
}
