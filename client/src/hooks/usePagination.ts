import { useCallback, useMemo, useState } from "react"

export interface UsePaginationOptions<T = never> {
  /** In-memory items to slice. If provided, totalItems is derived automatically. */
  items?: readonly T[]
  /** Total item count when working with server-side paginated queries. */
  totalItems?: number
  /** Initial page index (1-based). Defaults to 1. */
  initialPage?: number
  /** Initial items per page. Defaults to 10. */
  initialPageSize?: number
}

export interface UsePaginationResult<T = never> {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  startIndex: number
  endIndex: number
  hasPrevPage: boolean
  hasNextPage: boolean
  paginatedItems: T[]
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void
  firstPage: () => void
  lastPage: () => void
}

/**
 * Manages 1-based page navigation and page slicing for table views.
 * Works seamlessly with both in-memory arrays and remote server-side queries.
 */
export function usePagination<T = never>(
  options?: UsePaginationOptions<T>
): UsePaginationResult<T> {
  const initialPage = options?.initialPage ?? 1
  const initialPageSize = options?.initialPageSize ?? 10
  const items = options?.items

  const [page, setPageState] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalItems = items ? items.length : (options?.totalItems ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Clamp current page within valid bounds whenever total items or page size changes.
  const clampedPage = Math.min(Math.max(1, page), totalPages)

  const startIndex = (clampedPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return []
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState(Math.min(Math.max(1, nextPage), totalPages))
    },
    [totalPages]
  )

  const setPageSize = useCallback((nextSize: number) => {
    if (nextSize <= 0) return
    setPageSizeState(nextSize)
    setPageState(1)
  }, [])

  const nextPage = useCallback(() => {
    setPageState((current) => Math.min(current + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPageState((current) => Math.max(current - 1, 1))
  }, [])

  const firstPage = useCallback(() => {
    setPageState(1)
  }, [])

  const lastPage = useCallback(() => {
    setPageState(totalPages)
  }, [totalPages])

  return {
    page: clampedPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasPrevPage: clampedPage > 1,
    hasNextPage: clampedPage < totalPages,
    paginatedItems,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
  }
}

export default usePagination
