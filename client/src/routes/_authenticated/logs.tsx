import { createFileRoute } from "@tanstack/react-router"
import { Terminal } from "lucide-react"

import { SectionHeader } from "@/components/layout/section-header"

export const Route = createFileRoute("/_authenticated/logs")({
  component: LogsPage,
})

function LogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Request logs"
        description="Audit trail of every proxied inference call recorded in SQLite."
        badge="SQLite request stream"
      />

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Terminal size={15} className="text-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold text-foreground">
            Recent gateway activity
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
                gpt-4o, 1,420 tokens
              </span>
            </div>
            <span className="font-mono text-muted-foreground">
              182 ms, just now
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
                claude-3-5-sonnet, 2,890 tokens
              </span>
            </div>
            <span className="font-mono text-muted-foreground">
              245 ms, 2m ago
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
                deepseek-reasoner, 850 tokens
              </span>
            </div>
            <span className="font-mono text-muted-foreground">
              310 ms, 5m ago
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
