interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName: string
}

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

function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function sortByPosition(items: TextItem[]): TextItem[] {
  return [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5]
    if (Math.abs(yDiff) > 5) return yDiff
    return a.transform[4] - b.transform[4]
  })
}

function groupIntoLines(items: TextItem[], pageWidth: number): TextItem[][] {
  const lines: TextItem[][] = []
  let currentLine: TextItem[] = []
  let lastY = -9999

  for (const item of items) {
    const y = Math.round(item.transform[5])
    if (Math.abs(y - lastY) > 5) {
      if (currentLine.length > 0) lines.push(currentLine)
      currentLine = [item]
      lastY = y
    } else {
      currentLine.push(item)
    }
  }
  if (currentLine.length > 0) lines.push(currentLine)
  return lines
}

function detectTableFromLines(lines: TextItem[][], pageWidth: number): ExtractedTable[] {
  const tables: ExtractedTable[] = []
  const tableLines: TextItem[][] = []

  for (const line of lines) {
    const gaps: number[] = []
    const sorted = [...line].sort((a, b) => a.transform[4] - b.transform[4])
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1].transform[4] + (sorted[i - 1].width || 0)
      const gap = sorted[i].transform[4] - prevEnd
      if (gap > 15) gaps.push(gap)
    }
    const hasTableGaps = gaps.length >= 2
    if (hasTableGaps) {
      tableLines.push(line)
    } else {
      if (tableLines.length >= 3) {
        const table = buildTable(tableLines)
        if (table) tables.push(table)
      }
      tableLines.length = 0
    }
  }

  if (tableLines.length >= 3) {
    const table = buildTable(tableLines)
    if (table) tables.push(table)
  }

  return tables
}

function buildTable(lines: TextItem[][]): ExtractedTable | null {
  if (lines.length < 2) return null
  const columnPositions: number[] = []
  const allItems = lines.flat()
  const sorted = [...allItems].sort((a, b) => a.transform[4] - b.transform[4])

  let lastX = -9999
  for (const item of sorted) {
    const x = Math.round(item.transform[4] / 10) * 10
    if (Math.abs(x - lastX) > 20) {
      columnPositions.push(x)
      lastX = x
    }
  }

  if (columnPositions.length < 2) return null

  const rows: string[][] = []
  for (const line of lines) {
    const cells: string[] = new Array(columnPositions.length).fill("")
    const sortedLine = [...line].sort((a, b) => a.transform[4] - b.transform[4])
    for (const item of sortedLine) {
      const x = item.transform[4]
      let bestCol = 0
      let bestDist = Infinity
      for (let c = 0; c < columnPositions.length; c++) {
        const dist = Math.abs(x - columnPositions[c])
        if (dist < bestDist) {
          bestDist = dist
          bestCol = c
        }
      }
      cells[bestCol] = cells[bestCol] ? cells[bestCol] + " " + item.str : item.str
    }
    rows.push(cells.map((c) => c.trim()))
  }

  return { rows, startIndex: 0, endIndex: 0 }
}

function detectHeadings(line: TextItem[]): { text: string; level: number } | null {
  if (line.length === 0) return null
  const text = line.map((i) => i.str).join(" ").trim()
  if (text.length < 3 || text.length > 200) return null

  const avgHeight = line.reduce((s, i) => s + (i.height || 12), 0) / line.length
  const isBold = line.some((i) => i.fontName?.toLowerCase().includes("bold"))

  if (avgHeight > 18 && isBold) return { text, level: 1 }
  if (avgHeight > 15 || (isBold && avgHeight > 13)) return { text, level: 2 }
  if (isBold && text.length < 80) return { text, level: 3 }
  if (/^\d+[\.\)]\s/.test(text)) return { text, level: 3 }

  return null
}

async function extractWithPdfJs(uint8: Uint8Array): Promise<ExtractedContent> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
  ;(globalThis as any).pdfjsWorker = worker

  const loadingTask = pdfjs.getDocument({ data: uint8 })
  const pdf = await loadingTask.promise
  const allTexts: string[] = []
  const allTables: ExtractedTable[] = []
  const allSections: ExtractedSection[] = []
  let hasImages = false

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const content = await page.getTextContent({
      includeMarkedContent: false,
      disableNormalization: false,
    })

    const items = content.items.filter((item: any) => "str" in item && item.str.trim()) as TextItem[]

    for (const item of items) {
      if (item.str && item.str.trim().length > 0) {
        hasImages = true
        break
      }
    }

    const sorted = sortByPosition(items)
    const lines = groupIntoLines(sorted, viewport.width)

    const tables = detectTableFromLines(lines, viewport.width)
    for (const t of tables) {
      allTables.push(t)
    }

    const pageLines: string[] = []
    for (const line of lines) {
      const text = line.map((i) => i.str).join(" ").trim()
      if (!text) continue

      const heading = detectHeadings(line)
      if (heading) {
        allSections.push({
          heading: heading.text,
          level: heading.level,
          startIndex: allTexts.join("\n\n").length,
        })
        pageLines.push("#".repeat(heading.level) + " " + text)
      } else {
        pageLines.push(text)
      }
    }

    allTexts.push(pageLines.join("\n"))
    page.cleanup()
  }

  await pdf.destroy()

  let fullText = allTexts.join("\n\n")

  for (const table of allTables) {
    const tableText = table.rows.map((r) => r.join(" | ")).join("\n")
    fullText += "\n\n[Table]\n" + tableText + "\n[/Table]"
  }

  return {
    text: fullText,
    tables: allTables,
    sections: allSections,
    pageCount: pdf.numPages,
    hasImages,
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
      const ocrResult = await extractWithOcr(uint8)
      if (ocrResult.text.split(/\s+/).length > wordCount) {
        return ocrResult
      }
    } catch (e) {
      console.warn("OCR failed, using pdfjs result:", e)
    }
  }

  return result
}
