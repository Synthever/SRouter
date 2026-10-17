import { queryOptions } from "@tanstack/react-query"

import { request } from "./client"
import type { KeyListResponse } from "./types"

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
