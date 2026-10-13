import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ChevronRight, RefreshCw, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { providersListQuery } from "@/api/providers"
import { Badge } from "@/components/arc/badge/badge"
import { Button } from "@/components/arc/button/button"
import { EmptyState } from "@/components/arc/empty-state/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { ProviderLogo } from "@/components/providers/provider-logo"

export const Route = createFileRoute("/_authenticated/providers/")({
  component: ProvidersListPage,
})

type CategoryFilter =
  "all" | "oauth" | "api_key" | "free_tier" | "custom_provider"

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All drivers" },
  { id: "oauth", label: "OAuth" },
  { id: "api_key", label: "API Key" },
  { id: "free_tier", label: "Free Tier" },
  { id: "custom_provider", label: "Custom" },
]

function ProvidersListPage() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all")

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery(providersListQuery)

  const providers = useMemo(() => data?.data ?? [], [data?.data])

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.protocol.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" || p.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [providers, search, selectedCategory])

  const liveCount = useMemo(() => {
    return providers.reduce((acc, p) => acc + p.status.connected_count, 0)
  }, [providers])

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Model providers"
        description="Configured LLM backends, upstream drivers, and model routing rules."
        badge={`${providers.length} drivers (${liveCount} live)`}
        actions={
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
        }
      />

      {/* Toolbar: Search & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers or driver ID..."
            className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-foreground ${
                  isSelected
                    ? "bg-foreground font-semibold text-background"
                    : "border border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-lg bg-surface-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 rounded bg-surface-muted" />
                  <div className="h-3 w-20 rounded bg-surface-muted" />
                </div>
              </div>
              <div className="h-5 w-14 rounded-full bg-surface-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="border-danger/30 bg-danger/10 rounded-xl border p-5 text-center">
          <p className="text-danger text-sm font-medium">
            Failed to load model providers:{" "}
            {error instanceof Error ? error.message : "Network error"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            className="mt-3"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredProviders.length === 0 && (
        <EmptyState
          title="No providers found"
          description={
            search || selectedCategory !== "all"
              ? "No model provider matches your search query or selected filter."
              : "No provider drivers registered in the gateway."
          }
          action={
            search || selectedCategory !== "all" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setSelectedCategory("all")
                }}
              >
                Reset filters
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Provider List / Grid */}
      {!isLoading && !isError && filteredProviders.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => {
            const isLive = provider.status.connected_count > 0

            return (
              <div
                key={provider.id}
                className="group relative flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 transition-all duration-150 focus-within:ring-2 focus-within:ring-foreground/20 hover:border-foreground/30 hover:bg-surface-muted/30 sm:p-4"
              >
                {/* Left side: Vendor logo box + Titles */}
                <div className="flex min-w-0 items-center gap-3.5 pr-2">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface-muted text-foreground shadow-2xs">
                    <ProviderLogo providerId={provider.id} size={20} />
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium tracking-tight text-foreground group-hover:text-foreground">
                      {provider.name}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {provider.id}
                    </span>
                  </div>
                </div>

                {/* Right side: Live badge & interactive link */}
                <div className="flex shrink-0 items-center gap-2">
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

                  <ChevronRight
                    size={15}
                    className="text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </div>

                {/* Full-card accessible overlay link */}
                <Link
                  to="/providers/$providerId"
                  params={{ providerId: provider.id }}
                  className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-foreground"
                  aria-label={`Open settings for ${provider.name}`}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
