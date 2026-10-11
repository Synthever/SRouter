import { createFileRoute } from "@tanstack/react-router"
import { Database, Lock } from "lucide-react"

import { Button } from "@/components/arc/button/button"
import { SectionHeader } from "@/components/layout/section-header"

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Gateway settings"
        description="Configure admin credentials, SQLite storage backups, and network parameters."
        badge="System config"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Lock size={15} className="text-foreground" aria-hidden="true" />
            <span className="text-xs font-semibold text-foreground">
              Admin authentication
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The admin password protects operator surfaces including key issuance
            and database recovery.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm">
              Change master password
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Database
              size={15}
              className="text-foreground"
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-foreground">
              Database storage and backup
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Database path:{" "}
            <code className="font-mono text-[11px] text-foreground">
              $HOME/.srouter/srouter.db
            </code>{" "}
            (SQLite schema version 4).
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm">
              Export database
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
