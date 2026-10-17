import {
  BarChart3,
  Cpu,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  PanelLeftClose,
  Settings,
  Terminal,
  X,
} from "lucide-react"
import { useEffect, type ComponentType } from "react"

import { useAdminAuth } from "@/components/admin-auth-provider"
import { ScrollArea } from "@/components/arc/scroll-area/scroll-area"
import { Tooltip } from "@/components/arc/tooltip/tooltip"
import { UserMenu } from "@/components/arc/user-menu/user-menu"
import { useTheme } from "@/components/theme-provider"

export type DashboardTab =
  | "overview"
  | "providers"
  | "playground"
  | "usage"
  | "logs"
  | "keys"
  | "settings"

/**
 * The section names, keyed by their tab. The rail labels each row with it and
 * the topbar names the current section with it, so one screen cannot end up
 * called two different things.
 */
export const TAB_LABELS = {
  overview: "Overview",
  providers: "Providers",
  playground: "Model playground",
  usage: "Usage and quota",
  logs: "Request logs",
  keys: "API keys",
  settings: "Settings",
} satisfies Record<DashboardTab, string>

export interface NavItem {
  id: DashboardTab
  icon: ComponentType<{ size?: number; className?: string }>
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Gateway",
    items: [
      { id: "overview", icon: LayoutDashboard },
      { id: "providers", icon: Cpu },
      { id: "playground", icon: MessagesSquare },
      { id: "usage", icon: BarChart3 },
      { id: "logs", icon: Terminal },
      { id: "keys", icon: KeyRound },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", icon: Settings }],
  },
]

function GatewayMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M4.93 4.93l4.24 4.24" />
      <path d="M14.83 9.17l4.24-4.24" />
      <path d="M14.83 14.83l4.24 4.24" />
      <path d="M4.93 19.07l4.24-4.24" />
    </svg>
  )
}

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  currentTab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { theme, setTheme } = useTheme()
  const { logout } = useAdminAuth()

  // The drawer covers the content and holds rows the pointer can reach, so it
  // carries the two ways out a pointer alone cannot give: Escape, and the
  // breakpoint where the permanent rail takes over.
  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseMobile()
      }
    }
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onCloseMobile()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleResize)
    }
  }, [mobileOpen, onCloseMobile])

  // `rail` is the desktop icon-only rail. The drawer is always expanded, even
  // when the rail was left collapsed, so the state cannot hide every label on a
  // phone.
  const renderNavItem = (item: NavItem, rail: boolean) => {
    const isActive = currentTab === item.id
    const label = TAB_LABELS[item.id]
    const Icon = item.icon

    const row = (
      <button
        type="button"
        onClick={() => {
          onSelectTab(item.id)
          onCloseMobile()
        }}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex min-h-[var(--control-height-sm)] w-full items-center gap-2.5 rounded-md px-2.5 text-sm tracking-tight transition-colors duration-150 ${
          isActive
            ? "bg-foreground/10 font-medium text-foreground"
            : "text-[var(--text-muted)] hover:bg-foreground/5 hover:text-foreground"
        } ${rail ? "justify-center px-0" : ""}`}
      >
        {/* The neutral accent is near-white, so a fill alone barely separates
            the open section from a hovered one; the bar is what carries the
            state when the palette has no hue to spend. */}
        {isActive && (
          <span
            className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full bg-foreground"
            aria-hidden="true"
          />
        )}
        <Icon size={16} className="shrink-0" />
        {!rail && <span className="truncate">{label}</span>}
      </button>
    )

    if (rail) {
      return (
        <Tooltip key={item.id} content={label} side="right">
          {row}
        </Tooltip>
      )
    }

    return <div key={item.id}>{row}</div>
  }

  const renderContent = (rail: boolean) => (
    <div className="flex h-full min-h-0 flex-col bg-surface text-foreground">
      {/* Brand and rail controls */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-border px-2 ${
          rail ? "justify-center" : "justify-between"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 overflow-hidden ${rail ? "" : "ml-1"}`}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <GatewayMark />
          </div>
          {!rail && (
            <span className="truncate text-sm font-medium tracking-tight text-foreground">
              SRouter
            </span>
          )}
        </div>

        {!rail && (
          <>
            <Tooltip content="Collapse sidebar ([)" side="bottom">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                className="hidden size-[var(--control-height-sm)] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:inline-flex"
              >
                <PanelLeftClose size={15} />
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="inline-flex size-[var(--control-height-sm)] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1" label="Dashboard navigation">
        <nav aria-label="Dashboard" className="flex flex-col gap-5 p-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-1.5">
              {!rail && (
                <div className="px-2.5 py-1 text-xs text-muted-foreground">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => renderNavItem(item, rail))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Operator Session Footer */}
      <div
        className={`shrink-0 border-t border-border p-2 ${
          rail ? "flex justify-center" : ""
        }`}
      >
        <UserMenu
          user={{
            name: "Admin Operator",
            email: "admin",
          }}
          theme={theme}
          onThemeChange={(next) => setTheme(next)}
          showTheme
          showName={!rail}
          align={rail ? "center" : "start"}
          onSignOut={async () => {
            await logout.mutateAsync()
            window.location.href = "/login"
          }}
        />
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        inert={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-in-out md:flex ${
          collapsed ? "w-14" : "w-64"
        }`}
      >
        {renderContent(collapsed)}
      </aside>
    </>
  )
}
