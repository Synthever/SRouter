import { useId, useRef, useState } from "react"
import type { FormEvent } from "react"

import { MAX_UPLOAD_BYTES, importDatabase } from "@/api/database"
import ActionButton from "@/components/arc/action-button/action-button"
import { Alert } from "@/components/arc/alert/alert"
import { BottomSheet } from "@/components/arc/bottom-sheet/bottom-sheet"
import { Button } from "@/components/arc/button/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/arc/dialog/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useMediaQuery from "@/hooks/useMediaQuery"

type RestoreDatabaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Restoring replaces every row and clears the session cookie, so the success
 * path is a hard reload onto the login screen: every cache entry in this tab
 * belongs to the database that was just replaced.
 */
export function RestoreDatabaseDialog({
  open,
  onOpenChange,
}: RestoreDatabaseDialogProps) {
  const id = useId()
  const isMobile = useMediaQuery("(max-width: 639px)")
  const [file, setFile] = useState<File | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const submitRef = useRef<HTMLButtonElement | null>(null)

  const oversize = file !== null && file.size > MAX_UPLOAD_BYTES

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitRef.current) submitRef.current?.click()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setFile(null)
      setFailure(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleRestore() {
    if (file === null) {
      throw new Error("Pick a database file first.")
    }
    if (oversize) {
      throw new Error("That file is larger than 25 MB.")
    }

    try {
      await importDatabase(file)
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The database could not be restored."
      )
      throw error
    }

    window.location.assign("/login")
  }

  const title = "Restore from backup"
  const description =
    "Replaces every row in this gateway's database with the file you pick."

  const formBody = (
    <form
      ref={formRef}
      onSubmit={preventSubmit}
      className="flex flex-col gap-4"
    >
      <Alert tone="warning" title="This signs you out">
        The server saves the current database to
        ~/.srouter/backups/import-backup.db first, then replaces it and clears
        your session.
      </Alert>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-file`}>Database file</Label>
        <Input
          id={`${id}-file`}
          type="file"
          accept=".db,application/octet-stream"
          aria-describedby={`${id}-file-hint`}
          aria-invalid={oversize ? true : undefined}
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
        {/* One sentence under the field: the chosen file, the cap, or the
            oversize refusal, never three lines of grey text. */}
        <span
          id={`${id}-file-hint`}
          className={
            oversize ? "text-xs text-danger" : "text-xs text-muted-foreground"
          }
        >
          {oversize
            ? "Larger than 25 MB. Export a fresh snapshot and try that file."
            : file === null
              ? "A .db file exported from this gateway, up to 25 MB."
              : `${file.name}, ${(file.size / 1024 / 1024).toFixed(1)} MB`}
        </span>
      </div>

      {failure !== null ? (
        <Alert tone="danger" title="Could not restore the database">
          {failure}
        </Alert>
      ) : null}

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
          label="Restore database"
          pendingLabel="Restoring database"
          successLabel="Restored"
          onAction={handleRestore}
          disabled={file === null || oversize}
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
        detents={[0.55, 0.92]}
        initialDetent={0}
      >
        <div className="p-4">{formBody}</div>
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
        {formBody}
      </DialogContent>
    </Dialog>
  )
}
