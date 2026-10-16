import { useEffect, useState } from "react"

/**
 * Delays updating a value until after the specified delay has passed.
 * Used for debouncing search queries, window events, or filter criteria
 * to prevent excessive network requests and unnecessary re-render cycles.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // When delay is zero or negative, bypass the timer to avoid an extra render tick.
    if (delayMs <= 0) return

    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [value, delayMs])

  return delayMs <= 0 ? value : debouncedValue
}

export default useDebounce
