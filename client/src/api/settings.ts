import { queryOptions } from "@tanstack/react-query"

import { request } from "./client"
import type {
  SettingsResponse,
  SystemResponse,
  UpdateSettingsInput,
} from "./types"

/**
 * `GET /v1/settings`. The route carries the gateway guard, and `api_key_auth`
 * accepts the admin cookie before it looks for a key, so the dashboard reads it
 * without holding one.
 */
export const settingsQuery = queryOptions({
  queryKey: ["settings"] as const,
  queryFn: ({ signal }) =>
    request<SettingsResponse>("/v1/settings", { signal }),
  staleTime: 60_000,
})

/** `PATCH /v1/settings`. Absent fields are left untouched. */
export function updateSettings(input: UpdateSettingsInput) {
  return request<SettingsResponse>("/v1/settings", {
    method: "PATCH",
    body: input,
  })
}

/**
 * `GET /v1/admin/system`. Admin session only: the database path and the schema
 * version change on a restart or a migration, so they are cached for longer
 * than the page's own settings.
 */
export const systemQuery = queryOptions({
  queryKey: ["admin", "system"] as const,
  queryFn: ({ signal }) =>
    request<SystemResponse>("/v1/admin/system", { signal }),
  staleTime: 300_000,
})
