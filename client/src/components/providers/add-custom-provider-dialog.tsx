import { useRef, useState } from "react"
import type { FormEvent } from "react"
import type { AddCustomProviderInput } from "@/api/providers"
import type { ProviderProtocol } from "@/api/types"
import ActionButton from "@/components/arc/action-button/action-button"
import { Button } from "@/components/arc/button/button"
import PasswordField from "@/components/arc/password-field/password-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CustomProviderForm = Required<AddCustomProviderInput> & {
  protocol: ProviderProtocol
}

type AddCustomProviderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: AddCustomProviderInput) => Promise<void>
}

const INITIAL_FORM: CustomProviderForm = {
  name: "",
  prefix: "",
  protocol: "openai",
  base_url: "",
  api_key: "",
}

const PROTOCOLS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "custom", label: "Custom" },
] satisfies { value: ProviderProtocol; label: string }[]

export function AddCustomProviderDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddCustomProviderDialogProps) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)

  function updateForm(next: Partial<CustomProviderForm>) {
    setForm((current) => ({ ...current, ...next }))
    setSubmitError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setForm(INITIAL_FORM)
    setSubmitError(null)
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
    if (!formRef.current?.reportValidity()) {
      throw new Error(
        "Complete the required fields before adding this provider."
      )
    }

    await onSubmit({
      name: form.name.trim(),
      prefix: form.prefix.trim() || undefined,
      protocol: form.protocol,
      base_url: form.base_url.trim(),
      api_key: form.api_key.trim(),
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add custom provider</DialogTitle>
          <DialogDescription>
            Register a public endpoint. The gateway blocks private and localhost
            destinations.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={preventSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-provider-name">Provider name</Label>
            <Input
              id="custom-provider-name"
              autoComplete="off"
              value={form.name}
              onChange={(event) =>
                updateForm({ name: event.currentTarget.value })
              }
              placeholder="e.g. Acme AI"
              required
              className="h-11 sm:h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-provider-protocol">Protocol</Label>
            <select
              id="custom-provider-protocol"
              value={form.protocol}
              onChange={(event) => {
                const protocol = PROTOCOLS.find(
                  (option) => option.value === event.currentTarget.value
                )
                if (protocol) updateForm({ protocol: protocol.value })
              }}
              className="h-11 w-full rounded-md border border-input bg-input/20 px-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-9"
            >
              {PROTOCOLS.map((protocol) => (
                <option key={protocol.value} value={protocol.value}>
                  {protocol.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-provider-url">Base URL</Label>
            <Input
              id="custom-provider-url"
              type="url"
              autoComplete="url"
              value={form.base_url}
              onChange={(event) =>
                updateForm({ base_url: event.currentTarget.value })
              }
              placeholder="https://api.example.com/v1"
              required
              className="h-11 sm:h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-provider-prefix">
              Model prefix (optional)
            </Label>
            <Input
              id="custom-provider-prefix"
              autoComplete="off"
              value={form.prefix}
              onChange={(event) =>
                updateForm({ prefix: event.currentTarget.value })
              }
              placeholder="e.g. acme"
              className="h-11 sm:h-9"
            />
          </div>

          <PasswordField
            id="custom-provider-api-key"
            label="API key"
            description="Required to send requests to this provider."
            messages={{
              showPassword: "Show API key",
              hidePassword: "Hide API key",
            }}
            autoComplete="new-password"
            value={form.api_key}
            onChange={(event) =>
              updateForm({ api_key: event.currentTarget.value })
            }
            required
          />

          {submitError && (
            <p role="alert" className="text-danger text-xs">
              {submitError}
            </p>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <ActionButton
              ref={submitButtonRef}
              type="submit"
              label="Add provider"
              pendingLabel="Adding provider"
              successLabel="Provider added"
              onAction={handleSubmit}
              onActionError={(error) => {
                setSubmitError(
                  error instanceof Error
                    ? error.message
                    : "The provider could not be added."
                )
              }}
              className="w-full sm:w-auto"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
