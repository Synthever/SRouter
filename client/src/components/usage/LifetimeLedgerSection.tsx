import type { UsageStatsReport } from "@/api/types"
import { ActionButton } from "@/components/arc/action-button/action-button"
import { EmptyState } from "@/components/arc/empty-state/empty-state"
import { Skeleton } from "@/components/arc/skeleton/skeleton"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { COMPACT, NUMBER } from "./types"

export interface LifetimeLedgerSectionProps {
  usageData?: UsageStatsReport
  isPending: boolean
  isError: boolean
  error: Error | null
  onRetry: () => Promise<void>
}

export function LifetimeLedgerSection({
  usageData,
  isPending,
  isError,
  error,
  onRetry,
}: LifetimeLedgerSectionProps) {
  return (
    <section
      className="min-w-0 rounded-[var(--radius-surface)] border border-border bg-card p-4 shadow-[var(--shadow-resting)] sm:p-5"
      aria-label="Lifetime ledger"
    >
      <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium tracking-tight text-foreground">
          Lifetime ledger
        </h2>
        <span className="text-xs text-muted-foreground">
          Database totals since first initialization
        </span>
      </div>

      {isPending ? (
        <div
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4, 5].map((slot) => (
            <div
              key={slot}
              className="rounded-lg border border-border/60 bg-surface-muted/20 p-3"
            >
              <Skeleton label="Loading lifetime totals" lines={2} />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="pt-4">
          <EmptyState
            title="Could not load lifetime totals"
            description={`The usage stats endpoint did not answer (${error instanceof Error ? error.message : "unknown error"}).`}
            action={
              <ActionButton
                label="Retry"
                pendingLabel="Retrying"
                successLabel="Retried"
                onAction={onRetry}
                onActionError={() =>
                  toast.error("Lifetime totals are still unavailable")
                }
              />
            }
          />
        </div>
      ) : (
        usageData && (
          /* Responsive ledger breakdown:
             Mobile (<640px): 1 col (clean cards)
             Tablet (sm: 640px+): 2 cols
             Laptop (lg: 1024px+): 3 cols
             Desktop (xl: 1280px+): 6 cols
          */
          <dl className="mt-3.5 grid animate-in grid-cols-1 gap-3 duration-300 fade-in-0 motion-reduce:animate-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg border border-border/70 bg-surface-muted/25 p-3">
              <dt className="text-xs text-muted-foreground">Requests</dt>
              <dd className="mt-1 text-base font-medium text-foreground tabular-nums">
                {NUMBER.format(usageData.data.totals.requests.total)}
                <span className="mt-1 block text-xs font-normal text-muted-foreground tabular-nums">
                  {NUMBER.format(usageData.data.totals.requests.success)} ok ·{" "}
                  {NUMBER.format(usageData.data.totals.requests.failed)} err
                </span>
              </dd>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-muted/25 p-3">
              <dt className="text-xs text-muted-foreground">Input tokens</dt>
              <dd className="mt-1 text-base font-medium text-foreground tabular-nums">
                {COMPACT.format(usageData.data.totals.tokens.input)}
                <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                  Prompt & cached
                </span>
              </dd>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-muted/25 p-3">
              <dt className="text-xs text-muted-foreground">Output tokens</dt>
              <dd className="mt-1 text-base font-medium text-foreground tabular-nums">
                {COMPACT.format(usageData.data.totals.tokens.output)}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {NUMBER.format(usageData.data.totals.tokens.reasoning)}{" "}
                  reasoning
                </span>
              </dd>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-muted/25 p-3">
              <dt className="text-xs text-muted-foreground">Cached reads</dt>
              <dd className="mt-1 text-base font-medium text-foreground tabular-nums">
                {COMPACT.format(usageData.data.totals.tokens.cache.read)}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {NUMBER.format(usageData.data.totals.tokens.cache.write)}{" "}
                  writes
                </span>
              </dd>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-muted/25 p-3">
              <dt className="text-xs text-muted-foreground">Estimated spend</dt>
              <dd className="mt-1 text-base font-medium text-foreground tabular-nums">
                {usageData.data.totals.cost.total === null
                  ? "—"
                  : usageData.data.totals.cost.label}
                <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                  {usageData.data.totals.cost.estimated
                    ? "Catalog rate"
                    : "Provider reported"}
                </span>
              </dd>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-muted/25 p-3">
              <dt className="text-xs text-muted-foreground">Model IDs</dt>
              <dd className="mt-1 text-base font-medium text-foreground tabular-nums">
                {usageData.data.by_model.length}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Distinct models
                </span>
              </dd>
            </div>
          </dl>
        )
      )}
    </section>
  )
}
