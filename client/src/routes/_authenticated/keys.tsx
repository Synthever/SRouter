import { createFileRoute } from "@tanstack/react-router"
import { KeyRound } from "lucide-react"

import { Badge } from "@/components/arc/badge/badge"
import { Button } from "@/components/arc/button/button"
import { SectionHeader } from "@/components/layout/section-header"

export const Route = createFileRoute("/_authenticated/keys")({
  component: KeysPage,
})

function KeysPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="API keys management"
        description="Issue, rotate, and restrict client authentication keys with rate and quota limits."
        badge="Access control"
      />

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <KeyRound
              size={15}
              className="text-foreground"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-foreground">
              Active keys
            </span>
          </div>
          <Button variant="primary" size="sm">
            Create API key
          </Button>
        </div>
        <div className="divide-y divide-border/50 text-xs">
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="font-medium text-foreground">
                Default production key
              </p>
              <p className="font-mono text-xs text-muted-foreground">
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
                Internal development key
              </p>
              <p className="font-mono text-xs text-muted-foreground">
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
