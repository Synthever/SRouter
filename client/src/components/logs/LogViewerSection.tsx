import { ChevronLeft, ChevronRight, Terminal } from "lucide-react"

import type { Pagination, RequestLog } from "@/api/types"
import { ActionButton } from "@/components/arc/action-button/action-button"
import { Button } from "@/components/arc/button/button"
import { EmptyState } from "@/components/arc/empty-state/empty-state"
import SegmentedControl from "@/components/arc/segmented-control/segmented-control"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { LogDetailSheet } from "./LogDetailSheet"
import { LogList } from "./LogList"
import { LogRowPlaceholders } from "./LogPlaceholders"
import { NUMBER, STATUS_FILTER_OPTIONS, type LogStatusFilter } from "./types"

export interface LogViewerSectionProps {
  logs: RequestLog[]
  liveLogIDs?: Set<string>
  pagination: Pagination | null
  page: number
  onPageChange: (newPage: number) => void
  statusFilter: LogStatusFilter
  onStatusFilterChange: (newFilter: LogStatusFilter) => void
  isPending: boolean
  isError: boolean
  error: Error | null
  selectedLog: RequestLog | null
  onSelectLog: (log: RequestLog | null) => void
  onRefresh: () => Promise<void>
}

export function LogViewerSection({
  logs,
  liveLogIDs,
  pagination,
  page,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  isPending,
  isError,
  error,
  selectedLog,
  onSelectLog,
  onRefresh,
}: LogViewerSectionProps) {
  const totalPages = pagination?.total_pages ?? 1
  const totalCount = pagination?.total ?? logs.length

  return (
    <>
      <section
        className="min-w-0 rounded-[var(--radius-surface)] border border-border bg-card p-4 shadow-[var(--shadow-resting)] sm:p-5"
        aria-label="Gateway Request Logs"
      >
        {/* Controls Toolbar: Title & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
          <div className="flex items-center gap-2">
            <Terminal
              size={16}
              className="shrink-0 text-foreground"
              aria-hidden="true"
            />
            <h2 className="text-sm font-medium tracking-tight text-foreground">
              Recent gateway activity
            </h2>
            <span className="text-xs text-muted-foreground">
              ({NUMBER.format(totalCount)})
            </span>
          </div>

          <SegmentedControl
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onValueChange={(val) =>
              onStatusFilterChange(val as LogStatusFilter)
            }
            label="Filter status"
          />
        </div>

        {/* Content State */}
        {isPending ? (
          <div className="pt-2">
            <LogRowPlaceholders rows={7} />
          </div>
        ) : isError ? (
          <div className="pt-4">
            <EmptyState
              title="Could not load logs"
              description={`The logs endpoint did not answer (${error ? error.message : "unknown error"}).`}
              action={
                <ActionButton
                  label="Retry"
                  pendingLabel="Retrying"
                  successLabel="Retried"
                  onAction={onRefresh}
                  onActionError={() =>
                    toast.error("Logs are still unavailable")
                  }
                />
              }
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="pt-4">
            <EmptyState
              title="No logs recorded yet"
              description="Proxied inference requests will appear here once the gateway serves traffic."
            />
          </div>
        ) : (
          <div className="pt-1">
            <LogList
              logs={logs}
              liveLogIDs={liveLogIDs}
              onSelectLog={onSelectLog}
            />
          </div>
        )}

        {/* Pagination Footer */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-3.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {page} of {totalPages} ({NUMBER.format(totalCount)} logs
              total)
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isPending}
                onClick={() => onPageChange(page - 1)}
                className="gap-1"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={() => onPageChange(page + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Detail BottomSheet */}
      <LogDetailSheet log={selectedLog} onClose={() => onSelectLog(null)} />
    </>
  )
}
