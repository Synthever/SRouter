import { ErrorCode, type ErrorEnvelope, type HTTPMethod } from "./types"

/**
 * The verbs this client is allowed to send. `HTTPMethod` also carries `PUT`,
 * `HEAD`, `OPTIONS`, `CONNECT`, `TRACE` and `OTHER` because the request log
 * records whatever arrived; none of the operator API's routes accept them, so
 * listing them here would promise an endpoint that does not exist. A whitelist
 * rather than an `Exclude` blacklist on purpose: a verb the server later gains
 * stays unreachable until it is added here deliberately.
 */
type RequestMethod = Extract<HTTPMethod, "GET" | "POST" | "PATCH" | "DELETE">

/**
 * Every failure the API reports carries the `ErrorEnvelope` shape, so callers
 * branch on `status` and `code` rather than parsing messages. `code` is the
 * stable field — a closed union generated from the server's `ErrorCode` enum,
 * so a comparison against a code this build cannot send is a type error —
 * while `message` is prose that may be reworded.
 */
export class APIError extends Error {
  readonly status: number
  readonly code: ErrorCode | null
  readonly param: string | null

  constructor(status: number, body: ErrorEnvelope["error"] | null) {
    super(body?.message ?? `Request failed with status ${status}`)
    this.name = "APIError"
    this.status = status
    this.code = body?.code ?? null
    this.param = body?.param ?? null
  }

  /** The session is gone or was never established. Callers redirect to login. */
  get isUnauthenticated() {
    return (
      this.status === 401 && this.code === ErrorCode.authentication_required
    )
  }
}

type RequestOptions = {
  method?: RequestMethod
  /** Serialised as JSON. Any body this app sends is an object, never a scalar. */
  body?: object
  /**
   * A multipart body. `Content-Type` stays unset on purpose: the browser has to
   * write the boundary itself, and a manual header makes the server see a
   * malformed request.
   */
  form?: FormData
  signal?: AbortSignal
}

/**
 * The one place a failing response becomes an `APIError`; the JSON and the
 * binary paths share it, so a `401` surfaces the same way on both.
 */
async function failure(response: Response): Promise<APIError> {
  const text = await response.text()
  let envelope: ErrorEnvelope | null = null
  if (text.length > 0) {
    try {
      envelope = JSON.parse(text) as ErrorEnvelope
    } catch {
      // A non-JSON body means something answered that is not this API: a proxy
      // error page, an HTML 404 from a misconfigured static host. Surface the
      // status rather than a parse failure.
      envelope = null
    }
  }

  return new APIError(response.status, envelope?.error ?? null)
}

/**
 * One request against the API. Requests are same-origin: in development the
 * Vite proxy forwards `/v1` to the server, and in production the server serves
 * the built dashboard itself. That matters because the admin session is an
 * HttpOnly `SameSite=Lax` cookie, which a browser will not send across sites.
 *
 * `credentials: "include"` is what makes the cookie travel; without it the
 * session silently does not persist.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, form, signal } = options

  const response = await fetch(path, {
    method,
    credentials: "include",
    signal,
    headers:
      form === undefined && body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  })

  if (!response.ok) {
    throw await failure(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let parsed: object | null = null
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text)
    } catch {
      // A 2xx that is not JSON is not this API's answer either.
      parsed = null
    }
  }

  return parsed as T
}

/**
 * A binary response. Beside `request<T>()` rather than folded into it because
 * that path reads `text()`: a SQLite file would not survive the trip.
 */
export async function requestBlob(
  path: string
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await fetch(path, { credentials: "include" })

  if (!response.ok) {
    throw await failure(response)
  }

  const disposition = response.headers.get("content-disposition")
  const match = disposition?.match(/filename="?([^";]+)"?/)

  return { blob: await response.blob(), filename: match?.[1] ?? null }
}
