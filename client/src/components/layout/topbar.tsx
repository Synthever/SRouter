import { Menu, PanelLeft, Search } from "lucide-react"

import { Badge } from "@/components/arc/badge/badge"
import { ThemeSwitch } from "@/components/arc/theme-switch/theme-switch"
import { Tooltip } from "@/components/arc/tooltip/tooltip"
import { useTheme } from "@/components/theme-provider"
import type { DashboardTab } from "./sidebar"

export interface TopbarProps {
  currentTab: DashboardTab
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenMobile: () => void
}

const TAB_TITLES: Record<DashboardTab, string> = {
  overview: "Overview",
  providers: "Providers",
  usage: "Usage & Quota",
  logs: "Request Logs",
  keys: "API Keys",
  settings: "Settings",
}

export function Topbar({
  currentTab,
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Toggle / Rail Toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation drawer"
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Desktop rail expand trigger when collapsed */}
        {collapsed && (
          <Tooltip content="Expand sidebar ([)" side="bottom">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="hidden size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:inline-flex"
            >
              <PanelLeft size={17} />
            </button>
          </Tooltip>
        )}

        {/* Breadcrumb Heading */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-medium tracking-tight"
        >
          <span className="text-muted-foreground">SRouter</span>
          <span className="text-border" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-foreground">
            {TAB_TITLES[currentTab]}
          </span>
        </nav>

        {/* Live Gateway Health Indicator */}
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 sm:inline-flex dark:text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span>Gateway Online</span>
        </div>
      </div>

      {/* Right: Quick Command Search + Database Badge + Theme Switch */}
      <div className="flex items-center gap-2.5">
        {/* Quick Search Shortcut Trigger */}
        <div
          className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground md:inline-flex"
          role="search"
        >
          <Search size={13} className="text-muted-foreground" />
          <span className="text-[11px]">Search gateway...</span>
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
            ⌘K
          </kbd>
        </div>

        <Badge tone="neutral" size="sm" className="hidden lg:inline-flex">
          SQLite Schema v4
        </Badge>

        {/* Theme Switcher using UIARC split variant */}
        <ThemeSwitch
          theme={isDark ? "dark" : "light"}
          variant="split"
          iconOnly
          onThemeChange={(next) => setTheme(next)}
        />
      </div>
    </header>
  )
}
