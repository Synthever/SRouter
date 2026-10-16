import { useCallback, useEffect, useState } from "react"

/**
 * Persists state in browser localStorage with cross-tab synchronization.
 * Falls back to in-memory state gracefully if storage access is restricted or unavailable.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): readonly [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      // Storage quota exceeded or private-browsing restrictions reject access.
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((current) => {
          const nextValue =
            typeof value === "function"
              ? (value as (prev: T) => T)(current)
              : value

          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(nextValue))
          }
          return nextValue
        })
      } catch {
        // Silently preserve state in memory when quota or cookies are blocked.
      }
    },
    [key]
  )

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key)
      }
      setStoredValue(initialValue)
    } catch {
      // Storage access failure.
    }
  }, [key, initialValue])

  useEffect(() => {
    if (typeof window === "undefined") return

    function handleStorage(event: StorageEvent) {
      if (event.key !== key) return
      if (event.newValue === null) {
        setStoredValue(initialValue)
      } else {
        try {
          setStoredValue(JSON.parse(event.newValue) as T)
        } catch {
          // Ignore foreign malformed payload.
        }
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}

export default useLocalStorage
