import { useMemo, useRef, useState, type FormEvent } from "react"

import { createCustomModel } from "@/api/providers"
import ActionButton from "@/components/arc/action-button/action-button"
import { Badge } from "@/components/arc/badge/badge"
import { BottomSheet } from "@/components/arc/bottom-sheet/bottom-sheet"
import { Button } from "@/components/arc/button/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/arc/dialog/dialog"
import { Switch } from "@/components/arc/switch/switch"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import { Textarea } from "@/components/ui/textarea"
import useMediaQuery from "@/hooks/useMediaQuery"

type AddCustomModelsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerName: string
  effectivePrefix: string
  existingModelIDs: string[]
  onSuccess: () => void
}

function normalizeModelID(raw: string, effectivePrefix: string): string | null {
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, "")
  if (!trimmed) return null

  const prefix = effectivePrefix.trim().replace(/^\/+|\/+$/g, "")
  if (!prefix) return trimmed

  const lowerPrefix = `${prefix.toLowerCase()}/`
  if (trimmed.toLowerCase().startsWith(lowerPrefix)) {
    const bare = trimmed.slice(lowerPrefix.length).trim()
    return bare ? `${prefix}/${bare}` : null
  }

  return `${prefix}/${trimmed}`
}

export function AddCustomModelsDialog({
  open,
  onOpenChange,
  providerName,
  effectivePrefix,
  existingModelIDs,
  onSuccess,
}: AddCustomModelsDialogProps) {
  const [rawInput, setRawInput] = useState("")
  const [markFavorite, setMarkFavorite] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)
  const isMobile = useMediaQuery("(max-width: 639px)")

  const parsed = useMemo(() => {
    const existingSet = new Set(existingModelIDs.map((id) => id.toLowerCase()))
    const seen = new Set<string>()
    const models: string[] = []
    let skippedCount = 0

    for (const part of rawInput.split(/[\r\n,]+/)) {
      const normalized = normalizeModelID(part, effectivePrefix)
      if (!normalized) continue
      const key = normalized.toLowerCase()
      if (seen.has(key) || existingSet.has(key)) {
        skippedCount += 1
        continue
      }
      seen.add(key)
      models.push(normalized)
    }

    return { models, skippedCount }
  }, [rawInput, effectivePrefix, existingModelIDs])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setRawInput("")
      setMarkFavorite(false)
    }
    onOpenChange(nextOpen)
  }

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitButtonRef.current) {
      submitButtonRef.current?.click()
    }
  }

  async function handleSubmit() {
    if (parsed.models.length === 0) {
      toast.error("Enter at least one new model ID")
      throw new Error("Enter at least one new model ID")
    }

    const results = await Promise.allSettled(
      parsed.models.map((modelID) =>
        createCustomModel({
          model_id: modelID,
          favorite: markFavorite || undefined,
        })
      )
    )

    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const firstFailure = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    )

    if (succeeded > 0) {
      onSuccess()
    }

    if (firstFailure) {
      const reason: Error | null =
        firstFailure.reason instanceof Error ? firstFailure.reason : null
      const message = reason ? reason.message : "Failed to register model"
      if (succeeded > 0) {
        toast.error(
          `Added ${succeeded} model${succeeded === 1 ? "" : "s"}, ${results.length - succeeded} failed`,
          { description: message }
        )
      } else {
        toast.error("Could not add models", { description: message })
      }
      throw new Error(message)
    }

    toast.success(
      succeeded === 1
        ? `Added ${parsed.models[0]}`
        : `Added ${succeeded} custom models`
    )
    handleOpenChange(false)
  }

  const title = "Add custom models"
  const description = `Register model IDs routed through ${providerName}. Models are automatically namespaced under "${effectivePrefix}/".`

  const actionLabel =
    parsed.models.length > 1
      ? `Add ${parsed.models.length} models`
      : "Add model"

  const formContent = (
    <form onSubmit={preventSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="custom-models-input"
            className="text-xs font-medium text-foreground"
          >
            Model IDs
          </label>
          <span className="font-mono text-[11px] text-muted-foreground">
            prefix: {effectivePrefix}/
          </span>
        </div>

        <Textarea
          id="custom-models-input"
          rows={4}
          value={rawInput}
          onChange={(event) => setRawInput(event.currentTarget.value)}
          placeholder={"gpt-4o\nclaude-sonnet-4-5\ndeepseek-r1"}
          className="font-mono text-xs"
          required
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Enter one model ID per line or comma-separated.
          </span>
          <div className="flex items-center gap-1.5">
            <Badge
              tone={parsed.models.length > 0 ? "info" : "neutral"}
              size="sm"
            >
              {parsed.models.length}{" "}
              {parsed.models.length === 1 ? "model" : "models"} ready
            </Badge>
            {parsed.skippedCount > 0 && (
              <Badge tone="warning" size="sm">
                {parsed.skippedCount} already present or duplicate
              </Badge>
            )}
          </div>
        </div>
      </div>

      {parsed.models.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Catalog IDs to register
          </span>
          <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {parsed.models.map((id) => (
              <Badge key={id} tone="neutral" size="sm" className="font-mono">
                {id}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/30 px-3 py-2.5">
        <div>
          <span className="block text-xs font-medium text-foreground">
            Mark as favorite
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Pin these models to the top of the model selector.
          </span>
        </div>
        <Switch
          checked={markFavorite}
          onCheckedChange={setMarkFavorite}
          aria-label="Mark added models as favorite"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {isMobile ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
        ) : (
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="md">
              Cancel
            </Button>
          </DialogClose>
        )}
        <ActionButton
          ref={submitButtonRef}
          type="submit"
          label={actionLabel}
          pendingLabel="Adding models…"
          successLabel="Models added"
          onAction={handleSubmit}
          disabled={parsed.models.length === 0}
          className="w-full sm:w-auto"
        />
      </div>
    </form>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        description={description}
        detents={[0.75, 0.92]}
        initialDetent={0}
      >
        <div className="space-y-4 px-1 pt-1 pb-6">{formContent}</div>
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={title}
        description={description}
        className="!max-h-[92vh] sm:max-w-lg"
      >
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
