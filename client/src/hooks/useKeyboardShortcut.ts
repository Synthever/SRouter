import { useEffect, useRef } from "react"

export interface KeyboardShortcutOptions {
  /** Whether the shortcut is active. Defaults to true. */
  enabled?: boolean
  /** Whether to call event.preventDefault() when triggered. Defaults to true. */
  preventDefault?: boolean
  /**
   * If true, ignore keypresses when focus is inside text inputs, textareas, or contentEditable elements.
   * Defaults to true so keys like "/" do not trigger while typing.
   */
  ignoreInInputs?: boolean
}

function isTextInput(element: Element | null): boolean {
  if (!element) return false
  const tagName = element.tagName.toLowerCase()
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true
  }
  return (element as HTMLElement).isContentEditable === true
}

function matchesCombo(combo: string, event: KeyboardEvent): boolean {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())

  const needsMeta = parts.includes("meta") || parts.includes("cmd")
  const needsCtrl = parts.includes("ctrl") || parts.includes("control")
  const needsAlt = parts.includes("alt") || parts.includes("option")
  const needsShift = parts.includes("shift")

  const mainKey = parts.find(
    (part) =>
      !["meta", "cmd", "ctrl", "control", "alt", "option", "shift"].includes(
        part
      )
  )

  if (needsMeta !== event.metaKey) return false
  if (needsCtrl !== event.ctrlKey) return false
  if (needsAlt !== event.altKey) return false
  if (needsShift !== event.shiftKey) return false

  if (!mainKey) return true

  return event.key.toLowerCase() === mainKey
}

/**
 * Listens for global or scoped keyboard shortcut combinations.
 * Supports single keys (e.g. "/", "Escape") and modifier combos (e.g. "Meta+k", "Ctrl+Shift+p").
 */
export function useKeyboardShortcut(
  combo: string | readonly string[],
  callback: (event: KeyboardEvent) => void,
  options?: KeyboardShortcutOptions
): void {
  const savedCallback = useRef(callback)
  const enabled = options?.enabled ?? true
  const preventDefault = options?.preventDefault ?? true
  const ignoreInInputs = options?.ignoreInInputs ?? true

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    function handleKeyDown(event: KeyboardEvent) {
      if (ignoreInInputs && isTextInput(document.activeElement)) {
        return
      }

      const combos = Array.isArray(combo) ? combo : [combo]
      const matched = combos.some((c) => matchesCombo(c, event))

      if (matched) {
        if (preventDefault) {
          event.preventDefault()
        }
        savedCallback.current(event)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [combo, enabled, preventDefault, ignoreInInputs])
}

export default useKeyboardShortcut
