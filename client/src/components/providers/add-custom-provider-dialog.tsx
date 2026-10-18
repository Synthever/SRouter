import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { Check, LoaderCircle } from "lucide-react"
import {
  verifyCustomProvider,
  type AddCustomProviderInput,
} from "@/api/providers"
import { toast } from "@/components/arc/toast-stack/toast-stack"
import type { ProviderProtocol } from "@/api/types"
import ActionButton from "@/components/arc/action-button/action-button"
import { Button } from "@/components/arc/button/button"
import { FloatingField } from "@/components/arc/floating-field/floating-field"
import { RadioCards } from "@/components/arc/radio-cards/radio-cards"
import ResponsiveDialog from "@/components/seavx/ResponsiveDialog"
import { DialogClose } from "@/components/arc/dialog/dialog"

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

/**
 * The gateway executes two request shapes, not three: `ProviderShape::parse` in
 * `server/src/features/providers/custom/executor.rs` reads Anthropic and folds
 * everything else into OpenAI. A third "Custom" row would let an operator pick
 * a wire format the server then quietly treats as OpenAI, so the dialog offers
 * only what the executor actually honours.
 */
const PROTOCOLS = [
  {
    value: "openai",
    label: "OpenAI compatible",
    description: "POST /chat/completions with the OpenAI request shape.",
  },
  {
    value: "anthropic",
    label: "Anthropic compatible",
    description: "POST /v1/messages with the Anthropic Messages shape.",
  },
] satisfies { value: ProviderProtocol; label: string; description: string }[]

type VerificationState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "success"; message: string }

function verificationError(message: string, run: number) {
  return Object.assign(new Error(message), { run })
}

export function AddCustomProviderDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddCustomProviderDialogProps) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [verification, setVerification] = useState<VerificationState>({
    status: "idle",
  })
  const formRef = useRef<HTMLFormElement | null>(null)
  const baseURLRef = useRef<HTMLInputElement | null>(null)
  const apiKeyRef = useRef<HTMLInputElement | null>(null)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)
  const verificationRun = useRef(0)
  const activeVerificationRun = useRef<number | null>(null)
  const [verifiedConfiguration, setVerifiedConfiguration] = useState<
    string | null
  >(null)
  const [addAttempted, setAddAttempted] = useState(false)

  function invalidateVerification() {
    activeVerificationRun.current = null
    setVerifiedConfiguration(null)
    verificationRun.current += 1
    setVerification({ status: "idle" })
  }

  function updateForm(next: Partial<CustomProviderForm>) {
    setForm((current) => ({ ...current, ...next }))
    if ("protocol" in next || "base_url" in next || "api_key" in next) {
      invalidateVerification()
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    verificationRun.current += 1
    activeVerificationRun.current = null
    setVerifiedConfiguration(null)
    setAddAttempted(false)
    setForm(INITIAL_FORM)
    setVerification({ status: "idle" })
    onOpenChange(nextOpen)
  }

  function configurationKey() {
    return JSON.stringify({
      protocol: form.protocol,
      base_url: form.base_url.trim(),
      api_key: form.api_key.trim(),
    })
  }

  async function handleVerify() {
    const fields = [baseURLRef.current, apiKeyRef.current]
    const firstInvalidField = fields.find(
      (field) => field && !field.validity.valid
    )
    if (firstInvalidField) {
      firstInvalidField.reportValidity()
      toast.error("Check the required fields", {
        description: "Enter a valid base URL and API key before checking.",
      })
      throw verificationError(
        "Enter a valid base URL and API key before checking.",
        verificationRun.current
      )
    }

    const run = verificationRun.current + 1
    verificationRun.current = run
    activeVerificationRun.current = run
    setVerifiedConfiguration(null)
    setVerification({ status: "checking" })

    try {
      const result = await verifyCustomProvider({
        protocol: form.protocol,
        base_url: form.base_url.trim(),
        api_key: form.api_key.trim(),
      })
      if (!result.success) throw new Error(result.message)

      if (verificationRun.current !== run) {
        throw new Error("Connection details changed during the check.")
      }

      setVerifiedConfiguration(configurationKey())
      setVerification({ status: "success", message: result.message })
      toast.success("Provider connection verified", {
        description: result.message,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not verify this provider."
      const isStale = verificationRun.current !== run
      setVerifiedConfiguration(null)
      if (isStale) {
        setVerification({ status: "idle" })
      } else {
        setVerification({ status: "idle" })
        toast.error("Provider verification failed", { description: message })
      }
      throw verificationError(message, run)
    } finally {
      if (activeVerificationRun.current === run) {
        activeVerificationRun.current = null
      }
    }
  }

  const canAddProvider =
    verification.status === "success" &&
    verifiedConfiguration === configurationKey() &&
    form.name.trim().length > 0 &&
    form.base_url.trim().length > 0 &&
    form.api_key.trim().length > 0

  function handleProtocolChange(value: string) {
    const protocol = PROTOCOLS.find((option) => option.value === value)
    if (protocol) updateForm({ protocol: protocol.value })
  }

  function preventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent)?.submitter
    if (submitter !== submitButtonRef.current) {
      submitButtonRef.current?.click()
    }
  }

  async function handleSubmit() {
    setAddAttempted(true)
    if (!formRef.current?.reportValidity()) {
      toast.error("Complete the required fields", {
        description: "Add a provider name, valid base URL, and API key.",
      })
      return
    }

    try {
      await onSubmit({
        name: form.name.trim(),
        prefix: form.prefix.trim() || undefined,
        protocol: form.protocol,
        base_url: form.base_url.trim(),
        api_key: form.api_key.trim(),
      })
      handleOpenChange(false)
    } catch (error) {
      toast.error("Could not add provider", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      })
      throw error instanceof Error
        ? error
        : new Error("Could not add provider.", { cause: error })
    }
  }

  const title = "Add custom provider"
  const description =
    "Register a public endpoint. The gateway blocks private and localhost destinations."

  const formContent = (
    <form
      ref={formRef}
      onSubmit={preventSubmit}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FloatingField
          id="custom-provider-name"
          label="Provider name"
          requiredMark
          autoComplete="off"
          value={form.name}
          onChange={(event) => updateForm({ name: event.currentTarget.value })}
          placeholder="Acme AI"
          aria-invalid={addAttempted && form.name.trim().length === 0}
          required
        />

        <FloatingField
          id="custom-provider-prefix"
          label="Model prefix (optional)"
          autoComplete="off"
          monospace
          value={form.prefix}
          onChange={(event) =>
            updateForm({ prefix: event.currentTarget.value })
          }
          placeholder="acme"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-foreground">
          Protocol
        </legend>
        <RadioCards
          aria-label="Protocol"
          name="custom-provider-protocol"
          layout="grid"
          minColumnWidth={220}
          value={form.protocol}
          onValueChange={handleProtocolChange}
          options={PROTOCOLS}
        />
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FloatingField
          ref={baseURLRef}
          id="custom-provider-url"
          label="Base URL"
          requiredMark
          type="url"
          autoComplete="url"
          monospace
          value={form.base_url}
          onChange={(event) =>
            updateForm({ base_url: event.currentTarget.value })
          }
          placeholder="https://api.example.com/v1"
          required
        />

        <FloatingField
          ref={apiKeyRef}
          id="custom-provider-api-key"
          label="API key"
          requiredMark
          type="password"
          canTogglePassword
          monospace
          autoComplete="new-password"
          value={form.api_key}
          onChange={(event) =>
            updateForm({ api_key: event.currentTarget.value })
          }
          placeholder="sk-..."
          required
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ActionButton
          label="Check connection"
          pendingLabel="Checking connection"
          successLabel="Connection verified"
          onAction={handleVerify}
          onActionError={(error) => {
            activeVerificationRun.current = null
            if (
              error instanceof Error &&
              "run" in error &&
              typeof error.run === "number" &&
              error.run !== verificationRun.current
            ) {
              return
            }
          }}
          className="!border-border !bg-surface !text-foreground"
        />
        {verification.status === "checking" && (
          <p
            role="status"
            className="flex items-center gap-2 text-xs text-muted-foreground sm:max-w-64"
          >
            <LoaderCircle
              size={14}
              className="shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Checking the endpoint and API key.
          </p>
        )}
        {verification.status === "success" && (
          <p
            role="status"
            className="flex items-center gap-2 text-xs text-success sm:max-w-64"
          >
            <Check size={14} aria-hidden="true" />
            Connection verified. Add provider is ready.
          </p>
        )}
        {verification.status === "idle" && (
          <p className="text-xs text-muted-foreground">
            Verify this endpoint before adding it.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary" size="md">
            Cancel
          </Button>
        </DialogClose>
        <ActionButton
          ref={submitButtonRef}
          type="submit"
          label="Add provider"
          pendingLabel="Adding provider"
          successLabel="Provider added"
          onAction={handleSubmit}
          disabled={!canAddProvider}
          onActionError={(error) => {
            const message =
              error instanceof Error ? error.message : "Please try again."
            toast.error("Could not add provider", { description: message })
          }}
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
      detents={[0.85, 0.96]}
      className="!max-h-[92vh] sm:max-w-2xl"
      sheetClassName="space-y-4 px-1 pt-1 pb-6"
    >
      {formContent}
    </ResponsiveDialog>
  )
}
