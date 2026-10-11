import { createFileRoute, useSearch } from "@tanstack/react-router"
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  KeyRound,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/arc/badge/badge"
import type { DashboardTab } from "@/components/layout/sidebar"

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
})

function StatCard({
  title,
  value,
  caption,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  caption: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  trend?: string
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-foreground/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {title}
        </span>
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/5 text-foreground dark:bg-white/10">
          <Icon size={15} />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          {trend && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {trend}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  description,
  badge,
}: {
  title: string
  description: string
  badge?: string
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {badge && (
        <Badge tone="neutral" size="sm" className="self-start sm:self-auto">
          {badge}
        </Badge>
      )}
    </div>
  )
}

function OverviewSurface() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Gateway Overview"
        description="Live operational telemetry, model routing status, and traffic throughput."
        badge="Active Cluster"
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Providers"
          value="9 / 9"
          caption="OpenAI, Anthropic, Gemini & custom"
          icon={Cpu}
          trend="Healthy"
        />
        <StatCard
          title="Request Latency"
          value="142 ms"
          caption="p50 upstream response time"
          icon={Clock}
          trend="-12ms"
        />
        <StatCard
          title="Streaming Throughput"
          value="1.2k t/s"
          caption="Token generation velocity"
          icon={Zap}
        />
        <StatCard
          title="Database Storage"
          value="SQLite v4"
          caption="WAL mode · Auto-migrated"
          icon={Database}
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gateway Architecture Panel */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-foreground" />
              <h3 className="text-xs font-semibold tracking-tight text-foreground uppercase">
                Gateway Engine Pipeline
              </h3>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Proxy Online
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Radio size={14} className="text-muted-foreground" />
                <span>OpenAI Wire</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                /v1/chat/completions
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>SSE Streaming</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Layers size={14} className="text-muted-foreground" />
                <span>Anthropic Wire</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                /v1/messages
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>Format Translator</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <ShieldCheck size={14} className="text-muted-foreground" />
                <span>Operator Layer</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                /v1/admin/*
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>CSRF & Session Guard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & System Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3.5">
            <ShieldCheck size={16} className="text-foreground" />
            <h3 className="text-xs font-semibold tracking-tight text-foreground uppercase">
              Security Matrix
            </h3>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between border-b border-border/50 py-1">
              <span className="text-muted-foreground">Operator Session</span>
              <span className="font-medium text-foreground">
                HttpOnly Cookie (7d)
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 py-1">
              <span className="text-muted-foreground">CSRF Protection</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Origin Guard Enforced
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 py-1">
              <span className="text-muted-foreground">Rate Limiting</span>
              <span className="font-medium text-foreground">
                Adaptive Token Bucket
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Database Backend</span>
              <span className="font-mono text-[11px] text-foreground">
                srouter.db (SQLite 3)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProvidersSurface() {
  const providers = [
    {
      name: "OpenAI",
      status: "Connected",
      models: "gpt-4o, gpt-4o-mini, o1",
      type: "Upstream Driver",
    },
    {
      name: "Anthropic",
      status: "Connected",
      models: "claude-3-5-sonnet, claude-3-5-haiku",
      type: "Upstream Driver",
    },
    {
      name: "Google Gemini",
      status: "Connected",
      models: "gemini-1.5-pro, gemini-1.5-flash",
      type: "Upstream Driver",
    },
    {
      name: "DeepSeek",
      status: "Connected",
      models: "deepseek-chat, deepseek-reasoner",
      type: "Upstream Driver",
    },
    {
      name: "Ollama / Local",
      status: "Standby",
      models: "llama3.2, mistral, qwen2.5",
      type: "Local Runtime",
    },
    {
      name: "Custom Vendor",
      status: "Configurable",
      models: "Per-model regex resolution",
      type: "Custom Driver",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Model Providers"
        description="Configured LLM backends, upstream drivers, and routing rules."
        badge="6 Drivers Loaded"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <div
            key={p.name}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-foreground/20"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {p.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.status === "Connected"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${p.status === "Connected" ? "bg-emerald-500" : "bg-muted-foreground"}`}
                  />
                  {p.status}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {p.type}
              </span>
            </div>
            <div className="mt-4 border-t border-border/60 pt-3">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Models
              </span>
              <p className="mt-1 truncate font-mono text-[11px] text-foreground/80">
                {p.models}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsageSurface() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Usage & Quota Telemetry"
        description="Aggregated token statistics, inference cost estimations, and quota reservations."
        badge="Live Metrics"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Tokens Processed"
          value="48,290,120"
          caption="Input: 32.1M · Output: 16.1M"
          icon={BarChart3}
        />
        <StatCard
          title="Estimated Incurred Cost"
          value="$24.18"
          caption="Calculated from vendor catalog pricing"
          icon={Zap}
        />
        <StatCard
          title="Cached Prompt Tokens"
          value="12.4M"
          caption="Saved ~38% on prompt cost"
          icon={Layers}
          trend="+38% efficiency"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        Live streaming telemetry charts are connected. Request metrics
        automatically update as gateway traffic flows through
        `/v1/chat/completions`.
      </div>
    </div>
  )
}

function LogsSurface() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Request Logs"
        description="Audit trail of every proxied LLM inference call logged directly into SQLite."
        badge="SQLite Request Stream"
      />

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Terminal size={15} className="text-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Recent Gateway Activity
          </span>
        </div>
        <div className="divide-y divide-border/50 text-xs">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                200 OK
              </span>
              <span className="font-mono text-foreground">
                POST /v1/chat/completions
              </span>
              <span className="text-muted-foreground">
                gpt-4o · 1,420 tokens
              </span>
            </div>
            <span className="font-mono text-muted-foreground">
              182ms · Just now
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                200 OK
              </span>
              <span className="font-mono text-foreground">
                POST /v1/messages
              </span>
              <span className="text-muted-foreground">
                claude-3-5-sonnet · 2,890 tokens
              </span>
            </div>
            <span className="font-mono text-muted-foreground">
              245ms · 2m ago
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                200 OK
              </span>
              <span className="font-mono text-foreground">
                POST /v1/chat/completions
              </span>
              <span className="text-muted-foreground">
                deepseek-reasoner · 850 tokens
              </span>
            </div>
            <span className="font-mono text-muted-foreground">
              310ms · 5m ago
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function KeysSurface() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="API Keys Management"
        description="Issue, rotate, and restrict client authentication keys with rate & quota limits."
        badge="Access Control"
      />

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Active Keys
            </span>
          </div>
          <button
            type="button"
            className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
          >
            Create New Key
          </button>
        </div>
        <div className="divide-y divide-border/50 text-xs">
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="font-medium text-foreground">
                Default Production Key
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                sr-prod-9a8f...4e1b
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Rate limit: 120 req/m
              </span>
              <Badge tone="success" size="sm">
                Active
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="font-medium text-foreground">
                Internal Development Key
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                sr-dev-3f2a...9c8d
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Rate limit: 30 req/m
              </span>
              <Badge tone="success" size="sm">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSurface() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Gateway Settings"
        description="Configure admin credentials, SQLite storage backups, and network parameters."
        badge="System Config"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Lock size={15} className="text-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Admin Authentication
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The admin password protects operator surfaces including key issuance
            and database recovery.
          </p>
          <div className="mt-4">
            <button
              type="button"
              className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60"
            >
              Update Admin Password
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Database size={15} className="text-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Database Storage & Backup
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Database location:{" "}
            <code className="font-mono text-[11px] text-foreground">
              $HOME/.srouter/srouter.db
            </code>{" "}
            (SQLite Schema Version 4).
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60"
            >
              Export Database
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const search = useSearch({ from: "/_authenticated" })
  const activeTab: DashboardTab = search.tab ?? "overview"

  switch (activeTab) {
    case "overview":
      return <OverviewSurface />
    case "providers":
      return <ProvidersSurface />
    case "usage":
      return <UsageSurface />
    case "logs":
      return <LogsSurface />
    case "keys":
      return <KeysSurface />
    case "settings":
      return <SettingsSurface />
    default: {
      const exhaustive: never = activeTab
      throw new Error(`Unhandled tab: ${String(exhaustive)}`)
    }
  }
}
