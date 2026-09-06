// Server-side OpenRouter client with automatic fallback across every free model.
// If a model is removed, rate-limited, or rejects the request, the next one in
// the chain is tried automatically so AI features never hard-fail because of a
// single model going away (which is exactly what happened with DAKAEi).

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

// Used only if the live /models fetch below fails (e.g. OpenRouter itself is down).
// Snapshot of models verified working at the time this was written — OpenRouter's
// free lineup rotates, so this is a last resort, not the primary source of truth.
const STATIC_FREE_MODEL_FALLBACK = [
  "minimax/minimax-m3:free",
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
]

interface OpenRouterModel {
  id: string
  pricing?: { prompt?: string; completion?: string }
}

let cachedFreeModels: { list: string[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

async function fetchLiveFreeModelIds(): Promise<string[]> {
  const res = await fetch(OPENROUTER_MODELS_URL, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Failed to list OpenRouter models: ${res.status}`)
  }
  const data = await res.json()
  const models: OpenRouterModel[] = data.data ?? data.models ?? []
  return models
    .filter((m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0")
    .map((m) => m.id)
}

async function getFreeModelIds(): Promise<string[]> {
  const now = Date.now()
  if (cachedFreeModels && now - cachedFreeModels.fetchedAt < CACHE_TTL_MS) {
    return cachedFreeModels.list
  }

  try {
    const list = await fetchLiveFreeModelIds()
    if (list.length > 0) {
      cachedFreeModels = { list, fetchedAt: now }
      return list
    }
  } catch (error) {
    console.warn("[openrouter] Could not fetch live free-model list, using static fallback:", error)
  }

  return STATIC_FREE_MODEL_FALLBACK
}

// Ordered, de-duplicated list of models to try: an optional preferred model first,
// then every currently-free OpenRouter model as a fallback chain.
async function buildModelChain(preferredModel?: string): Promise<string[]> {
  const freeModels = await getFreeModelIds()
  const chain = preferredModel ? [preferredModel, ...freeModels] : freeModels
  return Array.from(new Set(chain))
}

function requestHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    // Recommended by OpenRouter for attribution; requests work fine without it too.
    "HTTP-Referer": process.env.APP_URL || "https://github-profile-analyzer.vercel.app",
    "X-Title": "GitHub Profile Analyzer",
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatOptions {
  maxTokens?: number
  temperature?: number
  preferredModel?: string
}

export interface ChatResult {
  content: string
  modelUsed: string
}

export interface StreamResult {
  stream: ReadableStream<Uint8Array>
  modelUsed: string
}

class OpenRouterAuthError extends Error {}

// Some free models are "reasoning" models that can spend their entire max_tokens
// budget on hidden reasoning tokens and emit zero visible content while still
// returning HTTP 200 with a well-formed-looking stream (observed with
// inclusionai/ling-3.0-flash-*:free). We can't trust "200 + has a body" alone,
// so we peek at the stream until real `delta.content` shows up (or we give up)
// before committing to it, and splice the peeked bytes back in transparently.
async function bufferUntilContentOrGiveUp(
  response: Response,
  opts: { maxWaitMs: number; maxBufferBytes: number }
): Promise<{ ok: true; stream: ReadableStream<Uint8Array> } | { ok: false; reason: string }> {
  if (!response.body) return { ok: false, reason: "no response body" }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferedChunks: Uint8Array[] = []
  let bufferedBytes = 0
  let textBuffer = ""
  let sawContent = false
  let done = false
  const startTime = Date.now()

  while (!sawContent && !done) {
    if (Date.now() - startTime > opts.maxWaitMs || bufferedBytes > opts.maxBufferBytes) {
      await reader.cancel().catch(() => {})
      return { ok: false, reason: "gave up waiting for visible content" }
    }

    const { value, done: readerDone } = await reader.read()
    done = readerDone

    if (value) {
      bufferedChunks.push(value)
      bufferedBytes += value.byteLength
      textBuffer += decoder.decode(value, { stream: !done })

      let eol
      while ((eol = textBuffer.indexOf("\n")) >= 0) {
        const line = textBuffer.slice(0, eol).trim()
        textBuffer = textBuffer.slice(eol + 1)
        if (!line.startsWith("data:")) continue
        const payload = line.slice(5).trim()
        if (payload === "[DONE]") continue
        try {
          const parsed = JSON.parse(payload)
          if (parsed.choices?.[0]?.delta?.content) {
            sawContent = true
          }
        } catch {
          // Partial JSON split across chunks — wait for the rest.
        }
      }
    }
  }

  if (!sawContent) {
    return { ok: false, reason: "stream ended with no visible content" }
  }

  // Replay what we already consumed, then keep pumping the same reader.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of bufferedChunks) controller.enqueue(chunk)
    },
    async pull(controller) {
      const { value, done: readerDone } = await reader.read()
      if (value) controller.enqueue(value)
      if (readerDone) controller.close()
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })

  return { ok: true, stream }
}

// Non-streaming call. Tries each model in the fallback chain in order and
// returns the first one that succeeds.
export async function chatWithFallback(
  apiKey: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const { maxTokens, temperature = 0.7, preferredModel } = options
  const modelChain = await buildModelChain(preferredModel)
  const attemptErrors: string[] = []

  for (const model of modelChain) {
    try {
      const res = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: requestHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          temperature,
        }),
      })

      if (res.status === 401) {
        throw new OpenRouterAuthError("OpenRouter API key is invalid or missing (401 Unauthorized).")
      }

      if (!res.ok) {
        attemptErrors.push(`${model}: ${res.status} ${await res.text().catch(() => "")}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) {
        attemptErrors.push(`${model}: empty response`)
        continue
      }

      return { content, modelUsed: model }
    } catch (error: any) {
      if (error instanceof OpenRouterAuthError) throw error
      attemptErrors.push(`${model}: ${error.message}`)
    }
  }

  throw new Error(`All OpenRouter models failed. Attempts:\n${attemptErrors.join("\n")}`)
}

// Streaming call. Tries each model until one accepts the request and starts
// streaming; the fallback only covers the initial handshake, not a stream that
// dies mid-way, since the client is already consuming bytes by then.
export async function chatStreamWithFallback(
  apiKey: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<StreamResult> {
  const { maxTokens, temperature = 0.7, preferredModel } = options
  const modelChain = await buildModelChain(preferredModel)
  const attemptErrors: string[] = []

  for (const model of modelChain) {
    try {
      const res = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: requestHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          temperature,
          stream: true,
        }),
        // Required on Vercel/Cloudflare edge runtimes to allow a streamed request/response.
        // @ts-ignore
        duplex: "half",
      })

      if (res.status === 401) {
        throw new OpenRouterAuthError("OpenRouter API key is invalid or missing (401 Unauthorized).")
      }

      if (!res.ok || !res.body) {
        attemptErrors.push(`${model}: ${res.status} ${await res.text().catch(() => "")}`)
        continue
      }

      const verified = await bufferUntilContentOrGiveUp(res, {
        maxWaitMs: 20_000,
        maxBufferBytes: 300_000,
      })

      if (!verified.ok) {
        attemptErrors.push(`${model}: ${verified.reason}`)
        continue
      }

      return { stream: verified.stream, modelUsed: model }
    } catch (error: any) {
      if (error instanceof OpenRouterAuthError) throw error
      attemptErrors.push(`${model}: ${error.message}`)
    }
  }

  throw new Error(`All OpenRouter models failed (stream). Attempts:\n${attemptErrors.join("\n")}`)
}
