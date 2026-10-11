import { createFileRoute } from "@tanstack/react-router"

import { SectionHeader } from "@/components/layout/section-header"

export const Route = createFileRoute("/_authenticated/providers")({
  component: ProvidersPage,
})

const PROVIDERS = [
  {
    name: "OpenAI",
    status: "Connected",
    models: "gpt-4o, gpt-4o-mini, o1",
    type: "Upstream driver",
  },
  {
    name: "Anthropic",
    status: "Connected",
    models: "claude-3-5-sonnet, claude-3-5-haiku",
    type: "Upstream driver",
  },
  {
    name: "Google Gemini",
    status: "Connected",
    models: "gemini-1.5-pro, gemini-1.5-flash",
    type: "Upstream driver",
  },
  {
    name: "DeepSeek",
    status: "Connected",
    models: "deepseek-chat, deepseek-reasoner",
    type: "Upstream driver",
  },
  {
    name: "Ollama local",
    status: "Standby",
    models: "llama3.2, mistral, qwen2.5",
    type: "Local runtime",
  },
  {
    name: "Custom vendor",
    status: "Configurable",
    models: "Regex resolution",
    type: "Custom driver",
  },
]

function ProvidersPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Model providers"
        description="Configured LLM backends, upstream drivers, and model routing rules."
        badge="6 drivers registered"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((p) => (
          <div
            key={p.name}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-foreground/20"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {p.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.status === "Connected"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${p.status === "Connected" ? "bg-emerald-500" : "bg-muted-foreground"}`}
                  />
                  {p.status}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {p.type}
              </span>
            </div>
            <div className="mt-4 border-t border-border/60 pt-3">
              <span className="text-[10px] font-medium text-muted-foreground">
                Supported models
              </span>
              <p className="mt-1 truncate font-mono text-[11px] text-foreground/80">
                {p.models}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
