import { useEffect, useState } from "react"

import useMediaQuery from "@/hooks/useMediaQuery"

/**
 * A share or quota bar that grows to its value the first time it mounts. The
 * gateway pushes usage over SSE, so a width arriving is the event this page
 * exists to show; a block that is already full when it appears hides it. The
 * figure beside every bar is the readable value, which keeps the bar decorative
 * for assistive tech and lets reduced motion jump straight to the width.
 */
export function ShareBar({
  value,
  tone = "neutral",
  className = "w-full",
}: {
  value: number
  tone?: "neutral" | "warning" | "danger"
  className?: string
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLanded(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-surface-muted ${className}`}
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${
          tone === "danger"
            ? "bg-danger"
            : tone === "warning"
              ? "bg-warning"
              : "bg-foreground"
        }`}
        style={{ width: `${landed || reduced ? Math.min(100, value) : 0}%` }}
      />
    </div>
  )
}
