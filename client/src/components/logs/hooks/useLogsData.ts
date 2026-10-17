import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"

import { logsQuery, useLogEvents } from "@/api/logs"
import type { RequestLog } from "@/api/types"
import { isSuccessStatus, type LogStatusFilter } from "../types"

export default function useLogsData() {
  const [page, setPage] = useState(1)
  const limit = 50
  const [statusFilter, setStatusFilter] = useState<LogStatusFilter>("all")
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null)
  const [liveLogIDs, setLiveLogIDs] = useState<Set<string>>(() => new Set())

  const queryClient = useQueryClient()

  // Map UI filter "failed" to server-accepted "error"
  const apiStatus =
    statusFilter === "all"
      ? undefined
      : statusFilter === "failed"
        ? "error"
        : "success"

  const query = useQuery(
    logsQuery({
      page,
      limit,
      status: apiStatus,
    })
  )

  const handleNewLog = useCallback(
    (newLog: RequestLog) => {
      // Mark as fresh live-streamed log ID, keep only latest 20 IDs to avoid unbounded memory growth
      setLiveLogIDs((prev) => {
        const next = new Set(prev)
        next.add(newLog.id)
        if (next.size > 20) {
          const firstKey = next.values().next().value
          if (firstKey) next.delete(firstKey)
        }
        return next
      })

      // If we are on the first page and filter permits, prepend immediately
      if (page === 1) {
        queryClient.setQueryData(
          logsQuery({ page: 1, limit, status: apiStatus }).queryKey,
          (prev) => {
            if (!prev) return prev
            // Server classifies a row as success only when it is 2xx.
            const isSuccess = isSuccessStatus(newLog.status_code)
            const isMatch =
              statusFilter === "all" ||
              (statusFilter === "success" && isSuccess) ||
              (statusFilter === "failed" && !isSuccess)

            if (!isMatch) return prev

            // Avoid duplicate if it already exists
            const exists = prev.data.some((l) => l.id === newLog.id)
            if (exists) return prev

            return {
              ...prev,
              data: [newLog, ...prev.data.slice(0, limit - 1)],
              pagination: prev.pagination
                ? {
                    ...prev.pagination,
                    total: prev.pagination.total + 1,
                  }
                : null,
            }
          }
        )
      }
    },
    [page, limit, statusFilter, apiStatus, queryClient]
  )

  const { isConnected, status: streamStatus } = useLogEvents({
    onRequestLogged: handleNewLog,
  })

  async function refresh() {
    const result = await query.refetch()
    if (result.isError) throw new Error("logs refresh failed")
  }

  function handleFilterChange(newFilter: LogStatusFilter) {
    setStatusFilter(newFilter)
    setPage(1)
  }

  return {
    page,
    setPage,
    limit,
    statusFilter,
    handleFilterChange,
    selectedLog,
    setSelectedLog,
    liveLogIDs,
    query,
    logs: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isConnected,
    streamStatus,
    refresh,
  }
}
