import SegmentedControl from "@/components/arc/segmented-control/segmented-control"

import { TokenFormPanel } from "./token-form-panel"
import { TokenRawPanel } from "./token-raw-panel"
import useTokenImport from "../hooks/useTokenImport"

type TokenImportPanelProps = {
  flow: ReturnType<typeof useTokenImport>
  connectionName: string
  onConnectionNameChange: (value: string) => void
}

export function TokenImportPanel({
  flow,
  connectionName,
  onConnectionNameChange,
}: TokenImportPanelProps) {
  const isRaw = flow.mode === "raw"

  return (
    <div className="space-y-3.5 rounded-xl border border-border/80 bg-surface-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-foreground">
            {isRaw ? "Raw JSON / Text Import" : "Direct Token Import"}
          </span>
          <p className="mt-0.5 truncate text-[11px] leading-relaxed text-muted-foreground">
            {isRaw
              ? "Paste session JSON dump or token string directly"
              : "Upload credentials file or configure manual fields"}
          </p>
        </div>

        <SegmentedControl
          options={[
            { value: "form", label: "Form & File" },
            { value: "raw", label: "Raw JSON" },
          ]}
          value={flow.mode}
          onValueChange={(val) => flow.setMode(val as "form" | "raw")}
        />
      </div>

      {isRaw ? (
        <TokenRawPanel flow={flow} />
      ) : (
        <TokenFormPanel
          flow={flow}
          connectionName={connectionName}
          onConnectionNameChange={onConnectionNameChange}
        />
      )}
    </div>
  )
}
