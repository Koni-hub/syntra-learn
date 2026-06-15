import https from "node:https"

const API_BASE = "https://generativelanguage.googleapis.com/v1beta"

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not set")
  return key
}

export const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"]

export function geminiFetch(model: string, contents: { role: string; parts: { text: string }[] }[]): Promise<string> {
  const apiKey = getApiKey()
  const body = JSON.stringify({ contents, generationConfig: { temperature: 0.7 } })

  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}/models/${model}:generateContent`)
    url.searchParams.set("key", apiKey)

    const req = https.request(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 15000,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (c: Buffer) => chunks.push(c))
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8")
          const status = res.statusCode ?? 0

          if (status >= 200 && status < 300) return resolve(raw)

          let msg = raw
          try {
            const j = JSON.parse(raw)
            msg = j.error?.message || msg
          } catch { /* use raw */ }

          const err = new Error(`[Gemini ${status}] ${msg}`)
          ;(err as any).status = status
          reject(err)
        })
      }
    )

    req.on("error", (e) => reject(new Error(`Gemini request failed: ${e.message}`)))
    req.on("timeout", () => { req.destroy(); reject(new Error("Gemini request timed out")) })
    req.write(body)
    req.end()
  })
}

export function isQuotaError(err: unknown): boolean {
  if (err && typeof err === "object" && "message" in err) {
    const m = String(err.message)
    return m.includes("429") || m.includes("quota") || m.includes("Too Many") || m.includes("retry") || m.includes("RESOURCE_EXHAUSTED")
  }
  return false
}

export function parseGeminiResponse(raw: string): { content: string } {
  const result = JSON.parse(raw)
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  if (!text) throw new Error("No content in LLM response")
  text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
  return { content: text }
}
