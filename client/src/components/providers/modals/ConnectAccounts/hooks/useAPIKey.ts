import { useState } from "react"

import { patchProvider } from "@/api/providers"
import { toast } from "@/components/arc/toast-stack/toast-stack"

type UseAPIKeyOptions = {
  providerID: string
  connectionName: string
  onConnectionNameChange: (value: string) => void
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

export default function useAPIKey({
  providerID,
  connectionName,
  onConnectionNameChange,
  onSuccess,
  onOpenChange,
}: UseAPIKeyOptions) {
  const [apiKey, setAPIKey] = useState("")
  const [prefix, setPrefix] = useState("")
  const [pending, setPending] = useState(false)

  async function save() {
    if (!apiKey.trim()) {
      toast.error("API Key is required")
      return
    }

    setPending(true)
    try {
      await patchProvider(providerID, {
        name: connectionName.trim() || undefined,
        api_key: apiKey.trim(),
        prefix: prefix.trim() || undefined,
      })
      toast.success("Provider credentials updated!")
      onSuccess()
      onOpenChange(false)
      setAPIKey("")
      onConnectionNameChange("")
      setPrefix("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save API key")
    } finally {
      setPending(false)
    }
  }

  function reset() {
    setAPIKey("")
  }

  return {
    apiKey,
    setAPIKey,
    setApiKey: setAPIKey,
    prefix,
    setPrefix,
    pending,
    save,
    reset,
  }
}
