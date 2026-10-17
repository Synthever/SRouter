import { KeyRound } from "lucide-react"
import { useRef } from "react"

import ActionButton from "@/components/arc/action-button/action-button"
import { FloatingField } from "@/components/arc/floating-field/floating-field"

import useAPIKey from "../hooks/useAPIKey"

type APIKeyPanelProps = {
  flow: ReturnType<typeof useAPIKey>
  connectionName: string
  onConnectionNameChange: (value: string) => void
}

export default function APIKeyPanel({
  flow,
  connectionName,
  onConnectionNameChange,
}: APIKeyPanelProps) {
  // The submit button owns the action, so the form only forwards Enter-key
  // submits to it. Without this the button's own click and the form's submit
  // both fire and the request goes out twice.
  const submitButtonRef = useRef<HTMLButtonElement>(null)

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
      <FloatingField
        label="Account label (optional)"
        value={connectionName}
        onChange={(event) => onConnectionNameChange(event.target.value)}
        placeholder="e.g. Primary production key"
      />

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
