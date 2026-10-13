import { useCopyFeedback } from "@/components/arc/lib/use-copy-feedback"

/**
 * App-level clipboard access. The copy half delegates to Arc's `useCopyFeedback`
 * so the "Copied" window keeps one owner; only paste is new here.
 */
export default function useClipboard() {
  const { state, copy } = useCopyFeedback()

  async function paste(): Promise<string | null> {
    try {
      return await navigator.clipboard.readText()
    } catch {
      // A denied permission and a non-secure context reject the same way.
      return null
    }
  }

  return { copied: state === "copied", copy, paste }
}
