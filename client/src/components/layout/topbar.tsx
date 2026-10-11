import { Menu, PanelLeft } from "lucide-react"

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
      </div>

      {/* Right: Theme Switch */}
      <div className="flex items-center gap-2.5">
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
