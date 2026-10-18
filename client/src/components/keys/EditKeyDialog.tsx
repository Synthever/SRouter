import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import type { FormEvent } from "react"

import { updateAPIKey } from "@/api/keys"
import type { APIKeyResponse } from "@/api/types"
import ActionButton from "@/components/arc/action-button/action-button"
import { Alert } from "@/components/arc/alert/alert"
import { Button } from "@/components/arc/button/button"
import { DialogClose } from "@/components/arc/dialog/dialog"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import ResponsiveDialog from "@/components/seavx/ResponsiveDialog"

import {
  EMPTY_KEY_FORM,
  KeyFormFields,
  keyFormValuesFromKey,
  updateInputFromForm,
  type KeyFormValues,
} from "./KeyFormFields"

type EditKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyRecord: APIKeyResponse | null
}

/**
 * `enabled` is deliberately absent: the switch in the table owns that field.
 */
export function EditKeyDialog({
  open,
  onOpenChange,
  keyRecord,
}: EditKeyDialogProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<KeyFormValues>(EMPTY_KEY_FORM)
  const [seedID, setSeedID] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const submitRef = useRef<HTMLButtonElement | null>(null)

  if (keyRecord !== null && keyRecord.id !== seedID) {
    setSeedID(keyRecord.id)
    setValues(keyFormValuesFromKey(keyRecord))
    setFailure(null)
  }

  const patch =
    keyRecord === null ? null : updateInputFromForm(values, keyRecord)
  const named = values.name.trim().length > 0
  const changed = patch !== null && Object.keys(patch).length > 0

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitRef.current) submitRef.current?.click()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setValues(EMPTY_KEY_FORM)
      setSeedID(null)
      setFailure(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleSave() {
    if (keyRecord === null || patch === null) return
    if (!formRef.current?.reportValidity()) {
      throw new Error("Keep every limit at zero or more.")
    }

    try {
      await updateAPIKey(keyRecord.id, patch)
      void queryClient.invalidateQueries({ queryKey: ["keys"] })
      toast.success("Key updated", {
        description: `${values.name.trim()} now holds the limits you saved.`,
      })
      handleOpenChange(false)
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Could not update the key."
      )
      throw error
    }
  }

  const title = "Edit API key"
  const description =
    "Change the limits this key is held to. Its secret is unaffected."

  const formBody = (
    <form
      ref={formRef}
      onSubmit={preventSubmit}
      className="flex flex-col gap-4"
    >
      <KeyFormFields
        values={values}
        onChange={(next) => setValues((current) => ({ ...current, ...next }))}
      />

      {failure !== null && (
        <Alert tone="danger" title="Could not update the key">
          {failure}
        </Alert>
      )}

      {!changed && (
        <p className="text-xs text-muted-foreground">
          Change a field to save. Nothing is sent until then.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary" size="md">
            Cancel
          </Button>
        </DialogClose>
        <ActionButton
          ref={submitRef}
          type="submit"
          label="Save changes"
          pendingLabel="Saving changes"
          successLabel="Key updated"
          onAction={handleSave}
          disabled={!changed || !named}
          className="w-full sm:w-auto"
        />
      </div>
    </form>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      className="sm:max-w-lg"
    >
      {formBody}
    </ResponsiveDialog>
  )
}
