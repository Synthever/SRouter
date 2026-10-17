import { useEffect, useRef } from "react"

export interface UseIntervalOptions {
  /** If true, fires the callback immediately when the interval is established. Defaults to false. */
  immediate?: boolean
}

/**
 * Declarative setInterval wrapper with dynamic callback reference and pause support.
 * Passing `delayMs = null` or negative pauses the timer without unmounting.
 */
export function useInterval(
  callback: () => void,
  delayMs: number | null,
  options?: UseIntervalOptions
): void {
  const savedCallback = useRef(callback)
  const immediate = options?.immediate ?? false

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs === null || delayMs < 0 || typeof window === "undefined") return

    if (immediate) {
      savedCallback.current()
    }

    const timer = window.setInterval(() => {
      savedCallback.current()
    }, delayMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [delayMs, immediate])
}

export default useInterval
