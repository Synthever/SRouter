import type { ComponentProps } from "react"

export interface ProviderLogoProps extends ComponentProps<"svg"> {
  providerID?: string
  size?: number
}

/**
 * Vendor and driver logos mapped by provider identifier.
 * Renders with currentColor so it contrasts cleanly in both light and dark themes.
 */
export function ProviderLogo({
  providerID,
  size = 20,
  className = "",
  ...props
}: ProviderLogoProps) {
  const normalized = (providerID ?? "").toLowerCase()

  if (normalized.includes("codex") || normalized.includes("openai")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M19.14 7.5A4.5 4.5 0 0 0 12 3.84a4.5 4.5 0 0 0-6.14 2.16 4.5 4.5 0 0 0-1.5 6.5A4.5 4.5 0 0 0 4.86 16.5 4.5 4.5 0 0 0 12 20.16a4.5 4.5 0 0 0 6.14-2.16 4.5 4.5 0 0 0 1.5-6.5 4.5 4.5 0 0 0-.5-3.99z" />
        <path d="m9.5 8.5 5 2.89v5.77l-5-2.89V8.5z" />
        <path d="M12 3.84v5.77" />
        <path d="m14.5 17.06 5-2.89" />
        <path d="M4.36 12.5h5.77" />
      </svg>
    )
  }

  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M13.67 3.5c-.47 0-.9.25-1.13.66L7.26 13.5h3.48l1.45-2.73 1.45 2.73h3.48L14.8 4.16a1.3 1.3 0 0 0-1.13-.66zm-5.9 12.28-2.6 4.74a1.27 1.27 0 0 0 1.11 1.88h15.44a1.27 1.27 0 0 0 1.11-1.88l-2.6-4.74H7.77z" />
      </svg>
    )
  }

  if (
    normalized.includes("antigravity") ||
    normalized.includes("google") ||
    normalized.includes("gemini")
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M12 2C12 7.52 7.52 12 2 12c5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10-5.52 0-10-4.48-10-10z" />
      </svg>
    )
  }

  if (normalized.includes("grok")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }

  if (normalized.includes("cline")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <rect width="18" height="12" x="3" y="6" rx="3" />
        <path d="M9 12h.01" />
        <path d="M15 12h.01" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
      </svg>
    )
  }

  if (normalized.includes("qoder")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m15 15 4 4" />
        <path d="M9.5 9.5a3.5 3.5 0 0 1 5 5" />
      </svg>
    )
  }

  if (normalized.includes("codebuddy")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M16 18a4 4 0 0 0-8 0" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 6l-3 3 3 3" />
        <path d="M17 6l3 3-3 3" />
      </svg>
    )
  }

  if (normalized.includes("opencode") || normalized.includes("zen")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v5" />
        <path d="M12 16v5" />
      </svg>
    )
  }

  // Fallback for custom or unknown providers
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </svg>
  )
}
