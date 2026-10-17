import { useMemo, useState } from "react"

import type { KeyListResponse } from "@/api/types"
import type { KeyFilter, KeyRow } from "../types"

export default function useKeyQuota({
  keysData,
}: {
  keysData?: KeyListResponse
}) {
  const [keyFilter, setKeyFilter] = useState<KeyFilter>("all")

  const keyRows = useMemo<KeyRow[]>(() => {
    const rows = (keysData?.data ?? []).map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.key_prefix,
      enabled: key.enabled,
      quota: key.quota_limit,
      used: key.usage_tokens,
      percent:
        key.quota_limit > 0 ? (key.usage_tokens / key.quota_limit) * 100 : null,
      rateLimit: key.rate_limit,
    }))
    const filtered =
      keyFilter === "near"
        ? rows.filter((row) => row.percent !== null && row.percent >= 80)
        : rows
    // Unlimited keys carry no percentage, so they sit after the metered ones.
    return filtered.sort(
      (left, right) => (right.percent ?? -1) - (left.percent ?? -1)
    )
  }, [keysData, keyFilter])

  return {
    keyFilter,
    setKeyFilter,
    keyRows,
  }
}
