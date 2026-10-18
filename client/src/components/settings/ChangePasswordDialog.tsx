import { useRef, useState } from "react"
import type { FormEvent } from "react"

import { changeAdminPassword } from "@/api/admin"
import ActionButton from "@/components/arc/action-button/action-button"
import { Alert } from "@/components/arc/alert/alert"
import { Button } from "@/components/arc/button/button"
import { DialogClose } from "@/components/arc/dialog/dialog"
import { PasswordField } from "@/components/arc/password-field/password-field"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import ResponsiveDialog from "@/components/seavx/ResponsiveDialog"

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The server keeps the current session valid across a change (only the hash row
 * moves), so this closes in place rather than signing the operator out.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [failure, setFailure] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const submitRef = useRef<HTMLButtonElement | null>(null)

  const mismatch = confirmation.length > 0 && confirmation !== next
  const complete =
    current.length > 0 && next.length > 0 && confirmation === next

  // Enter inside a field submits the form, and the button also carries the
  // action: forward the keyboard submit to the button so one press runs it once.
  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitRef.current) submitRef.current?.click()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCurrent("")
      setNext("")
      setConfirmation("")
      setFailure(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleChange() {
    if (!formRef.current?.reportValidity()) {
      throw new Error("Fill in all three password fields.")
    }

    try {
      await changeAdminPassword({
        current_password: current,
        new_password: next,
        confirmation,
      })
      toast.success("Password updated")
      handleOpenChange(false)
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The password could not be changed."
      )
      throw error
    }
  }

  const title = "Change admin password"
  const description =
    "The new password replaces the one this gateway signs in with."

  const formBody = (
    <form
      ref={formRef}
      onSubmit={preventSubmit}
      className="flex flex-col gap-4"
    >
      <PasswordField
        id="admin-current-password"
        label="Current password"
        autoComplete="current-password"
        required
        value={current}
        onChange={(event) => setCurrent(event.currentTarget.value)}
      />

      <PasswordField
        id="admin-new-password"
        label="New password"
        autoComplete="new-password"
        required
        // The server refuses more than 128 characters; stopping the field there
        // keeps the refusal from arriving as a round trip.
        maxLength={128}
        value={next}
        onChange={(event) => setNext(event.currentTarget.value)}
      />

      <PasswordField
        id="admin-new-password-confirmation"
        label="Confirm new password"
        autoComplete="new-password"
        required
        maxLength={128}
        aria-invalid={mismatch ? true : undefined}
        description={mismatch ? "Passwords must match." : undefined}
        value={confirmation}
        onChange={(event) => setConfirmation(event.currentTarget.value)}
      />

      {failure !== null ? (
        <Alert tone="danger" title="Could not change the password">
          {failure}
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary" size="md">
            Cancel
          </Button>
        </DialogClose>
        <ActionButton
          ref={submitRef}
          type="submit"
          label="Change password"
          pendingLabel="Changing password"
          successLabel="Password changed"
          onAction={handleChange}
          disabled={!complete}
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
