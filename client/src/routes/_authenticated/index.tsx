import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Cpu, Download, Radio } from "lucide-react"
import { useMemo, useState } from "react"

import {
  analyticsQuery,
  type AnalyticsWindow,
  usageStatsQuery,
  useLogEvents,
} from "@/api/logs"
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

const RANGE_OPTIONS = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
]

const CHART_SERIES: LineChartSeries[] = [
  {
    key: "requests",
    label: "Requests",
    area: true,
  },
  {
    key: "latency",
    label: "Latency (ms)",
    dashed: true,
  },
]

interface ModelMetricRow extends Record<string, unknown> {
  id: string
  model: string
  provider: string
  requests: number
  inputTokens: number
  outputTokens: number
  cachedRate: string
  cost: number
}

function inferProvider(model: string): string {
  const lower = model.toLowerCase()
  if (
    lower.startsWith("gpt-") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("text-embedding") ||
    lower.startsWith("dall-e")
  ) {
    return "OpenAI"
  }
  if (lower.startsWith("claude")) {
    return "Anthropic"
  }
  if (lower.startsWith("gemini")) {
    return "Google Gemini"
  }
  if (lower.startsWith("deepseek")) {
    return "DeepSeek"
  }
  if (lower.startsWith("grok")) {
    return "xAI"
  }
  if (
    lower.startsWith("qwen") ||
    lower.startsWith("llama") ||
    lower.startsWith("mistral") ||
    lower.includes(":")
  ) {
    return "Local / Ollama"
  }
  return "Gateway"
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
    key: "inputTokens",
    label: "Input tokens",
    width: 130,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {row.inputTokens.toLocaleString()}
      </span>
    ),
  },
  {
    key: "outputTokens",
    label: "Output tokens",
    width: 130,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {row.outputTokens.toLocaleString()}
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
      <span className="font-medium whitespace-nowrap text-emerald-600 tabular-nums dark:text-emerald-400">
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
        ${row.cost.toFixed(4)}
      </span>
    ),
  },
]

export function OverviewPage() {
  const [range, setRange] = useState<AnalyticsWindow>("24h")

  const { data: stats } = useQuery(usageStatsQuery)
  const { data: analytics } = useQuery(analyticsQuery(range))
  const { isConnected, status: sseStatus, lastLog } = useLogEvents()

  const totalRequests =
    analytics?.total_requests ?? stats?.data.totals.requests.total ?? 0
  const latencyP95 = analytics?.p95_latency_ms ?? 0
  const requestVelocity = analytics?.requests_per_second ?? 0
  const totalCost = stats?.data.totals.cost.total ?? 0
  const windowCost =
    analytics?.top_models.reduce((acc, m) => acc + (m.est_cost ?? 0), 0) ?? 0
  const spendValue = windowCost > 0 ? windowCost : totalCost

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
    if (analytics?.top_models && analytics.top_models.length > 0) {
      return analytics.top_models.map((item) => {
        const modelName = item.model ?? "unknown"
        const statMatch = stats?.data.by_model.find(
          (m) => m.model === modelName
        )
        const inputTokens = statMatch?.total_input_tokens ?? 0
        const outputTokens = statMatch?.total_output_tokens ?? 0
        const cachedTokens = statMatch?.total_cached_tokens ?? 0
        const totalPrompt = inputTokens + cachedTokens
        const cachedRate =
          totalPrompt > 0
            ? `${((cachedTokens / totalPrompt) * 100).toFixed(1)}%`
            : "0.0%"

        return {
          id: modelName,
          model: modelName,
          provider: inferProvider(modelName),
          requests: item.total_requests,
          inputTokens:
            inputTokens > 0 ? inputTokens : Math.round(item.total_tokens * 0.7),
          outputTokens:
            outputTokens > 0
              ? outputTokens
              : Math.round(item.total_tokens * 0.3),
          cachedRate,
          cost:
            typeof item.est_cost === "number"
              ? item.est_cost
              : (statMatch?.est_cost ?? 0),
        }
      })
    }

    if (stats?.data.by_model && stats.data.by_model.length > 0) {
      return stats.data.by_model.map((item) => {
        const totalPrompt = item.total_input_tokens + item.total_cached_tokens
        const cachedRate =
          totalPrompt > 0
            ? `${((item.total_cached_tokens / totalPrompt) * 100).toFixed(1)}%`
            : "0.0%"

        return {
          id: item.model,
          model: item.model,
          provider: inferProvider(item.model),
          requests: item.total_requests,
          inputTokens: item.total_input_tokens,
          outputTokens: item.total_output_tokens,
          cachedRate,
          cost: item.est_cost ?? 0,
        }
      })
    }

    return []
  }, [analytics, stats])

  const handleExport = () => {
    const exportPayload = {
      exported_at: new Date().toISOString(),
      window: range,
      analytics,
      stats,
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
            />
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} aria-hidden="true" />
              <span>Export</span>
            </Button>
          </div>
        }
      />

      {/* KPI Row using UIARC MetricCard */}
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        aria-label="Key gateway telemetry numbers"
      >
        <MetricCard
          label="Total requests"
          value={totalRequests}
          context={
            stats?.data.totals.requests.failed
              ? `${stats.data.totals.requests.failed} failures recorded`
              : `Window: past ${range}`
          }
        />
        <MetricCard
          label="P95 latency"
          value={latencyP95}
          suffix=" ms"
          context="upstream response time"
        />
        <MetricCard
          label="Request velocity"
          value={requestVelocity}
          suffix=" req/s"
          decimals={2}
          context="average throughput"
        />
        <MetricCard
          label="Estimated spend"
          value={spendValue}
          prefix="$"
          decimals={4}
          context={
            windowCost > 0
              ? "window estimated cost"
              : (stats?.data.totals.cost.label ?? "catalog billed total")
          }
        />
      </section>

      {/* Traffic Trend Section using UIARC LineChart */}
      <section
        className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
        aria-label="Gateway throughput over time"
      >
        <div className="mb-4 flex flex-col gap-1.5 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Radio
              size={15}
              className="shrink-0 text-foreground"
              aria-hidden="true"
            />
            <h2 className="text-xs font-semibold tracking-tight text-foreground">
              Throughput and latency trends
            </h2>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground sm:text-xs">
            {range === "1h"
              ? "Window: past 60 minutes"
              : range === "24h"
                ? "Window: past 24 hours"
                : range === "7d"
                  ? "Window: past 7 days"
                  : "Window: past 30 days"}
          </span>
        </div>

        <div className="w-full min-w-0 overflow-hidden">
          <LineChart
            data={chartData}
            series={CHART_SERIES}
            label="Gateway telemetry"
            height={240}
            unit=""
          />
        </div>
      </section>

      {/* Model Breakdown Section using UIARC SortableDataTable */}
      <section
        className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
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
              Model performance breakdown
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
            title="No requests recorded yet"
            description="Proxy telemetry and active model performance will populate automatically as completions are routed through SRouter."
          />
        ) : (
          <div className="w-full min-w-0">
            <SortableDataTable
              rows={modelRows}
              columns={TABLE_COLUMNS}
              rowKey="id"
              caption="Active model performance statistics"
              defaultSort={{ key: "requests", direction: "desc" }}
            />
          </div>
        )}
      </section>
    </div>
  )
}
