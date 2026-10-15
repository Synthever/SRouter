import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ChevronRight, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { addCustomProvider, providersListQuery } from "@/api/providers"
import type { ProviderProtocol } from "@/api/types"
import ActionButton from "@/components/arc/action-button/action-button"
import { Badge } from "@/components/arc/badge/badge"
import { Button } from "@/components/arc/button/button"
import { EmptyState } from "@/components/arc/empty-state/empty-state"
import { MetricCard } from "@/components/arc/metric-card/metric-card"
import SegmentedControl from "@/components/arc/segmented-control/segmented-control"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { SectionHeader } from "@/components/layout/section-header"
import { AddCustomProviderDialog } from "@/components/providers/add-custom-provider-dialog"
import { ProviderLogo } from "@/components/providers/provider-logo"

export const Route = createFileRoute("/_authenticated/providers/")({
  component: ProvidersListPage,
})

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "oauth", label: "OAuth" },
  { id: "api_key", label: "API key" },
  { id: "free_tier", label: "Free tier" },
  { id: "custom_provider", label: "Custom" },
] as const

type CategoryFilter = (typeof CATEGORIES)[number]["id"]
type AddCustomProviderInput = Parameters<typeof addCustomProvider>[0]

const PROTOCOL_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Custom",
} satisfies Record<ProviderProtocol, string>

function categoryLabel(category: string) {
  switch (category) {
    case "oauth":
      return "OAuth"
    case "api_key":
      return "API key"
    case "free_tier":
      return "Free tier"
    case "custom_provider":
      return "Custom"
    default:
      return category.replaceAll("_", " ")
  }
}

function connectionLabel(count: number) {
  return `${count} enabled ${count === 1 ? "connection" : "connections"}`
}

function ProvidersListPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [resultAnnouncement, setResultAnnouncement] = useState("")
  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery(providersListQuery)
  const addProvider = useMutation({ mutationFn: addCustomProvider })
  const providers = data?.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const filteredProviders = providers.filter((provider) => {
    const matchesSearch =
      normalizedSearch === "" ||
      provider.name.toLowerCase().includes(normalizedSearch) ||
      provider.id.toLowerCase().includes(normalizedSearch) ||
      provider.protocol.toLowerCase().includes(normalizedSearch)
    const matchesCategory =
      selectedCategory === "all" || provider.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  const enabledDriverCount = providers.filter(
    (provider) => provider.enabled
  ).length
  const enabledConnectionCount = providers.reduce(
    (total, provider) => total + provider.status.connected_count,
    0
  )
  const categoryOptions = CATEGORIES.map((category) => ({
    value: category.id,
    label: category.label,
    accessory: data ? (
      <span aria-hidden="true" className="text-muted-foreground tabular-nums">
        {category.id === "all"
          ? providers.length
          : providers.filter((provider) => provider.category === category.id)
              .length}
      </span>
    ) : undefined,
  }))

  useEffect(() => {
    if (!data || isFetching) return
    const timer = window.setTimeout(() => {
      const activeFilters = [
        selectedCategory !== "all" ? categoryLabel(selectedCategory) : "",
        normalizedSearch ? `search “${normalizedSearch}”` : "",
      ]
        .filter(Boolean)
        .join(" and ")
      setResultAnnouncement(
        `${filteredProviders.length} of ${providers.length} providers shown${activeFilters ? ` for ${activeFilters}` : ""}.`
      )
    }, 300)
    return () => window.clearTimeout(timer)
  }, [
    data,
    filteredProviders.length,
    isFetching,
    normalizedSearch,
    providers.length,
    selectedCategory,
  ])

  async function refreshProviders() {
    const result = await refetch()
    if (result.error) throw result.error
  }

  async function submitCustomProvider(input: AddCustomProviderInput) {
    const created = await addProvider.mutateAsync(input)
    resetFilters()
    await queryClient.invalidateQueries({ queryKey: ["providers"] })
    toast.success("Custom provider added", {
      description: `${created.name} is now visible in the All providers list.`,
      action: {
        label: "View provider",
        onClick: () => {
          void navigate({
            to: "/providers/$providerId",
            params: { providerId: created.id },
          })
        },
      },
    })
  }

  function resetFilters() {
    setSearch("")
    setSelectedCategory("all")
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Model providers"
        description="Manage model drivers, enabled connections, and custom endpoints."
        actions={
          <>
            <Button
              variant="primary"
              size="md"
              onClick={() => setAddDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Add custom provider</span>
            </Button>
            <ActionButton
              label="Refresh list"
              pendingLabel="Refreshing list"
              successLabel="List updated"
              onAction={refreshProviders}
              className="!border-border !bg-surface !text-foreground"
            />
          </>
        }
      />

      {data && (
        <>
          <section
            aria-label="Provider summary"
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <MetricCard
              label="Registered drivers"
              value={providers.length}
              context="Provider entries in this gateway"
            />
            <MetricCard
              label="Enabled drivers"
              value={enabledDriverCount}
              context="Driver routing flag is on"
            />
            <MetricCard
              label="Enabled connections"
              value={enabledConnectionCount}
              context="Enabled entries across drivers"
            />
          </section>
          <p className="-mt-3 text-xs text-muted-foreground">
            Driver enablement controls routing. Connection totals count enabled
            entries and are not a provider health check.
          </p>
        </>
      )}

      {!data && isLoading && (
        <section
          aria-label="Loading provider summary"
          aria-busy="true"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="min-h-40 rounded-[var(--radius-surface)] border border-border bg-surface p-6 shadow-[var(--shadow-resting)]"
            >
              <div className="mb-8 h-4 w-36 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
              <div className="h-8 w-14 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
              <div className="mt-4 h-4 w-44 max-w-full animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full min-w-0 lg:max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="provider-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search providers"
            aria-label="Search providers"
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-surface pr-3 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 motion-reduce:transition-none"
          />
        </div>
        <SegmentedControl
          label="Filter providers by category"
          value={selectedCategory}
          onValueChange={(value) => {
            const category = CATEGORIES.find((option) => option.id === value)
            if (category) setSelectedCategory(category.id)
          }}
          options={categoryOptions}
          className="max-w-full"
        />
      </div>

      {isError && (
        <section
          role="alert"
          className="border-danger/30 bg-danger/10 flex flex-col gap-3 rounded-[var(--radius-surface)] border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h2 className="text-danger text-sm font-medium">
              {data
                ? "Could not refresh providers"
                : "Could not load providers"}
            </h2>
            <p className="text-danger mt-1 text-xs break-words">
              {error instanceof Error
                ? error.message
                : "The provider list is unavailable."}
              {data ? " Showing the last loaded data." : ""}
            </p>
          </div>
          <ActionButton
            label={data ? "Retry refresh" : "Retry provider list"}
            pendingLabel="Retrying list"
            successLabel="List loaded"
            onAction={refreshProviders}
            className="!border-border !bg-surface !text-foreground"
          />
        </section>
      )}

      {isLoading && !data && (
        <div
          aria-busy="true"
          aria-label="Loading providers"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-[var(--radius-surface)] border border-border bg-surface-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {!isLoading && data && filteredProviders.length === 0 && (
        <EmptyState
          label="Provider results"
          title={
            normalizedSearch || selectedCategory !== "all"
              ? "No matching providers"
              : "No providers yet"
          }
          description={
            normalizedSearch || selectedCategory !== "all"
              ? "Try another search or clear the category filter."
              : "Add a custom endpoint to route requests through your own model service."
          }
          action={
            normalizedSearch || selectedCategory !== "all" ? (
              <Button variant="secondary" size="md" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setAddDialogOpen(true)}
              >
                Add custom provider
              </Button>
            )
          }
        />
      )}

      {!isLoading && data && filteredProviders.length > 0 && (
        <section
          aria-labelledby="provider-list-title"
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="provider-list-title"
              className="text-sm font-medium text-foreground"
            >
              Available providers
            </h2>
            <p className="text-xs text-muted-foreground">
              {filteredProviders.length} of {providers.length} drivers
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map((provider) => (
              <Link
                key={provider.id}
                to="/providers/$providerId"
                params={{ providerId: provider.id }}
                aria-label={`Open settings for ${provider.name}`}
                className="group hover:border-border-strong flex min-w-0 flex-col rounded-[var(--radius-surface)] border border-border bg-surface p-4 transition-colors hover:bg-surface-muted/40 motion-reduce:transition-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProviderLogo
                    providerID={provider.id}
                    size={28}
                    className="shrink-0 text-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {provider.name}
                      </h3>
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {provider.id}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    tone={provider.enabled ? "success" : "neutral"}
                    size="sm"
                  >
                    {provider.enabled ? "Driver enabled" : "Driver disabled"}
                  </Badge>
                  <Badge tone="neutral" size="sm">
                    {connectionLabel(provider.status.connected_count)}
                  </Badge>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>{categoryLabel(provider.category)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{PROTOCOL_LABELS[provider.protocol]}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {resultAnnouncement}
      </p>

      <p role="status" className="sr-only">
        {isFetching ? "Refreshing provider list" : ""}
      </p>

      <AddCustomProviderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={submitCustomProvider}
      />
    </div>
  )
}
