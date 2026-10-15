import SegmentedControl from "@/components/arc/segmented-control/segmented-control"

import TokenFormPanel from "./TokenFormPanel"
import TokenRawPanel from "./TokenRawPanel"
import useTokenImport from "../hooks/useTokenImport"

type TokenImportPanelProps = {
  providerID: string
  flow: ReturnType<typeof useTokenImport>
  connectionName: string
  onConnectionNameChange: (value: string) => void
}

export default function TokenImportPanel({
  providerID,
  flow,
  connectionName,
  onConnectionNameChange,
}: TokenImportPanelProps) {
  const isRaw = flow.mode === "raw"

  return (
    <div className="space-y-3.5 rounded-xl border border-border/80 bg-surface-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {isRaw ? "Raw JSON or text import" : "Direct token import"}
          </span>
          <p className="mt-0.5 truncate text-xs leading-relaxed text-muted-foreground">
            {isRaw
              ? "Paste session JSON dump or token string directly"
              : "Upload credentials file or configure manual fields"}
          </p>
        </div>

        <SegmentedControl
          options={[
            { value: "form", label: "Form & file" },
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
          providerID={providerID}
          flow={flow}
          connectionName={connectionName}
          onConnectionNameChange={onConnectionNameChange}
        />
      )}
    </div>
  )
}
