import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import type { RequestLog } from "@/api/types"
import { Badge } from "@/components/arc/badge/badge"
import { motionTokens } from "@/components/arc/lib/motion-tokens"
import {
  formatCostUSD,
  LATENCY,
  NUMBER,
  RELATIVE_TIME,
  statusTone,
} from "./types"

export interface LogListProps {
  logs: RequestLog[]
  liveLogIDs?: Set<string>
  onSelectLog: (log: RequestLog) => void
}

export function LogList({ logs, liveLogIDs, onSelectLog }: LogListProps) {
  const reduced = useReducedMotion()

  return (
    <ul className="divide-y divide-border/60">
      {logs.map((log) => {
        const tone = statusTone(log.status_code)
        const totalTokens = log.tokens.total ?? 0
        const modelName = log.resolved_model ?? log.model ?? "—"
        const isFresh = Boolean(liveLogIDs?.has(log.id))
        const costStr = formatCostUSD(log.costs?.total)

        // Row uses semantic div + stretched button to avoid invalid nested <Link> inside <button>
        const rowContent = (
          <div className="group relative flex w-full flex-col gap-2 rounded-lg p-3 text-left transition-colors hover:bg-surface-muted/40">
            {/* Clickable surface covering the row for opening sheet */}
            <button
              type="button"
              onClick={() => onSelectLog(log)}
              className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-lg focus-visible:ring-1 focus-visible:ring-foreground focus-visible:outline-none"
              aria-label={`View log details for ${log.method} ${log.path}`}
            />

            {/* Row Top: Status badge, Method, Path, Latency & Relative time */}
            <div className="pointer-events-none relative z-10 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Badge tone={tone} size="sm" className="font-mono font-medium">
                  {log.status_code}
                </Badge>
                <span className="font-mono text-xs font-medium text-foreground">
                  {log.method}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {log.path}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="tabular-nums">{LATENCY(log.latency_ms)}</span>
                <span>·</span>
                <span>{RELATIVE_TIME(log.created_at)}</span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Row Bottom: Model, Provider, Tokens, Cost */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pointer-events-none max-w-[12rem] truncate font-mono font-medium text-foreground sm:max-w-xs">
                  {modelName}
                </span>
                {log.provider && (
                  <Link
                    to="/providers/$providerId"
                    params={{ providerId: log.provider }}
                    className="group/badge relative z-20 inline-flex rounded-[var(--radius-pill)] transition-transform duration-150 ease-out focus-visible:ring-1 focus-visible:ring-foreground focus-visible:outline-none active:scale-95"
                  >
                    <Badge
                      tone="neutral"
                      size="sm"
                      className="cursor-pointer transition-colors group-hover/badge:border-foreground/30 group-hover/badge:bg-surface-muted"
                    >
                      {log.provider}
                    </Badge>
                  </Link>
                )}
                {log.error_code && (
                  <span className="pointer-events-none font-medium text-danger">
                    [{log.error_code}]
                  </span>
                )}
              </div>

              <div className="pointer-events-none flex items-center gap-3 tabular-nums">
                {totalTokens > 0 && (
                  <span>{NUMBER.format(totalTokens)} tokens</span>
                )}
                {costStr && (
                  <span className="font-medium text-foreground">{costStr}</span>
                )}
              </div>
            </div>
          </div>
        )

        // Only animate fresh incoming live-streamed items, initial 50 items render static without expensive blur filter
        if (isFresh && !reduced) {
          return (
            <motion.li
              key={log.id}
              initial={{
                opacity: 0,
                x: -20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                ...motionTokens.spring.smooth,
                opacity: { duration: motionTokens.duration.standard },
              }}
            >
              {rowContent}
            </motion.li>
          )
        }

        return <li key={log.id}>{rowContent}</li>
      })}
    </ul>
  )
}
