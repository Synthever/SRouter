import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { ArrowLeft, Plus, RefreshCw, Search, Star } from "lucide-react"
import { useMemo, useState } from "react"

import {
  patchProvider,
  providerDetailQuery,
  toggleRoundRobin,
} from "@/api/providers"
import { Badge } from "@/components/arc/badge/badge"
import { Button } from "@/components/arc/button/button"
import { CopyButton } from "@/components/arc/copy-button/copy-button"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { ConnectAccountModal } from "@/components/providers/modals/ConnectAccounts"
import { ProviderLogo } from "@/components/providers/provider-logo"
import { Switch } from "@/components/ui/switch"

export const Route = createFileRoute("/_authenticated/providers/$providerId")({
  component: ProviderDetailPage,
})

function ProviderDetailPage() {
  const { providerId } = useParams({
    from: "/_authenticated/providers/$providerId",
  })
  const queryClient = useQueryClient()
  const [modelSearch, setModelSearch] = useState("")
  const [connectModalOpen, setConnectModalOpen] = useState(false)

  const {
    data: provider,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery(providerDetailQuery(providerId))

  const toggleEnabledMutation = useMutation({
    mutationFn: (newEnabled: boolean) =>
      patchProvider(providerId, { enabled: newEnabled }),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        providerDetailQuery(providerId).queryKey,
        updated
      )
      void queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success(
        updated.enabled
          ? "Provider driver enabled for traffic"
          : "Provider driver disabled"
      )
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update driver status"
      )
    },
  })

  const toggleRoundRobinMutation = useMutation({
    mutationFn: (newRoundRobin: boolean) =>
      toggleRoundRobin(providerId, newRoundRobin),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        providerDetailQuery(providerId).queryKey,
        updated
      )
      void queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success(
        updated.round_robin
          ? "Multi-account round-robin rotation enabled"
          : "Round-robin rotation disabled"
      )
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle rotation"
      )
    },
  })

  const models = provider?.models
  const filteredModels = useMemo(() => {
    if (!models) return []
    if (!modelSearch.trim()) return models
    const q = modelSearch.toLowerCase()
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.owned_by.toLowerCase().includes(q)
    )
  }, [models, modelSearch])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="flex animate-pulse items-center justify-between rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-xl bg-surface-muted" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-surface-muted" />
              <div className="h-4 w-24 rounded bg-surface-muted" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !provider) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/providers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to providers</span>
        </Link>
        <div className="border-danger/30 bg-danger/10 rounded-xl border p-6 text-center">
          <p className="text-danger text-sm font-medium">
            {error instanceof Error ? error.message : "Provider not found"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const isLive = provider.status.connected_count > 0
  const connections = provider.connections ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/providers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to providers</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-13 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground shadow-2xs">
            <ProviderLogo providerId={provider.id} size={28} />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {provider.name}
              </h1>
              {isLive ? (
                <Badge
                  tone="success"
                  size="sm"
                  icon={
                    <span
                      className="size-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                  }
                >
                  {provider.status.connected_count} live
                </Badge>
              ) : (
                <Badge tone="neutral" size="sm">
                  0 live
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {provider.id}
              </span>
              <span className="text-xs text-muted-foreground/60">•</span>
              <Badge tone="neutral" size="sm" className="capitalize">
                {provider.category.replace("_", " ")}
              </Badge>
              <Badge
                tone="neutral"
                size="sm"
                className="font-mono text-[10px] uppercase"
              >
                {provider.protocol}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setConnectModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus size={13} aria-hidden="true" />
            <span>Connect account</span>
          </Button>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 px-2.5 py-1 text-xs">
            <span className="text-muted-foreground">Driver:</span>
            <span className="font-medium text-foreground">
              {provider.enabled ? "Active" : "Off"}
            </span>
            <Switch
              checked={provider.enabled}
              onCheckedChange={(val) => toggleEnabledMutation.mutate(val)}
              disabled={toggleEnabledMutation.isPending}
              aria-label="Toggle driver active status"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              size={13}
              className={isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Grid: Settings & Account Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Accounts & Models (Span 2) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active Accounts & Connections */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3.5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Active connections
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Configured accounts and authentication sessions under this
                  driver.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus size={12} aria-hidden="true" />
                <span>Add account</span>
              </Button>
            </div>

            {connections.length > 0 ? (
              <div className="mt-4 divide-y divide-border/50">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {conn.name}
                        </span>
                        {conn.prefix && (
                          <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            prefix: {conn.prefix}
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                        {conn.base_url || provider.default_base_url}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        tone={conn.enabled ? "success" : "neutral"}
                        size="sm"
                      >
                        {conn.enabled ? "Connected" : "Disabled"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(conn.created_at * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-surface-muted/40 p-4 text-center">
                <p className="text-xs font-medium text-foreground">
                  {provider.status.message}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {provider.requires_oauth
                    ? "Requires OAuth authentication token to establish live connections."
                    : provider.requires_api_key
                      ? "Requires valid API key or upstream endpoint configuration."
                      : "Ready for unlimited local or free tier routing."}
                </p>
                {(provider.requires_oauth || provider.requires_api_key) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setConnectModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} aria-hidden="true" />
                    <span>Connect account now</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Advertised Models */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Supported models
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Catalog models advertised by this driver.
                </p>
              </div>

              <div className="relative max-w-xs">
                <Search
                  size={13}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Filter models..."
                  className="h-8 rounded-lg border border-border bg-surface pr-2.5 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-foreground"
                />
              </div>
            </div>

            {filteredModels.length > 0 ? (
              <div className="mt-3.5 max-h-96 divide-y divide-border/40 overflow-y-auto">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="font-mono text-xs text-foreground">
                        {model.id}
                      </span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        by {model.owned_by}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {model.favorite && (
                        <span title="Favorite model" className="text-amber-500">
                          <Star size={12} fill="currentColor" />
                        </span>
                      )}
                      {model.hidden ? (
                        <Badge tone="warning" size="sm">
                          Hidden
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 p-4 text-center text-xs text-muted-foreground">
                {modelSearch
                  ? "No model matches your filter query."
                  : "No models currently advertised by this driver."}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Routing Rules & Driver Specifications */}
        <div className="flex flex-col gap-6">
          {/* Routing Configuration */}
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Traffic rotation
            </h2>

            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <span className="block text-xs font-medium text-foreground">
                  Round-robin balancing
                </span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Distributes incoming requests evenly across all active
                  accounts.
                </p>
              </div>

              <Button
                variant={provider.round_robin ? "secondary" : "ghost"}
                size="sm"
                onClick={() =>
                  toggleRoundRobinMutation.mutate(!provider.round_robin)
                }
                disabled={toggleRoundRobinMutation.isPending}
                className="shrink-0 text-xs"
              >
                {provider.round_robin ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>

          {/* Upstream Technical Specifications */}
          <div className="space-y-3.5 rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Driver specifications
            </h2>

            <div>
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Default base endpoint
              </span>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1.5">
                <span className="truncate font-mono text-[11px] text-foreground">
                  {provider.default_base_url}
                </span>
                <CopyButton
                  value={provider.default_base_url}
                  iconOnly
                  variant="plain"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Protocol
                </span>
                <span className="mt-1 block font-mono text-xs text-foreground uppercase">
                  {provider.protocol}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  OAuth Required
                </span>
                <span className="mt-1 block text-xs text-foreground">
                  {provider.requires_oauth ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  API Key Required
                </span>
                <span className="mt-1 block text-xs text-foreground">
                  {provider.requires_api_key ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Custom URL
                </span>
                <span className="mt-1 block text-xs text-foreground">
                  {provider.supports_custom_url ? "Supported" : "Fixed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConnectAccountModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        provider={provider}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
