import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Code2,
  Info,
  X,
} from "lucide-react"

import ActionButton from "@/components/arc/action-button/action-button"
import { Button } from "@/components/arc/button/button"
import { Textarea } from "@/components/ui/textarea"

import useTokenImport from "../hooks/useTokenImport"

type TokenRawPanelProps = {
  flow: ReturnType<typeof useTokenImport>
}

export function TokenRawPanel({ flow }: TokenRawPanelProps) {
  const { rawInput, setRawInput, rawParsed, pending } = flow

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void flow.importRaw()
      }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Code2 size={13} className="text-primary" />
          <span>Session Dump JSON / Token</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={flow.pasteRaw}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-border/80 bg-surface px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Paste from clipboard"
          >
            <Clipboard size={11} />
            <span>Paste</span>
          </button>
          {rawInput && (
            <button
              type="button"
              onClick={() => setRawInput("")}
              className="inline-flex cursor-pointer items-center rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              title="Clear"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <Textarea
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
        placeholder={`{\n  "accessToken": "eyJhbGciOi...",\n  "account": {\n    "id": "3d908c60-5f30-4826-b0ff-2dd574002ad4"\n  },\n  "user": {\n    "email": "seaavey@gmail.com"\n  }\n}`}
        rows={6}
        className="max-h-[220px] min-h-[130px] resize-y rounded-lg border-border/80 bg-surface/80 p-2.5 font-mono text-[11px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/40"
      />

      {rawInput.trim() ? (
        rawParsed ? (
          <div className="space-y-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>Valid Credentials Detected</span>
              </div>
              {rawParsed.name && (
                <span className="max-w-[180px] truncate rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300">
                  {rawParsed.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5 text-[10.5px] text-muted-foreground">
              <div className="truncate">
                <span>Token: </span>
                <span className="font-mono font-medium text-foreground">
                  {rawParsed.accessToken.slice(0, 8)}...
                  {rawParsed.accessToken.slice(-6)}
                </span>
              </div>
              <div className="truncate">
                <span>Account: </span>
                <span className="font-mono font-medium text-foreground">
                  {rawParsed.accountID
                    ? `${rawParsed.accountID.slice(0, 8)}...`
                    : "From token claim"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>
              No valid{" "}
              <code className="font-mono font-semibold">accessToken</code>{" "}
              found. Please ensure JSON syntax or token string is correct.
            </span>
          </div>
        )
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-surface/50 p-2 text-[10.5px] leading-relaxed text-muted-foreground">
          <Info size={13} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Paste the complete JSON from{" "}
            <code className="font-mono text-foreground">
              cat ~/.codex/auth.json
            </code>{" "}
            or browser storage. SRouter will auto-extract all fields.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <ActionButton
          type="submit"
          label="Import Raw & Connect"
          pendingLabel="Importing…"
          successLabel="Connected"
          onAction={flow.importRaw}
          disabled={pending || !rawParsed}
          className="h-9 flex-1 font-medium"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={flow.applyRawToForm}
          disabled={pending || !rawParsed}
          className="h-9 px-3 text-xs"
          title="Transfer parsed values into form fields"
        >
          Edit in Form
        </Button>
      </div>
    </form>
  )
}
