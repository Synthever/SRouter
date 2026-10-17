import { queryOptions } from "@tanstack/react-query"

import { request } from "./client"
import type { ModelListResponse } from "./types"

/**
 * `GET /v1/models`. The catalog this deployment actually serves, which is what
 * a key allowlist has to be drawn from: an id the gateway does not list would
 * block every request that asked for it. The server owns the catalog's refresh
 * schedule and serves it from cache, so the client holds it longer than the
 * operator-facing lists that must track a mutation.
 */
export const modelListQuery = queryOptions({
  queryKey: ["models", "list"] as const,
  queryFn: ({ signal }) => request<ModelListResponse>("/v1/models", { signal }),
  staleTime: 60_000,
})
