import { queryOptions } from "@tanstack/react-query"

import { request } from "./client"
import type {
  APIKeyResponse,
  CreateAPIKeyInput,
  CreatedAPIKeyResponse,
  KeyListResponse,
  UpdateAPIKeyInput,
} from "./types"

/**
 * `GET /v1/keys`. Admin session only. The list carries each key's token quota
 * consumption and its accumulated spend, so the usage screen reads both from one
 * request. It draws the token budget only: `usage_cost` is settled by the gateway
 * after a request completes, and the quota panel is the surface that has to warn
 * before the next request is refused.
 */
export const keyListQuery = queryOptions({
  queryKey: ["keys", "list"] as const,
  queryFn: ({ signal }) => request<KeyListResponse>("/v1/keys", { signal }),
  staleTime: 15_000,
})

/**
 * `POST /v1/keys`. The only response that carries the full secret; the server
 * stores a hash and a display prefix, so after this the key is unrecoverable.
 */
export function createAPIKey(input: CreateAPIKeyInput) {
  return request<CreatedAPIKeyResponse>("/v1/keys", {
    method: "POST",
    body: input,
  })
}

/** `PATCH /v1/keys/{id}`. Absent fields are left untouched. */
export function updateAPIKey(keyID: string, input: UpdateAPIKeyInput) {
  return request<APIKeyResponse>(`/v1/keys/${encodeURIComponent(keyID)}`, {
    method: "PATCH",
    body: input,
  })
}

/** `DELETE /v1/keys/{id}`. Revocation is immediate: the key stops authenticating. */
export function deleteAPIKey(keyID: string) {
  return request<{ message: string }>(
    `/v1/keys/${encodeURIComponent(keyID)}`,
    { method: "DELETE" }
  )
}

/**
 * `POST /v1/keys/{id}/credit`. The server adds `amount` to the key's current
 * cap and rejects anything at or below zero, so a top-up is its own action
 * rather than a field of the update: "set the cap to 20" and "add 20" are
 * different requests.
 */
export function addAPIKeyCredit(keyID: string, amount: number) {
  return request<APIKeyResponse>(
    `/v1/keys/${encodeURIComponent(keyID)}/credit`,
    { method: "POST", body: { amount } }
  )
}
