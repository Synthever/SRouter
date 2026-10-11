import { createFileRoute } from "@tanstack/react-router"
import { Cpu, Download, Radio } from "lucide-react"
import { useState } from "react"

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
    key: "throughput",
    label: "Tokens/sec",
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
  latency: number
  cost: number
}

const MODEL_DATA_24H: ModelMetricRow[] = [
  {
    id: "gpt-4o",
    model: "gpt-4o",
    provider: "OpenAI",
    requests: 48920,
    inputTokens: 18450000,
    outputTokens: 7210000,
    cachedRate: "42.1%",
    latency: 165,
    cost: 11.245,
  },
  {
    id: "claude-3-5-sonnet",
    model: "claude-3-5-sonnet",
    provider: "Anthropic",
    requests: 39180,
    inputTokens: 14200000,
    outputTokens: 6180000,
    cachedRate: "58.4%",
    latency: 182,
    cost: 8.62,
  },
  {
    id: "deepseek-chat",
    model: "deepseek-chat",
    provider: "DeepSeek",
    requests: 18420,
    inputTokens: 7120000,
    outputTokens: 3410000,
    cachedRate: "28.5%",
    latency: 124,
    cost: 1.84,
  },
  {
    id: "gemini-1-5-flash",
    model: "gemini-1.5-flash",
    provider: "Google Gemini",
    requests: 9840,
    inputTokens: 3890000,
    outputTokens: 1420000,
    cachedRate: "19.2%",
    latency: 98,
    cost: 0.745,
  },
  {
    id: "llama-3-2-local",
    model: "llama3.2:3b",
    provider: "Ollama Local",
    requests: 2090,
    inputTokens: 780000,
    outputTokens: 390000,
    cachedRate: "0.0%",
    latency: 45,
    cost: 0.0,
  },
]

const TABLE_COLUMNS: DataColumn<ModelMetricRow>[] = [
  {
    key: "model",
    label: "Model",
    width: 170,
    sortable: true,
    render: (_val, row) => (
      <span className="font-mono text-xs font-medium text-foreground whitespace-nowrap">
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
      <span className="text-foreground tabular-nums whitespace-nowrap">
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
      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
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
      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
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
      <span className="font-medium text-emerald-600 tabular-nums dark:text-emerald-400 whitespace-nowrap">
        {row.cachedRate}
      </span>
    ),
  },
  {
    key: "latency",
    label: "Latency",
    width: 105,
    numeric: true,
    sortable: true,
    render: (_val, row) => (
      <span className="text-foreground tabular-nums whitespace-nowrap">
        {row.latency} ms
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
      <span className="font-medium text-foreground tabular-nums whitespace-nowrap">
        ${row.cost.toFixed(4)}
      </span>
    ),
  },
]

function getChartDataForRange(range: string): LineChartDatum[] {
  if (range === "1h") {
    return [
      {
        key: "t0",
        label: "50m ago",
        axisLabel: "10m",
        values: { throughput: 640, latency: 135 },
      },
      {
        key: "t1",
        label: "40m ago",
        axisLabel: "20m",
        values: { throughput: 790, latency: 142 },
      },
      {
        key: "t2",
        label: "30m ago",
        axisLabel: "30m",
        values: { throughput: 920, latency: 128 },
      },
      {
        key: "t3",
        label: "20m ago",
        axisLabel: "40m",
        values: { throughput: 1150, latency: 132 },
      },
      {
        key: "t4",
        label: "10m ago",
        axisLabel: "50m",
        values: { throughput: 1320, latency: 125 },
      },
      {
        key: "t5",
        label: "Now",
        axisLabel: "Now",
        values: { throughput: 1240, latency: 128 },
      },
    ]
  }

  if (range === "7d") {
    return [
      {
        key: "d1",
        label: "Mon",
        axisLabel: "Mon",
        values: { throughput: 880, latency: 162 },
      },
      {
        key: "d2",
        label: "Tue",
        axisLabel: "Tue",
        values: { throughput: 1040, latency: 155 },
      },
      {
        key: "d3",
        label: "Wed",
        axisLabel: "Wed",
        values: { throughput: 1250, latency: 148 },
      },
      {
        key: "d4",
        label: "Thu",
        axisLabel: "Thu",
        values: { throughput: 1410, latency: 140 },
      },
      {
        key: "d5",
        label: "Fri",
        axisLabel: "Fri",
        values: { throughput: 1320, latency: 144 },
      },
      {
        key: "d6",
        label: "Sat",
        axisLabel: "Sat",
        values: { throughput: 750, latency: 120 },
      },
      {
        key: "d7",
        label: "Sun",
        axisLabel: "Sun",
        values: { throughput: 820, latency: 125 },
      },
    ]
  }

  // Default 24h
  return [
    {
      key: "h00",
      label: "00:00",
      axisLabel: "00:00",
      values: { throughput: 420, latency: 110 },
    },
    {
      key: "h04",
      label: "04:00",
      axisLabel: "04:00",
      values: { throughput: 310, latency: 98 },
    },
    {
      key: "h08",
      label: "08:00",
      axisLabel: "08:00",
      values: { throughput: 850, latency: 135 },
    },
    {
      key: "h12",
      label: "12:00",
      axisLabel: "12:00",
      values: { throughput: 1420, latency: 158 },
    },
    {
      key: "h16",
      label: "16:00",
      axisLabel: "16:00",
      values: { throughput: 1680, latency: 172 },
    },
    {
      key: "h20",
      label: "20:00",
      axisLabel: "20:00",
      values: { throughput: 1290, latency: 142 },
    },
    {
      key: "h24",
      label: "Current",
      axisLabel: "Now",
      values: { throughput: 1240, latency: 138 },
    },
  ]
}

function OverviewPage() {
  const [range, setRange] = useState<string>("24h")
  const chartData = getChartDataForRange(range)

  const requestCount =
    range === "1h"
      ? 4820
      : range === "24h"
        ? 118450
        : range === "7d"
          ? 824100
          : 3410800

  const latencyP50 =
    range === "1h" ? 128 : range === "24h" ? 142 : range === "7d" ? 154 : 148

  const tokenVelocity =
    range === "1h" ? 840 : range === "24h" ? 1240 : range === "7d" ? 1180 : 1310

  const spendCost =
    range === "1h"
      ? 2.4
      : range === "24h"
        ? 24.18
        : range === "7d"
          ? 168.4
          : 724.8

  const handleExport = () => {
    toast.success("Telemetry report exported")
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 min-w-0 max-w-full overflow-hidden">
      <SectionHeader
        title="Gateway overview"
        description="Live operational telemetry, model routing status, and traffic throughput."
        badge="Cluster healthy"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <SegmentedControl
              options={RANGE_OPTIONS}
              value={range}
              onValueChange={setRange}
            />
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">Export</span>
              <span className="inline xs:hidden sm:hidden">Export</span>
            </Button>
          </div>
        }
      />

      {/* KPI Row using UIARC MetricCard */}
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
        aria-label="Key gateway telemetry numbers"
      >
        <MetricCard
          label="Total requests"
          value={requestCount}
          change="+14.2%"
          context="vs previous period"
        />
        <MetricCard
          label="Response latency"
          value={latencyP50}
          suffix=" ms"
          change="-8.5%"
          context="median upstream time"
        />
        <MetricCard
          label="Token velocity"
          value={tokenVelocity}
          suffix=" t/s"
          change="+22.1%"
          context="streaming throughput"
        />
        <MetricCard
          label="Estimated spend"
          value={spendCost}
          prefix="$"
          decimals={2}
          change="+5.4%"
          context="catalog billed total"
        />
      </section>

      {/* Traffic Trend Section using UIARC LineChart */}
      <section
        className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs min-w-0"
        aria-label="Gateway throughput over time"
      >
        <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-foreground shrink-0" aria-hidden="true" />
            <h2 className="text-xs font-semibold tracking-tight text-foreground">
              Throughput and latency trends
            </h2>
          </div>
          <span className="font-mono text-[11px] sm:text-xs text-muted-foreground">
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
        className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs min-w-0"
        aria-label="Top active models"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu size={15} className="text-foreground shrink-0" aria-hidden="true" />
            <h2 className="text-xs font-semibold tracking-tight text-foreground">
              Model performance breakdown
            </h2>
          </div>
          <Badge tone="neutral" size="sm">
            5 models active
          </Badge>
        </div>

        {MODEL_DATA_24H.length === 0 ? (
          <EmptyState
            title="No model metrics recorded"
            description="Active proxy statistics will populate as completions are routed."
          />
        ) : (
          <div className="w-full min-w-0">
            <SortableDataTable
              rows={MODEL_DATA_24H}
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
