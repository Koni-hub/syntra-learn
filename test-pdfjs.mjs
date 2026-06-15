const p = await import("pdfjs-dist/legacy/build/pdf.mjs")
console.log("Pdfjs OK, version:", p.version)
const w = await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
console.log("Worker OK")
globalThis.pdfjsWorker = w

// tiny valid PDF
const buf = Buffer.from("JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjUgMDAwMDAgbiAKMDAwMDAwMDEyMiAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDQgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjE4NQolJUVPRgo=", "base64")
const task = p.getDocument({ data: new Uint8Array(buf) })
const doc = await task.promise
console.log("Pages:", doc.numPages)
const page = await doc.getPage(1)
const content = await page.getTextContent()
console.log("Items:", content.items.length)
page.cleanup()
await doc.destroy()
console.log("SUCCESS")
