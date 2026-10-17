import { KeyRound } from "lucide-react"
import { useRef } from "react"

import ActionButton from "@/components/arc/action-button/action-button"
import { Badge } from "@/components/arc/badge/badge"
import { FloatingField } from "@/components/arc/floating-field/floating-field"
import SegmentedControl from "@/components/arc/segmented-control/segmented-control"
import { Textarea } from "@/components/ui/textarea"

import useAPIKey from "../hooks/useAPIKey"

type APIKeyPanelProps = {
  flow: ReturnType<typeof useAPIKey>
  connectionName: string
  onConnectionNameChange: (value: string) => void
}

const KEY_MODE_OPTIONS = [
  { value: "single", label: "Single key" },
  { value: "bulk", label: "Bulk keys" },
]

export default function APIKeyPanel({
  flow,
  connectionName,
  onConnectionNameChange,
}: APIKeyPanelProps) {
  // The submit button owns the action, so the form only forwards Enter-key
  // submits to it. Without this the button's own click and the form's submit
  // both fire and the request goes out twice.
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const keyCount = flow.activeKeys.length
  const actionLabel =
    flow.mode === "bulk" && keyCount > 1
      ? `Save ${keyCount} API keys`
      : "Save credentials"

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const submitter = (event.nativeEvent as SubmitEvent)?.submitter
        if (submitter !== submitButtonRef.current) {
          submitButtonRef.current?.click()
        }
      }}
      className="space-y-3.5 pt-1"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          Credential input
        </span>
        <SegmentedControl
          label="API key input mode"
          options={KEY_MODE_OPTIONS}
          value={flow.mode}
          onValueChange={(value) => {
            if (value === "single" || value === "bulk") {
              flow.setMode(value)
            }
          }}
        />
      </div>

      <FloatingField
        label={
          flow.mode === "bulk"
            ? "Account label prefix (optional)"
            : "Account label (optional)"
        }
        value={connectionName}
        onChange={(event) => onConnectionNameChange(event.target.value)}
        placeholder={
          flow.mode === "bulk"
            ? "e.g. Production pool"
            : "e.g. Primary production key"
        }
      />

      {flow.mode === "single" ? (
        <FloatingField
          label="API key"
          requiredMark
          type="password"
          canTogglePassword
          monospace
          startIcon={<KeyRound size={15} />}
          value={flow.apiKey}
          onChange={(event) => flow.setAPIKey(event.target.value)}
          placeholder="sk-..."
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <Textarea
            aria-label="Bulk API keys"
            rows={5}
            value={flow.bulkKeysRaw}
            onChange={(event) => flow.setBulkKeysRaw(event.target.value)}
            placeholder={"sk-key-1...\nsk-key-2...\nsk-key-3..."}
            className="font-mono text-xs"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              One API key per line or comma-separated.
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                tone={flow.bulkParsed.keys.length > 0 ? "info" : "neutral"}
                size="sm"
              >
                {flow.bulkParsed.keys.length}{" "}
                {flow.bulkParsed.keys.length === 1 ? "key" : "keys"} ready
              </Badge>
              {flow.bulkParsed.duplicateCount > 0 && (
                <Badge tone="warning" size="sm">
                  {flow.bulkParsed.duplicateCount}{" "}
                  {flow.bulkParsed.duplicateCount === 1
                    ? "duplicate"
                    : "duplicates"}{" "}
                  skipped
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <FloatingField
        label="Model prefix / alias (optional)"
        monospace
        value={flow.prefix}
        onChange={(event) => flow.setPrefix(event.target.value)}
        placeholder="e.g. custom-prefix"
      />

      <ActionButton
        ref={submitButtonRef}
        type="submit"
        label={actionLabel}
        pendingLabel="Saving credentials…"
        successLabel="Saved"
        onAction={flow.save}
        disabled={flow.pending || keyCount === 0}
        className="mt-2 h-9 w-full font-medium"
      />
    </form>
  )
}
