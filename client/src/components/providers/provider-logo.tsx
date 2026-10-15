import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Brand marks served from `client/public/providers`. Most ids name their vendor
 * directly; these five disagree, because two driver ids share one vendor asset
 * and three carry a separator the file name does not.
 */
const LOGOS: Record<string, string> = {
  antigravity: "antigravity",
  claude: "claude",
  cline: "cline",
  codebuddy: "codebuddy",
  "codebuddy-cn": "codebuddy",
  "grok-web": "grok",
  openai_codex: "openai",
  opencode_zen: "opencode",
  qoder: "qoder",
}

/**
 * Assets that paint in `currentColor` instead of a brand colour. An `<img>`
 * renders them as an isolated document where `currentColor` resolves to black,
 * so they would vanish on the dark surface; they fill the foreground colour
 * through a mask instead. `qoder` joins them because its brand green sits on a
 * `currentColor` body, which would drop out the same way and leave a fragment.
 */
const MONOCHROME = new Set(["cline", "grok", "openai", "opencode", "qoder"])

export interface ProviderLogoProps extends ComponentProps<"span"> {
  providerID?: string
  size?: number
}

/**
 * Vendor and driver logos keyed by provider identifier. The caller sizes the
 * box and the mark fills it, so a fixed avatar and a flex chip both work.
 * If size is provided, it is applied as width and height style.
 *
 * A mark drawn in one foreground colour follows the theme through the mask
 * branch; a mark with its own brand colour sits on a muted chip, because those
 * assets are framed to the full 24px box and touch their own edges.
 */
export function ProviderLogo({
  providerID,
  size,
  className,
  style,
  ...props
}: ProviderLogoProps) {
  const slug = LOGOS[(providerID ?? "").toLowerCase()]
  const frame = size ? { width: size, height: size, ...style } : style

  // A custom provider carries a generated id, so there is no asset to serve.
  if (!slug) {
    return (
      <span
        className={cn("inline-flex text-foreground", className)}
        style={frame}
        aria-hidden="true"
        {...props}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
        </svg>
      </span>
    )
  }

  const asset = `/providers/${slug}.svg`

  if (MONOCHROME.has(slug)) {
    return (
      <span
        className={cn("inline-flex bg-foreground", className)}
        style={{
          ...frame,
          maskImage: `url(${asset})`,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskImage: `url(${asset})`,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
        }}
        aria-hidden="true"
        {...props}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-sm bg-surface-muted p-0.5",
        className
      )}
      style={frame}
      aria-hidden="true"
      {...props}
    >
      <img src={asset} alt="" className="size-full object-contain" />
    </span>
  )
}
