import { stripMarkdownSymbols } from "@/lib/text-normalizer"

// Consumes an SSE stream from one of the /api/ai-tools/* routes, decoding
// OpenAI-style `data: {...}` chunks, and reports progressively cleaned text
// as it arrives. Shared by every AI tool trigger (profile tools, repo
// insights, compare verdict) so the SSE parsing lives in exactly one place.
export async function streamAIToolResult(
  endpoint: string,
  onChunk?: (cleanedText: string) => void,
  init?: RequestInit
): Promise<string> {
  const response = await fetch(endpoint, init)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }
  if (!response.body) {
    throw new Error("Response body is missing.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let done = false
  let accumulated = ""
  let unprocessed = ""

  while (!done) {
    const { value, done: readerDone } = await reader.read()
    done = readerDone
    unprocessed += decoder.decode(value, { stream: !done })

    let eolIndex: number
    while ((eolIndex = unprocessed.indexOf("\n")) >= 0) {
      const line = unprocessed.slice(0, eolIndex).trim()
      unprocessed = unprocessed.slice(eolIndex + 1)
      if (!line.startsWith("data:")) continue

      const jsonData = line.slice(5).trim()
      if (jsonData === "[DONE]") {
        done = true
        break
      }

      try {
        const parsed = JSON.parse(jsonData)
        const deltaContent = parsed.choices?.[0]?.delta?.content
        if (deltaContent) {
          accumulated += deltaContent
          if (accumulated.length > 50) {
            onChunk?.(stripMarkdownSymbols(accumulated))
          }
        }
        if (parsed.choices?.[0]?.finish_reason === "stop") {
          done = true
        }
      } catch {
        // Partial JSON split across chunks — wait for more data.
      }
    }
  }

  const finalText = stripMarkdownSymbols(accumulated)
  onChunk?.(finalText)
  return finalText
}
