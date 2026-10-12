import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Cpu, Download, Radio } from "lucide-react"
import { useMemo, useState } from "react"

import { analyticsQuery, type AnalyticsWindow, useLogEvents } from "@/api/logs"
import { Badge } from "@/components/arc/badge/badge"
import { Button } from "@/components/arc/button/button"
import { EmptyState } from "@/components/arc/empty-state/empty-state"
import {
  LineChart,
  type LineChartDatum,
  type LineChartSeries,
} from "@/components/arc/line-chart/line-chart"
import { MetricCard } from "@/components/arc/metric-card/metric-card"
import SegmentedControl from "@/components/arc/segmented-control/segmented-control"
import {
  SortableDataTable,
  type DataColumn,
} from "@/components/arc/sortable-data-table/sortable-data-table"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { SectionHeader } from "@/components/layout/section-header"

export const Route = createFileRoute("/_authenticated/")({
  component: OverviewPage,
})

const RANGE_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
]

type Metric = "requests" | "latency"

const METRIC_OPTIONS = [
  { value: "requests", label: "Requests" },
  { value: "latency", label: "Latency" },
]

/** The question the plot answers, in the terms the operator asks it. It follows
 * the metric switch, so the heading always names what is actually drawn. */
const WINDOW_QUESTIONS: Record<Metric, Record<AnalyticsWindow, string>> = {
  requests: {
    "1h": "How many requests per minute, past hour?",
    "24h": "How many requests per hour, past day?",
    "7d": "How many requests per 6 hours, past week?",
    "30d": "How many requests per day, past month?",
  },
  latency: {
    "1h": "How slow was the upstream per minute, past hour?",
    "24h": "How slow was the upstream per hour, past day?",
    "7d": "How slow was the upstream per 6 hours, past week?",
    "30d": "How slow was the upstream per day, past month?",
  },
}

/**
 * Both series come from the same window and the same rows, so they are
 * comparable; the metric switch exists because they share one axis and a few
 * dozen requests plotted against a two-second latency flattens the request line
 * into the baseline, where it reads as an axis rather than as data.
 */
const SERIES: LineChartSeries[] = [
  { key: "requests", label: "Requests", area: true },
  { key: "latency", label: "Latency", dashed: true },
]

interface ModelMetricRow extends Record<string, unknown> {
  id: string
  model: string
  provider: string
  requests: number
  tokens: number
  cachedRate: string
  cost: number
}

const TABLE_COLUMNS: DataColumn<ModelMetricRow>[] = [
  {
    key: "model",
    label: "Model",
    width: 180,
    sortable: true,
    render: (_val, row) => (
      <span className="font-mono text-xs font-medium whitespace-nowrap text-foreground">
        {row.model}
      </span>
    ),
  },
  {
    key: "provider",
    label: "Provider",
    width: 140,
    sortable: true,
    render: (_val, row) => (
      <Badge tone="neutral" size="sm" className="whitespace-nowrap">
        {row.provider}
      </Badge>
    ),
  },
  {
    key: "requests",
    label: "Requests",
    width: 110,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="whitespace-nowrap text-foreground tabular-nums">
        {row.requests.toLocaleString()}
      </span>
    ),
  },
  {
    key: "tokens",
    label: "Tokens",
    width: 130,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {row.tokens.toLocaleString()}
      </span>
    ),
  },
  {
    key: "cachedRate",
    label: "Prompt cache",
    width: 125,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
        {row.cachedRate}
      </span>
    ),
  },
  {
    key: "cost",
    label: "Est. cost",
    width: 115,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
        ${row.cost.toFixed(2)}
      </span>
    ),
  },
]

export function OverviewPage() {
  const [range, setRange] = useState<AnalyticsWindow>("24h")
  const [metric, setMetric] = useState<Metric>("requests")

  const {
    data: analytics,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery(analyticsQuery(range))
  const { isConnected, status: sseStatus, lastLog } = useLogEvents()

  // Every figure on this page reads the analytics window, so the KPI row, the
  // plot, and the table cannot disagree about the period they describe.
  const totalRequests = analytics?.total_requests ?? 0
  const latencyP95 = analytics?.p95_latency_ms ?? 0
  const windowCost = analytics?.est_cost ?? 0
  // `error_rate` is a fraction (0.073 means 7.3%), so it is scaled for display;
  // `requests_per_second` was dropped from this row because the server derives
  // it from the last 60 seconds, so it was the one card that did not answer the
  // selected range.
  const errorRate = (analytics?.error_rate ?? 0) * 100

  const chartData: LineChartDatum[] = useMemo(() => {
    if (!analytics?.buckets || analytics.buckets.length === 0) {
      return []
    }

    const buckets = analytics.buckets
    const count = buckets.length

    return buckets.map((bucket, index) => {
      const date = new Date(bucket.bucket_start)
      let label: string
      let axisLabel: string | undefined

      if (range === "1h") {
        label = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
        if (index % 12 === 0 || index === count - 1) {
          axisLabel = label
        }
      } else if (range === "24h") {
        label = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
        if (index % 4 === 0 || index === count - 1) {
          axisLabel = label
        }
      } else if (range === "7d") {
        label = `${date.toLocaleDateString([], { weekday: "short" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        if (index % 4 === 0 || index === count - 1) {
          axisLabel = date.toLocaleDateString([], { weekday: "short" })
        }
      } else {
        label = date.toLocaleDateString([], { month: "short", day: "numeric" })
        if (index % 5 === 0 || index === count - 1) {
          axisLabel = label
        }
      }

      return {
        key: String(bucket.bucket_start),
        label,
        axisLabel,
        values: {
          requests: bucket.total_requests,
          latency: Math.round(bucket.avg_latency_ms ?? 0),
        },
      }
    })
  }, [analytics, range])

  const modelRows: ModelMetricRow[] = useMemo(() => {
    if (!analytics?.top_models) {
      return []
    }

    return analytics.top_models.map((item, index) => {
      const model = item.model ?? "unknown"
      // Prompt is the denominator: cached reads are a subset of it, whereas
      // `total_tokens` also carries the completion, so the rate would sink as
      // the answer grows.
      const cachedRate =
        item.prompt_tokens > 0
          ? `${((item.cached_tokens / item.prompt_tokens) * 100).toFixed(1)}%`
          : "0.0%"

      return {
        id: `${index}-${model}-${item.provider_id}`,
        model,
        provider: item.provider_id,
        requests: item.total_requests,
        tokens: item.total_tokens,
        cachedRate,
        // SUM() over zero rows is NULL, not zero, so the row's own null is the
        // honest value for "no logged cost in this window".
        cost: item.est_cost ?? 0,
      }
    })
  }, [analytics])

  const handleExport = () => {
    const exportPayload = {
      exported_at: new Date().toISOString(),
      window: range,
      analytics,
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `srouter-telemetry-${range}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Telemetry report exported")
  }

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-5 overflow-hidden sm:gap-6">
      <SectionHeader
        title="Gateway overview"
        description="Live operational telemetry, model routing status, and traffic throughput."
        badge={
          isConnected
            ? "Live stream active"
            : sseStatus === "connecting"
              ? "Connecting..."
              : "Stream idle"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <SegmentedControl
              options={RANGE_OPTIONS}
              value={range}
              onValueChange={(val) => setRange(val as AnalyticsWindow)}
              label="Time range"
            />
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} aria-hidden="true" />
              <span>Export</span>
            </Button>
          </div>
        }
      />

      {isError ? (
        <section
          className="min-w-0 rounded-[var(--radius-surface)] border border-border bg-card p-4 shadow-[var(--shadow-resting)] sm:p-5"
          aria-label="Gateway telemetry unavailable"
        >
          <EmptyState
            title="Could not load gateway telemetry"
            description={`The analytics endpoint did not answer (${error instanceof Error ? error.message : "unknown error"}). The gateway may still be serving traffic; this screen only lost its read path.`}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        </section>
      ) : (
        <>
          {/* KPI Row using UIARC MetricCard */}
          <section
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            aria-label={`Key gateway telemetry, past ${range}`}
          >
            <MetricCard
              label="Requests"
              value={totalRequests}
              context={`past ${range}`}
            />
            <MetricCard
              label="P95 latency"
              value={latencyP95}
              suffix=" ms"
              context="upstream response time"
            />
            <MetricCard
              label="Error rate"
              value={errorRate}
              suffix="%"
              decimals={1}
              context={`failed requests, past ${range}`}
            />
            <MetricCard
              label="Est. spend"
              value={windowCost}
              prefix="$"
              // Cents are the smallest unit anyone acts on; four decimals on a
              // currency figure reads as leaked float precision, not data.
              decimals={2}
              context={`past ${range}`}
            />
          </section>

          {/* Traffic Trend Section using UIARC LineChart */}
          <section
            className="min-w-0 rounded-[var(--radius-surface)] border border-border bg-card p-4 shadow-[var(--shadow-resting)] sm:p-5"
            aria-label="Gateway throughput over time"
          >
            <div className="mb-4 flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Radio
                  size={15}
                  className="shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <h2 className="text-xs font-semibold tracking-tight text-foreground">
                  {WINDOW_QUESTIONS[metric][range]}
                </h2>
              </div>
              <SegmentedControl
                options={METRIC_OPTIONS}
                value={metric}
                onValueChange={(value) => setMetric(value as Metric)}
                label="Chart metric"
              />
            </div>

            <div className="w-full min-w-0 overflow-hidden">
              <LineChart
                data={chartData}
                series={SERIES}
                hiddenSeries={
                  metric === "requests" ? ["latency"] : ["requests"]
                }
                label="Gateway telemetry"
                height={240}
                loading={isPending}
                emptyLabel="No requests recorded in this window"
                legend={false}
              />
            </div>
          </section>

          {/* Model Breakdown Section using UIARC SortableDataTable */}
          <section
            className="min-w-0 rounded-[var(--radius-surface)] border border-border bg-card p-4 shadow-[var(--shadow-resting)] sm:p-5"
            aria-label="Top active models"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Cpu
                  size={15}
                  className="shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <h2 className="text-xs font-semibold tracking-tight text-foreground">
                  Models routed, past {range}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {lastLog && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Latest: {lastLog.model ?? "request"} ({lastLog.status_code})
                  </span>
                )}
                <Badge tone="neutral" size="sm">
                  {modelRows.length === 1
                    ? "1 model active"
                    : `${modelRows.length} models active`}
                </Badge>
              </div>
            </div>

            {modelRows.length === 0 ? (
              <EmptyState
                title={
                  isPending
                    ? "Reading the request log"
                    : "No requests recorded in this window"
                }
                description={
                  isPending
                    ? "Loading per-model telemetry for the selected range."
                    : "Per-model performance populates automatically as completions are routed through SRouter. Widen the range above to look further back."
                }
              />
            ) : (
              <div className="w-full min-w-0">
                <SortableDataTable
                  rows={modelRows}
                  columns={TABLE_COLUMNS}
                  rowKey="id"
                  caption={`Active model performance, past ${range}`}
                  defaultSort={{ key: "requests", direction: "desc" }}
                />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
