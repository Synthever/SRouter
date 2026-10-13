import { ExternalLink, Info, ShieldCheck, X, Clipboard } from "lucide-react"

import ActionButton from "@/components/arc/action-button/action-button"
import { Button } from "@/components/arc/button/button"
import { CopyButton } from "@/components/arc/copy-button/copy-button"
import { FloatingField } from "@/components/arc/floating-field/floating-field"

import useOAuthFlow from "../hooks/useOAuthFlow"

type OAuthPanelProps = {
  flow: ReturnType<typeof useOAuthFlow>
}

export function OAuthPanel({ flow }: OAuthPanelProps) {
  const {
    oauthData,
    callbackInput,
    setCallbackInput,
    pending,
    start,
    pasteCallback,
    complete,
    reset,
  } = flow

  if (!oauthData) {
    return (
      <div className="space-y-3.5 rounded-xl border border-border/80 bg-surface-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck size={16} aria-hidden="true" />
          </div>
          <div className="text-xs">
            <span className="block font-medium text-foreground">
              Vendor Sign-in Portal
            </span>
            <span className="mt-1 block leading-relaxed text-muted-foreground">
              Click below to generate a secure PKCE session and open the
              official provider login portal in a new browser tab.
            </span>
          </div>
        </div>

        <ActionButton
          label="Open login window"
          pendingLabel="Opening login window…"
          successLabel="Window opened"
          onAction={start}
          className="h-9 w-full font-medium"
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void complete()
      }}
      className="space-y-3.5 rounded-xl border border-border/80 bg-surface-muted/30 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-500">
            ✓
          </div>
          <span className="text-xs font-semibold text-foreground">
            Paste callback URL or code
          </span>
        </div>

        <div className="inline-flex items-center rounded-full border border-border/80 bg-surface/90 px-1.5 py-0.5 shadow-xs backdrop-blur-xs">
          <CopyButton
            value={oauthData.authorize_url}
            label="Copy link"
            variant="plain"
          />

          <div className="mx-0.5 h-3 w-px bg-border/80" aria-hidden="true" />

          <a
            href={oauthData.authorize_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            title="Reopen authorization window in browser"
          >
            <ExternalLink size={12} />
            <span>Re-open</span>
          </a>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-surface/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Info
          size={14}
          className="mt-0.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          After approving in OpenAI, your browser redirects to port 1455. If the
          resulting tab shows <em>&quot;Unable to connect&quot;</em>, simply
          copy the URL from your browser address bar and paste it below:
        </span>
      </div>

      <FloatingField
        label="Callback URL or authorization code"
        value={callbackInput}
        onChange={(event) => setCallbackInput(event.target.value)}
        monospace
        endAction={
          callbackInput ? (
            <button
              type="button"
              onClick={() => setCallbackInput("")}
              className="inline-flex cursor-pointer items-center p-1 text-muted-foreground hover:text-foreground"
              title="Clear input"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={pasteCallback}
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-border/70 bg-surface-muted/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              title="Paste from clipboard"
            >
              <Clipboard size={11} />
              <span>Paste</span>
            </button>
          )
        }
      />

      <div className="flex items-center gap-2 pt-1">
        <ActionButton
          type="submit"
          label="Confirm & connect"
          pendingLabel="Verifying…"
          successLabel="Connected"
          onAction={complete}
          disabled={pending || !callbackInput.trim()}
          className="h-9 flex-1 font-medium"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={pending}
          className="h-9"
        >
          Reset
        </Button>
      </div>
    </form>
  )
}
