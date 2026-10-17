import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowUp,
  Eraser,
  FlaskConical,
  LoaderCircle,
  OctagonX,
  Settings2,
} from "lucide-react"

import {
  streamPlaygroundChat,
  type PlaygroundMessage,
  type PlaygroundStreamEvent,
  type PlaygroundUsage,
} from "@/api/playground"
import { modelListQuery } from "@/api/models"
import { Badge } from "@/components/arc/badge/badge"
import { Button } from "@/components/arc/button/button"
import { CopyButton } from "@/components/arc/copy-button/copy-button"
import { EmptyState } from "@/components/arc/empty-state/empty-state"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { Tooltip } from "@/components/arc/tooltip/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { PlaygroundModelPicker } from "@/components/playground/PlaygroundModelPicker"

const HISTORY_LIMIT = 40
const MAX_TOKENS_PRESETS = [128, 512, 2048] as const

type ChatEntry = {
  id: number
  role: "user" | "assistant"
  content: string
  /** Streaming state: the entry is still receiving deltas. */
  streaming?: boolean
  usage?: PlaygroundUsage
  error?: string
  latencyMs?: number
}

function formatUsage(usage: PlaygroundUsage | undefined): string | null {
  if (!usage?.total_tokens) return null
  const parts = [
    usage.prompt_tokens !== undefined ? `${usage.prompt_tokens} in` : null,
    usage.completion_tokens !== undefined
      ? `${usage.completion_tokens} out`
      : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : `${usage.total_tokens} tokens`
}

/**
 * One conversation bubble, memoized: a streaming delta re-renders only the
 * assistant entry actually receiving text, so long threads stay smooth while
 * tokens arrive. Non-streaming entries keep a stable reference via `memo`'s
 * shallow prop compare — `usage`/`content` objects are replaced only when
 * patched, never mutated.
 */
const PlaygroundMessageItem = memo(function PlaygroundMessageItem({
  entry,
}: {
  entry: ChatEntry
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${
        entry.role === "user" ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          entry.role === "user"
            ? "bg-foreground/10 text-foreground"
            : "border border-border bg-surface-muted/40 text-foreground"
        }`}
      >
        {entry.content.length > 0 ? (
          entry.content
        ) : entry.streaming ? (
          <LoaderCircle
            size={14}
            className="animate-spin text-muted-foreground"
            aria-label="Assistant is responding"
          />
        ) : null}
        {entry.error && (
          <span className="mt-1 block text-xs text-danger">{entry.error}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
        {entry.role === "assistant" && !entry.streaming && (
          <>
            {entry.latencyMs !== undefined && <span>{entry.latencyMs} ms</span>}
            {formatUsage(entry.usage) && (
              <span>· {formatUsage(entry.usage)}</span>
            )}
            {entry.content && (
              <CopyButton value={entry.content} iconOnly variant="plain" />
            )}
          </>
        )}
        {entry.role === "user" && entry.content && (
          <CopyButton value={entry.content} iconOnly variant="plain" />
        )}
      </div>
    </div>
  )
})

/**
 * Operator chat console: pick any model the gateway advertises and talk to it
 * directly. Requests ride the admin session like every other screen; streams
 * are aborted client-side by the Stop button, which cancels the upstream call.
 */
export function PlaygroundView() {
  const modelsQuery = useQuery(modelListQuery)
  const [model, setModel] = useState<string | null>(null)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [maxTokens, setMaxTokens] = useState<number>(512)
  const [temperature, setTemperature] = useState(1)
  const [input, setInput] = useState("")
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [streamingModel, setStreamingModel] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const nextID = useRef(1)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const models = useMemo(() => modelsQuery.data?.data ?? [], [modelsQuery.data])

  const effectiveModel = model ?? models[0]?.id ?? null

  const appendEntry = useCallback((entry: Omit<ChatEntry, "id">) => {
    const id = nextID.current++
    setEntries((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), { ...entry, id }])
    return id
  }, [])

  const patchEntry = useCallback((id: number, patch: Partial<ChatEntry>) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    )
  }, [])

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [])

  // Streaming deltas land in quick bursts; scrolling on every one forces
  // synchronous layout each frame. Pin to bottom only while the operator is
  // already reading the tail (they can scroll up to inspect mid-answer).
  const followRef = useRef(true)
  useEffect(() => {
    const node = scrollRef.current
    if (node) {
      const onScroll = () => {
        followRef.current =
          node.scrollHeight - node.scrollTop - node.clientHeight < 48
      }
      node.addEventListener("scroll", onScroll, { passive: true })
      return () => node.removeEventListener("scroll", onScroll)
    }
  }, [])

  const maybeScrollToBottom = useCallback(() => {
    if (followRef.current) requestAnimationFrame(scrollToBottom)
  }, [scrollToBottom])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const send = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt || !effectiveModel || streamingModel) return

    const userEntry = appendEntry({ role: "user", content: prompt })
    const assistantEntry = appendEntry({
      role: "assistant",
      content: "",
      streaming: true,
    })
    setInput("")
    setStreamingModel(effectiveModel)
    requestAnimationFrame(scrollToBottom)
    const history: PlaygroundMessage[] = []
    if (systemPrompt.trim()) {
      history.push({ role: "system", content: systemPrompt.trim() })
    }
    for (const entry of entries) {
      if (entry.error || entry.streaming) continue
      history.push({ role: entry.role, content: entry.content })
    }
    history.push({ role: "user", content: prompt })

    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = performance.now()

    const onEvent = (event: PlaygroundStreamEvent) => {
      if (event.type === "delta") {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === assistantEntry
              ? { ...entry, content: entry.content + event.text }
              : entry
          )
        )
        maybeScrollToBottom()
      } else {
        patchEntry(assistantEntry, {
          streaming: false,
          usage: event.usage,
          latencyMs: Math.round(performance.now() - startedAt),
        })
      }
    }

    try {
      await streamPlaygroundChat(
        {
          model: effectiveModel,
          messages: history,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        },
        controller.signal,
        onEvent
      )
      patchEntry(assistantEntry, {
        streaming: false,
        latencyMs: Math.round(performance.now() - startedAt),
      })
    } catch (err) {
      const aborted = controller.signal.aborted
      if (aborted) {
        patchEntry(assistantEntry, {
          streaming: false,
          latencyMs: Math.round(performance.now() - startedAt),
        })
      } else {
        patchEntry(assistantEntry, {
          streaming: false,
          error:
            err instanceof Error ? err.message : "The gateway rejected the chat",
        })
        toast.error(`Chat failed for ${effectiveModel}`, {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    } finally {
      abortRef.current = null
      setStreamingModel(null)
      patchEntry(userEntry, {})
    }
  }, [
    input,
    effectiveModel,
    streamingModel,
    entries,
    maxTokens,
    temperature,
    systemPrompt,
    appendEntry,
    patchEntry,
    scrollToBottom,
    maybeScrollToBottom,
  ])

  const clear = useCallback(() => {
    stop()
    setEntries([])
  }, [stop])

  const isStreaming = streamingModel !== null

  return (
    <div className="flex min-h-0 flex-col gap-5 lg:flex-row lg:gap-6">
      {/* Conversation column */}
      <div className="flex min-h-[60vh] flex-1 flex-col gap-3 lg:min-h-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Badge tone={isStreaming ? "info" : "neutral"} size="sm">
              {isStreaming ? "Streaming" : "Idle"}
            </Badge>
            {effectiveModel && (
              <span className="truncate font-mono text-xs text-muted-foreground">
                {effectiveModel}
              </span>
            )}
          </div>
          <Tooltip content="Clear the conversation">
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={entries.length === 0}
              className="h-7 px-2 text-xs"
            >
              <Eraser size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </Tooltip>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[var(--radius-panel)] border border-border bg-surface p-4"
        >
          {entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                label="Model playground"
                title="No messages yet"
                description="Pick a model on the right, type a prompt below, and the gateway routes it live. Streaming responses appear here token by token."
              />
            </div>
          ) : (
            entries.map((entry) => (
              <PlaygroundMessageItem key={entry.id} entry={entry} />
            ))
          )}
        </div>

        <div className="rounded-[var(--radius-panel)] border border-border bg-surface p-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            placeholder={
              effectiveModel
                ? `Message ${effectiveModel}… (Enter to send, Shift+Enter for a new line)`
                : "Register or enable a model first"
            }
            rows={3}
            disabled={!effectiveModel}
            className="text-sm"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {maxTokens} max tokens · temp {temperature.toFixed(1)}
            </span>
            {isStreaming ? (
              <Button variant="danger" size="sm" onClick={stop}>
                <OctagonX size={13} aria-hidden="true" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => void send()}
                disabled={!input.trim() || !effectiveModel}
              >
                <ArrowUp size={13} aria-hidden="true" />
                <span>Send</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Settings column */}
      <div className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
        <div className="rounded-[var(--radius-panel)] border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Model</h2>
          </div>
          <PlaygroundModelPicker
            models={models}
            isPending={modelsQuery.isPending}
            effectiveModel={effectiveModel}
            onSelect={setModel}
          />
        </div>

        <div className="rounded-[var(--radius-panel)] border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Parameters</h2>
          </div>

          <label
            htmlFor="playground-system"
            className="mt-3 block text-xs font-medium text-foreground"
          >
            System prompt
          </label>
          <Textarea
            id="playground-system"
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.currentTarget.value)}
            placeholder="Optional instructions for every turn…"
            rows={2}
            className="mt-1.5 text-xs"
          />

          <span className="mt-4 block text-xs font-medium text-foreground">
            Max tokens
          </span>
          <div className="mt-1.5 flex gap-1.5">
            {MAX_TOKENS_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={maxTokens === preset ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMaxTokens(preset)}
                className="h-7 px-2.5 text-xs"
              >
                {preset}
              </Button>
            ))}
          </div>

          <label
            htmlFor="playground-temperature"
            className="mt-4 block text-xs font-medium text-foreground"
          >
            Temperature
          </label>
          <input
            id="playground-temperature"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(event) => setTemperature(Number(event.currentTarget.value))}
            className="mt-1.5 w-full accent-foreground"
          />
        </div>
      </div>
    </div>
  )
}
