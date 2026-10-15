import { queryOptions } from "@tanstack/react-query"

import { request } from "./client"
import type {
  CatalogResponse,
  ProviderEntry,
  ProviderListResponse,
} from "./types"

export type AddCustomProviderInput = Parameters<typeof addCustomProvider>[0]

/** `GET /v1/providers`. Complete provider list. */
export const providersListQuery = queryOptions({
  queryKey: ["providers", "list"] as const,
  queryFn: ({ signal }) =>
    request<ProviderListResponse>("/v1/providers", { signal }),
  staleTime: 10_000,
  refetchOnMount: "always",
})

/** `GET /v1/providers/catalog`. Grouped catalog: oauth, free_tier, api_key, custom_provider. */
export const providersCatalogQuery = queryOptions({
  queryKey: ["providers", "catalog"] as const,
  queryFn: ({ signal }) =>
    request<CatalogResponse>("/v1/providers/catalog", { signal }),
  staleTime: 10_000,
})

/** `GET /v1/providers/{provider_id}`. Provider detail with connections and models. */
export function providerDetailQuery(providerID: string) {
  return queryOptions({
    queryKey: ["providers", "detail", providerID] as const,
    queryFn: ({ signal }) =>
      request<ProviderEntry>(
        `/v1/providers/${encodeURIComponent(providerID)}`,
        {
          signal,
        }
      ),
    staleTime: 10_000,
  })
}

/** `PATCH /v1/providers/{provider_id}`. Update driver flags or connection settings. */
export function patchProvider(
  providerID: string,
  body: {
    enabled?: boolean
    hide?: string[]
    restore?: string[]
    favorite?: string[]
    unfavorite?: string[]
    name?: string
    prefix?: string
    protocol?: string
    base_url?: string
    api_key?: string
  }
) {
  return request<ProviderEntry>(
    `/v1/providers/${encodeURIComponent(providerID)}`,
    {
      method: "PATCH",
      body,
    }
  )
}

/** `PATCH /v1/providers/{provider_id}/round-robin`. Toggle round robin rotation across accounts. */
export function toggleRoundRobin(providerID: string, enabled: boolean) {
  return request<ProviderEntry>(
    `/v1/providers/${encodeURIComponent(providerID)}/round-robin`,
    {
      method: "PATCH",
      body: { enabled },
    }
  )
}

export interface OAuthLoginResult {
  authorize_url: string
  state: string
  code_verifier: string
  redirect_uri: string
}

/** Initiates provider OAuth authorization flow for supported drivers. */
export function initiateOAuthLogin(providerID: string) {
  const normalized = providerID.toLowerCase()
  // OpenAI Codex client ID app_EMoamEEZ73f0CkXaXp7hrann strictly enforces port 1455 redirect URI.
  let authPath =
    "/v1/auth/openai/login?format=json&redirect_uri=" +
    encodeURIComponent("http://localhost:1455/auth/callback")
  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    authPath = "/v1/auth/claude/login?format=json"
  } else if (normalized.includes("antigravity")) {
    authPath = "/v1/auth/antigravity/login?format=json"
  } else if (normalized.includes("qoder")) {
    authPath = "/v1/auth/qoder/login?format=json"
  } else if (normalized.includes("cline")) {
    authPath = "/v1/auth/cline/device"
  } else if (normalized.includes("codebuddy")) {
    authPath = "/v1/auth/codebuddy/device"
  } else if (normalized.includes("grok")) {
    authPath = "/v1/auth/grok/login?format=json"
  }

  return request<OAuthLoginResult>(authPath, {
    method: "GET",
  })
}

/** `POST /v1/auth/{provider}/token`. Imports an OAuth access token directly into SQLite. */
export function importOAuthToken(
  providerID: string,
  body: {
    access_token: string
    refresh_token?: string
    account_id?: string
    id_token?: string
    name?: string
  }
) {
  const normalized = providerID.toLowerCase()
  let tokenPath = "/v1/auth/openai/token"
  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    tokenPath = "/v1/auth/claude/token"
  } else if (normalized.includes("antigravity")) {
    tokenPath = "/v1/auth/antigravity/token"
  }

  return request<{
    success: boolean
    message: string
  }>(tokenPath, {
    method: "POST",
    body,
  })
}

/** Completes authorization callback with code and state or redirect URL. */
export function completeOAuthCallback(
  providerID: string,
  params: { code?: string; state?: string; callback_url?: string }
) {
  const normalized = providerID.toLowerCase()
  let cbPath = "/v1/auth/openai/callback"
  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    cbPath = "/v1/auth/claude/callback"
  } else if (normalized.includes("antigravity")) {
    cbPath = "/v1/auth/antigravity/callback"
  } else if (normalized.includes("qoder")) {
    cbPath = "/v1/auth/qoder/callback"
  }

  return request<{
    success: boolean
    message: string
  }>(cbPath, {
    method: "POST",
    body: params,
  })
}

/** `POST /v1/providers`. Registers a custom provider endpoint. */
export function addCustomProvider(body: {
  name: string
  prefix?: string
  protocol: string
  base_url: string
  api_key?: string
}) {
  return request<ProviderEntry>("/v1/providers", {
    method: "POST",
    body,
  })
}
