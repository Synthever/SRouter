import { useMemo, useState } from "react"

import { addProviderConnections } from "@/api/providers"
import { toast } from "@/components/arc/toast-stack/toast-stack"

type KeyInputMode = "single" | "bulk"

type UseAPIKeyOptions = {
  providerID: string
  connectionName: string
  onConnectionNameChange: (value: string) => void
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

function parseAPIKeys(raw: string): {
  keys: string[]
  duplicateCount: number
} {
  const seen = new Set<string>()
  const keys: string[] = []
  let duplicateCount = 0

  for (const token of raw.split(/[\r\n,]+/)) {
    const trimmed = token.trim()
    if (!trimmed) continue
    if (seen.has(trimmed)) {
      duplicateCount += 1
      continue
    }
    seen.add(trimmed)
    keys.push(trimmed)
  }

  return { keys, duplicateCount }
}

export default function useAPIKey({
  providerID,
  connectionName,
  onConnectionNameChange,
  onSuccess,
  onOpenChange,
}: UseAPIKeyOptions) {
  const [mode, setMode] = useState<KeyInputMode>("single")
  const [apiKey, setAPIKey] = useState("")
  const [bulkKeysRaw, setBulkKeysRaw] = useState("")
  const [prefix, setPrefix] = useState("")
  const [pending, setPending] = useState(false)

  const bulkParsed = useMemo(() => parseAPIKeys(bulkKeysRaw), [bulkKeysRaw])

  const activeKeys = useMemo(() => {
    if (mode === "bulk") return bulkParsed.keys
    const trimmed = apiKey.trim()
    return trimmed ? [trimmed] : []
  }, [mode, bulkParsed.keys, apiKey])

  async function save() {
    if (activeKeys.length === 0) {
      toast.error("At least one API key is required")
      return
    }

    setPending(true)
    try {
      await addProviderConnections(providerID, {
        name: connectionName.trim() || undefined,
        api_keys: activeKeys,
        prefix: prefix.trim() || undefined,
      })
      toast.success(
        activeKeys.length === 1
          ? "API key connected"
          : `${activeKeys.length} API keys connected`
      )
      onSuccess()
      onOpenChange(false)
      setAPIKey("")
      setBulkKeysRaw("")
      setMode("single")
      onConnectionNameChange("")
      setPrefix("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save API key")
      throw err instanceof Error ? err : new Error("Failed to save API key")
    } finally {
      setPending(false)
    }
  }

  function reset() {
    setAPIKey("")
    setBulkKeysRaw("")
    setMode("single")
  }

  return {
    mode,
    setMode,
    apiKey,
    setAPIKey,
    bulkKeysRaw,
    setBulkKeysRaw,
    bulkParsed,
    activeKeys,
    prefix,
    setPrefix,
    pending,
    save,
    reset,
  }
}
