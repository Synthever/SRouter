import { APIError, request } from "./client"

/**
 * The chat surface the Playground speaks. The gateway's full chat wire types
 * are not yet part of the generated bindings, so these are the explicit narrow
 * views this screen sends and reads — extend them through the server's Rust
 * types rather than growing them ad hoc.
 */
export type PlaygroundMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type PlaygroundChatRequest = {
  model: string
  messages: PlaygroundMessage[]
  max_tokens?: number
  temperature?: number
  stream: boolean
}

export type PlaygroundUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type PlaygroundChatResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[]
  usage?: PlaygroundUsage
}

/**
 * One streamed delta, already flattened from the SSE and OpenAI chunk shapes:
 * a piece of assistant text, and optionally the usage frame that ends the
 * stream. Errors arrive as `APIError` rejects.
 */
export type PlaygroundStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; usage?: PlaygroundUsage; finish_reason?: string }

/**
 * `POST /v1/chat/completions` with `stream: true`. The dashboard session
 * cookie authorizes the call exactly like every other screen. The response is
 * an SSE body of OpenAI chat chunks (`data: {json}` lines ending with
 * `data: [DONE]`), flattened here so the UI never parses the wire.
 *
 * `signal` is the operator's Stop button; aborting closes the connection, and
 * the server cancels the upstream call with it.
 */
export async function streamPlaygroundChat(
  body: PlaygroundChatRequest,
  signal: AbortSignal,
  onEvent: (event: PlaygroundStreamEvent) => void
): Promise<void> {
  const response = await fetch("/v1/chat/completions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw await toAPIError(response)
  }

  const contentType = response.headers.get("Content-Type") ?? ""
  if (!contentType.includes("text/event-stream")) {
    // A gateway answered without streaming (error envelope or proxy page);
    // surface it through the same failure path as a non-2xx.
    const text = await response.text()
    throw parseMaybeEnvelope(response.status, text)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new APIError(response.status, null)
  }

  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE frames are separated by a blank line; process every complete one.
    let separator = buffer.indexOf("\n\n")
    while (separator !== -1) {
      const frame = buffer.slice(0, separator)
      buffer = buffer.slice(separator + 2)
      emitFrame(frame, onEvent)
      separator = buffer.indexOf("\n\n")
    }
  }

  emitFrame(buffer, onEvent)
}

function emitFrame(frame: string, onEvent: (event: PlaygroundStreamEvent) => void) {
  for (const line of frame.split("\n")) {
    const payload = line.startsWith("data:") ? line.slice(5).trim() : ""
    if (!payload || payload === "[DONE]") continue
    let chunk: {
      choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
      usage?: PlaygroundUsage
    }
    try {
      chunk = JSON.parse(payload)
    } catch {
      // A keepalive comment or a frame this build does not model is skipped,
      // not fatal: the stream would otherwise die mid-answer.
      continue
    }
    const delta = chunk?.choices?.[0]?.delta?.content
    if (delta) {
      onEvent({ type: "delta", text: delta })
    }
    const finish = chunk?.choices?.[0]?.finish_reason
    if (chunk?.usage || finish) {
      onEvent({ type: "done", usage: chunk?.usage, finish_reason: finish ?? undefined })
    }
  }
}

async function toAPIError(response: Response): Promise<APIError> {
  const text = await response.text()
  throw parseMaybeEnvelope(response.status, text)
}

function parseMaybeEnvelope(status: number, text: string): APIError {
  if (text.length > 0) {
    try {
      const envelope = JSON.parse(text) as { error?: ConstructorParameters<typeof APIError>[1] }
      return new APIError(status, envelope.error ?? null)
    } catch {
      // HTML error pages and other non-JSON bodies fall through.
    }
  }
  return new APIError(status, null)
}

/**
 * One-shot non-streaming probe, kept beside the streaming client: the same
 * request shape with `stream: false`, for operators who want a single answer
 * without SSE. Failures throw `APIError`.
 */
export function playgroundChat(body: PlaygroundChatRequest) {
  return request<PlaygroundChatResponse>("/v1/chat/completions", {
    method: "POST",
    body: { ...body, stream: false },
  })
}
