import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import type { FormEvent } from "react"

import { addAPIKeyCredit } from "@/api/keys"
import type { APIKeyResponse } from "@/api/types"
import ActionButton from "@/components/arc/action-button/action-button"
import { Alert } from "@/components/arc/alert/alert"
import { Button } from "@/components/arc/button/button"
import { DialogClose } from "@/components/arc/dialog/dialog"
import { FloatingField } from "@/components/arc/floating-field/floating-field"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import ResponsiveDialog from "@/components/seavx/ResponsiveDialog"
import { MONEY } from "@/components/usage/types"

type AddCreditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyRecord: APIKeyResponse | null
}

/**
 * A top-up is its own request because the server adds the amount to the current
 * cap: folding it into the edit form would make "set the cap to 20" and "add 20"
 * look identical in the same box.
 */
export function AddCreditDialog({
  open,
  onOpenChange,
  keyRecord,
}: AddCreditDialogProps) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState("")
  const [failure, setFailure] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const submitRef = useRef<HTMLButtonElement | null>(null)
  const credit = keyRecord?.credit_limit ?? 0
  const positive = Number(amount) > 0

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitRef.current) submitRef.current?.click()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAmount("")
      setFailure(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleAdd() {
    if (keyRecord === null) return
    if (!formRef.current?.reportValidity()) {
      throw new Error("Enter an amount above zero.")
    }

    try {
      await addAPIKeyCredit(keyRecord.id, Number(amount))
      void queryClient.invalidateQueries({ queryKey: ["keys"] })
      toast.success("Credit added", {
        description: `${MONEY.format(Number(amount))} was added to ${keyRecord.name}.`,
      })
      handleOpenChange(false)
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Could not add the credit."
      )
      throw error
    }
  }

  const title = "Add credit"
  const description =
    "Top up the spend this key may accumulate before the gateway refuses it."

  const formBody = (
    <form
      ref={formRef}
      onSubmit={preventSubmit}
      className="flex flex-col gap-4"
    >
      <FloatingField
        id="key-credit-amount"
        label="Amount (USD)"
        requiredMark
        required
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.currentTarget.value)}
        placeholder="5.00"
      />

      <p className="text-xs text-muted-foreground tabular-nums">
        {credit === 0
          ? "This key has no credit cap. Adding credit starts one."
          : `Current cap: ${MONEY.format(credit)}`}
      </p>

      {failure !== null && (
        <Alert tone="danger" title="Could not add the credit">
          {failure}
        </Alert>
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
          label="Add credit"
          pendingLabel="Adding credit"
          successLabel="Credit added"
          onAction={handleAdd}
          disabled={!positive}
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
      detents={[0.45, 0.8]}
      className="sm:max-w-lg"
    >
      {formBody}
    </ResponsiveDialog>
  )
}
