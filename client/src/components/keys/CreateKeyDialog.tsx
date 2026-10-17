import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import type { FormEvent } from "react"

import { createAPIKey } from "@/api/keys"
import ActionButton from "@/components/arc/action-button/action-button"
import { Alert } from "@/components/arc/alert/alert"
import { BottomSheet } from "@/components/arc/bottom-sheet/bottom-sheet"
import { Button } from "@/components/arc/button/button"
import { CopyButton } from "@/components/arc/copy-button/copy-button"
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/arc/dialog/dialog"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import useMediaQuery from "@/hooks/useMediaQuery"

import {
  EMPTY_KEY_FORM,
  KeyFormFields,
  createInputFromForm,
  type KeyFormValues,
} from "./KeyFormFields"

type CreateKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateKeyDialog({ open, onOpenChange }: CreateKeyDialogProps) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  const queryClient = useQueryClient()
  const [values, setValues] = useState<KeyFormValues>(EMPTY_KEY_FORM)
  const [secret, setSecret] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const submitRef = useRef<HTMLButtonElement | null>(null)
  const named = values.name.trim().length > 0

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitRef.current) submitRef.current?.click()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (secret !== null) {
      void queryClient.invalidateQueries({ queryKey: ["keys"] })
      toast.success("Key created")
    }
    setSecret(null)
    setValues(EMPTY_KEY_FORM)
    setFailure(null)
    onOpenChange(false)
  }

  async function handleCreate() {
    if (!formRef.current?.reportValidity()) {
      throw new Error("Name the key, and keep every limit at zero or more.")
    }

    try {
      const created = await createAPIKey(createInputFromForm(values))
      setFailure(null)
      setSecret(created.key)
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Could not create the key."
      )
      throw error
    }
  }

  const title = secret === null ? "Create API key" : "Key created"
  const description =
    secret === null
      ? "Issue a client credential with the rate, token, and spend limits this gateway should enforce."
      : "This is the only time this key is shown. Store it now."

  const formBody = (
    <form
      ref={formRef}
      onSubmit={preventSubmit}
      className="flex flex-col gap-4"
    >
      <KeyFormFields
        values={values}
        onChange={(patch) =>
          setValues((current) => ({ ...current, ...patch }))
        }
        showEnabled
      />

      {failure !== null && (
        <Alert tone="danger" title="Could not create the key">
          {failure}
        </Alert>
      )}

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
          ref={submitRef}
          type="submit"
          label="Create key"
          pendingLabel="Creating key"
          successLabel="Key created"
          onAction={handleCreate}
          disabled={!named}
          className="w-full sm:w-auto"
        />
      </div>
    </form>
  )

  const secretBody = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Full secret</span>
        <div className="rounded-[var(--radius-control)] border border-border bg-surface-muted/50 p-3">
          <span className="font-mono text-xs break-all text-foreground">
            {secret}
          </span>
        </div>
        <CopyButton value={secret ?? ""} label="Copy key" />
      </div>
      <div className="flex justify-end">
        {isMobile ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleOpenChange(false)}
          >
            Done
          </Button>
        ) : (
          <DialogClose asChild>
            <Button type="button" variant="primary" size="md">
              Done
            </Button>
          </DialogClose>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        description={description}
        detents={[0.55, 0.92]}
        initialDetent={0}
      >
        <div className="p-4">{secret === null ? formBody : secretBody}</div>
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={title}
        description={description}
        className="sm:max-w-lg"
      >
        {secret === null ? formBody : secretBody}
      </DialogContent>
    </Dialog>
  )
}
