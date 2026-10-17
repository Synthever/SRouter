import { queryOptions } from "@tanstack/react-query"

import { request } from "./client"
import type { KeyListResponse } from "./types"

/**
 * `GET /v1/keys`. Admin session only. The list carries each key's token quota
 * consumption, which is the only per-key usage the server maintains: `usage_cost`
 * stays at zero because it is reserved for billing invoices, so a credit bar
 * would always read $0.00 and is deliberately not drawn.
 */
export const keyListQuery = queryOptions({
  queryKey: ["keys", "list"] as const,
  queryFn: ({ signal }) => request<KeyListResponse>("/v1/keys", { signal }),
  staleTime: 15_000,
})
