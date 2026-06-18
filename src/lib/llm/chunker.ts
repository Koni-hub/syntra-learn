export interface Chunk {
  content: string
  tokenCount: number
  index: number
}

const CHUNK_MAX_TOKENS = 2000
const CHUNK_OVERLAP_TOKENS = 200

function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function splitIntoBlocks(rawText: string): string[] {
  const blocks: string[] = []
  const parts = rawText.split(/(\[Table\][\s\S]*?\[\/Table\])/g)

  for (const part of parts) {
    if (part.startsWith("[Table]")) {
      blocks.push(part)
    } else {
      const paragraphs = part.split(/\n\s*\n/)
      for (const para of paragraphs) {
        const trimmed = para.trim()
        if (!trimmed) continue

        if (/^#{1,3}\s/.test(trimmed)) {
          blocks.push(trimmed)
        } else {
          blocks.push(trimmed)
        }
      }
    }
  }

  return blocks.filter((b) => b.length > 0)
}

export function chunkText(rawText: string): Chunk[] {
  const blocks = splitIntoBlocks(rawText)
  const chunks: Chunk[] = []
  let currentChunk = ""
  let overlapBuffer = ""

  for (const block of blocks) {
    const isTable = block.startsWith("[Table]")
    const isHeading = /^#{1,3}\s/.test(block)

    if (isTable) {
      if (currentChunk.trim()) {
        chunks.push({ content: currentChunk.trim(), tokenCount: approximateTokens(currentChunk), index: chunks.length })
        currentChunk = ""
      }
      chunks.push({ content: block, tokenCount: approximateTokens(block), index: chunks.length })
      continue
    }

    if (isHeading && currentChunk.trim()) {
      chunks.push({ content: currentChunk.trim(), tokenCount: approximateTokens(currentChunk), index: chunks.length })
      currentChunk = ""
      overlapBuffer = ""
    }

    const candidate = currentChunk ? currentChunk + "\n\n" + block : block
    const tokenCount = approximateTokens(candidate)

    if (tokenCount > CHUNK_MAX_TOKENS && currentChunk) {
      chunks.push({ content: currentChunk.trim(), tokenCount: approximateTokens(currentChunk), index: chunks.length })

      const words = currentChunk.split(/\s+/)
      const overlapWords: string[] = []
      let overlapTokens = 0
      for (let i = words.length - 1; i >= 0; i--) {
        const t = approximateTokens(words[i])
        if (overlapTokens + t > CHUNK_OVERLAP_TOKENS) break
        overlapTokens += t
        overlapWords.unshift(words[i])
      }
      overlapBuffer = overlapWords.join(" ")
      currentChunk = overlapBuffer ? overlapBuffer + "\n\n" + block : block
    } else {
      currentChunk = candidate
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), tokenCount: approximateTokens(currentChunk), index: chunks.length })
  }

  return chunks
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const chars = maxTokens * 4
  if (text.length <= chars) return text
  return text.slice(0, chars) + "..."
}
