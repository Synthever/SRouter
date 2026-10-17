import { Code2, FileText, Upload, X } from "lucide-react"
import { useRef } from "react"

import ActionButton from "@/components/arc/action-button/action-button"
import { FloatingField } from "@/components/arc/floating-field/floating-field"
import { cn } from "@/lib/utils"

import useTokenImport from "../hooks/useTokenImport"

type TokenFormPanelProps = {
  providerID: string
  flow: ReturnType<typeof useTokenImport>
  connectionName: string
  onConnectionNameChange: (value: string) => void
}

export default function TokenFormPanel({
  providerID,
  flow,
  connectionName,
  onConnectionNameChange,
}: TokenFormPanelProps) {
  // The dropzone is a clickable div rather than a label, so it needs the input
  // element to open the picker. The ref stays here, where the input is rendered.
  const fileInputRef = useRef<HTMLInputElement>(null)
  // The submit button owns the action, so the form only forwards Enter-key
  // submits to it. Without this the button's own click and the form's submit
  // both fire and the token is imported twice.
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const isCodex =
    providerID.toLowerCase().includes("codex") ||
    providerID.toLowerCase().includes("openai")

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const submitter = (event.nativeEvent as SubmitEvent)?.submitter
        if (submitter !== submitButtonRef.current) {
          submitButtonRef.current?.click()
        }
      }}
      className="space-y-3"
    >
      {flow.fileName ? (
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-surface/80 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
              <FileText size={15} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {flow.fileName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {connectionName || "Session credentials loaded"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={flow.clearLoadedFile}
            className="inline-flex cursor-pointer items-center rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Clear loaded file"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            flow.setIsDragging(true)
          }}
          onDragLeave={() => flow.setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            flow.setIsDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) void flow.loadFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition-colors",
            flow.isDragging
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border/80 bg-surface/40 text-muted-foreground hover:border-border hover:bg-surface/70"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void flow.loadFile(file)
              // Clear so picking the same file again still fires a change.
              event.target.value = ""
            }}
            className="sr-only"
          />
          <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-surface-muted/80 text-foreground">
            <Upload size={13} />
          </div>
          <span className="text-xs font-medium text-foreground">
            Upload or drop session file
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            Supports <code className="font-mono">.json</code> or{" "}
            <code className="font-mono">.txt</code> (auto-extracts tokens)
          </span>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <FloatingField
          label="Account label (optional)"
          value={connectionName}
          onChange={(event) => onConnectionNameChange(event.target.value)}
          placeholder="e.g. seaavey@gmail.com"
        />

        <FloatingField
          label="Access token"
          requiredMark
          type="password"
          canTogglePassword
          monospace
          value={flow.accessToken}
          onChange={(event) => {
            const value = event.target.value
            // A whole session dump or JSON pasted into this one field is parsed
            // rather than stored, so the token stays a token.
            const trimmed = value.trim()
            if (
              trimmed.startsWith("{") &&
              (trimmed.includes("access_token") ||
                trimmed.includes("accessToken") ||
                trimmed.includes("token"))
            ) {
              flow.setRawInput(value)
              flow.applySessionText(value)
              return
            }
            flow.setAccessToken(value)
          }}
          placeholder="eyJh... or paste full JSON here"
        />

        {isCodex && (
          <FloatingField
            label="ChatGPT account ID (optional)"
            monospace
            value={flow.accountID}
            onChange={(event) => flow.setAccountID(event.target.value)}
            placeholder="Account UUID from ~/.codex/auth.json"
          />
        )}

        <FloatingField
          label="Refresh token (optional)"
          type="password"
          canTogglePassword
          monospace
          value={flow.refreshToken}
          onChange={(event) => flow.setRefreshToken(event.target.value)}
          placeholder="Token for automatic renewal"
        />
      </div>

      <div className="flex items-center justify-between pt-0.5 text-xs">
        <button
          type="button"
          onClick={() => flow.setMode("raw")}
          className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Code2 size={12} />
          <span>Have raw JSON? Switch to raw mode</span>
        </button>
      </div>

      <ActionButton
        ref={submitButtonRef}
        type="submit"
        label="Import token & connect"
        pendingLabel="Importing token…"
        successLabel="Connected"
        onAction={flow.importToken}
        disabled={flow.pending || !flow.accessToken.trim()}
        className="mt-1 h-9 w-full font-medium"
      />
    </form>
  )
}
