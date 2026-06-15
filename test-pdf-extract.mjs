import { extractPdfText } from "./src/lib/pdf-extract.mjs"

// Minimal valid PDF (empty page)
const PDF_BYTES = Buffer.from(
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjUgMDAwMDAgbiAKMDAwMDAwMDEyMiAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDQgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjE4NQolJUVPRgo=",
  "base64",
)

const uint8 = new Uint8Array(PDF_BYTES)
try {
  const text = await extractPdfText(uint8)
  console.log("> Extracted text:", JSON.stringify(text))
  console.log("SUCCESS")
} catch (e) {
  console.error("FAILED:", e.message)
  console.error(e.stack?.slice(0, 1000))
}
