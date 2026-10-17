import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { keyListQuery } from "@/api/keys"
import {
  analyticsQuery,
  type AnalyticsWindow,
  usageStatsQuery,
  useLogEvents,
} from "@/api/logs"

export default function useUsageData() {
  const [range, setRange] = useState<AnalyticsWindow>("24h")
  const queryClient = useQueryClient()

  const analytics = useQuery(analyticsQuery(range))
  const usage = useQuery(usageStatsQuery)
  const keys = useQuery(keyListQuery)
  const { isConnected, status: streamStatus } = useLogEvents()

  const pendingSections = [
    analytics.isPending ? "period usage" : null,
    usage.isPending ? "lifetime totals" : null,
    keys.isPending ? "key quota" : null,
  ].filter((section): section is string => section !== null)

  const windowTotals = useMemo(() => {
    let prompt = 0
    let completion = 0
    let cached = 0
    let total = 0
    for (const bucket of analytics.data?.buckets ?? []) {
      prompt += bucket.prompt_tokens
      completion += bucket.completion_tokens
      cached += bucket.cached_tokens
      total += bucket.total_tokens
    }
    return {
      prompt,
      completion,
      cached,
      total,
      cacheRate: prompt > 0 ? (cached / prompt) * 100 : 0,
    }
  }, [analytics.data])

  const lifetimeSpend = usage.data?.data.totals.cost.total ?? null
  const windowSpend = analytics.data?.est_cost ?? null
  const spendShare =
    windowSpend !== null && lifetimeSpend !== null && lifetimeSpend > 0
      ? Math.min(100, (windowSpend / lifetimeSpend) * 100)
      : null

  async function refresh() {
    const results = await Promise.all([
      analytics.refetch(),
      usage.refetch(),
      keys.refetch(),
    ])
    if (results.some((result) => result.isError)) {
      throw new Error("usage refresh failed")
    }
  }

  function prefetchRange(nextRange: AnalyticsWindow) {
    void queryClient.prefetchQuery(analyticsQuery(nextRange))
  }

  return {
    range,
    setRange,
    prefetchRange,
    analytics,
    usage,
    keys,
    isConnected,
    streamStatus,
    pendingSections,
    windowTotals,
    windowSpend,
    lifetimeSpend,
    spendShare,
    refresh,
  }
}
