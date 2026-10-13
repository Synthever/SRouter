import { KeyRound } from "lucide-react"

import ActionButton from "@/components/arc/action-button/action-button"
import { FloatingField } from "@/components/arc/floating-field/floating-field"

import useAPIKey from "../hooks/useAPIKey"

type APIKeyPanelProps = {
  flow: ReturnType<typeof useAPIKey>
  connectionName: string
  onConnectionNameChange: (value: string) => void
}

export function APIKeyPanel({
  flow,
  connectionName,
  onConnectionNameChange,
}: APIKeyPanelProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void flow.save()
      }}
      className="space-y-3.5 pt-1"
    >
      <FloatingField
        label="Account label (optional)"
        value={connectionName}
        onChange={(event) => onConnectionNameChange(event.target.value)}
        placeholder="e.g. Primary Production Key"
      />

      <FloatingField
        label="API Key"
        requiredMark
        type="password"
        canTogglePassword
        monospace
        startIcon={<KeyRound size={15} />}
        value={flow.apiKey}
        onChange={(event) => flow.setAPIKey(event.target.value)}
        placeholder="sk-..."
      />

      <FloatingField
        label="Model prefix / alias (optional)"
        monospace
        value={flow.prefix}
        onChange={(event) => flow.setPrefix(event.target.value)}
        placeholder="e.g. custom-prefix"
      />

      <ActionButton
        type="submit"
        label="Save credentials"
        pendingLabel="Saving credentials…"
        successLabel="Saved"
        onAction={flow.save}
        disabled={flow.pending || !flow.apiKey.trim()}
        className="mt-2 h-9 w-full font-medium"
      />
    </form>
  )
}
