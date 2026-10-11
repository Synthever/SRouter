import {
  BarChart3,
  Cpu,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Terminal,
} from "lucide-react"
import { useEffect } from "react"

import { useAdminAuth } from "@/components/admin-auth-provider"
import { Badge } from "@/components/arc/badge/badge"
import { Tooltip } from "@/components/arc/tooltip/tooltip"
import { UserMenu } from "@/components/arc/user-menu/user-menu"
import { useTheme } from "@/components/theme-provider"

export type DashboardTab =
  "overview" | "providers" | "usage" | "logs" | "keys" | "settings"

export interface NavItem {
  id: DashboardTab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "providers",
    label: "Providers",
    icon: Cpu,
  },
  {
    id: "usage",
    label: "Usage & Quota",
    icon: BarChart3,
  },
  {
    id: "logs",
    label: "Request Logs",
    icon: Terminal,
  },
  {
    id: "keys",
    label: "API Keys",
    icon: KeyRound,
  },
]

export const SYSTEM_NAV_ITEMS: NavItem[] = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
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

  // Close mobile drawer when resizing up to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileOpen) {
        onCloseMobile()
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [mobileOpen, onCloseMobile])

  const renderNavItem = (item: NavItem) => {
    const isActive = currentTab === item.id
    const Icon = item.icon

    const buttonContent = (
      <button
        type="button"
        onClick={() => {
          onSelectTab(item.id)
          onCloseMobile()
        }}
        className={`group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium tracking-tight transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-foreground ${
          isActive
            ? "bg-foreground/8 font-semibold text-foreground dark:bg-white/10"
            : "text-muted-foreground hover:bg-foreground/4 hover:text-foreground dark:hover:bg-white/5"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        {/* Active accent bar on left */}
        {isActive && (
          <span
            className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-foreground"
            aria-hidden="true"
          />
        )}
        <Icon
          size={16}
          className={`shrink-0 transition-colors ${
            isActive
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          }`}
        />
        {!collapsed && (
          <span className="flex-1 truncate text-left">{item.label}</span>
        )}
        {!collapsed && item.badge && (
          <Badge tone="neutral" size="sm">
            {item.badge}
          </Badge>
        )}
      </button>
    )

    if (collapsed) {
      return (
        <Tooltip key={item.id} content={item.label} side="right">
          {buttonContent}
        </Tooltip>
      )
    }

    return <div key={item.id}>{buttonContent}</div>
  }

  const sidebarContent = (
    <div className="bg-surface flex h-full flex-col justify-between overflow-hidden text-foreground">
      {/* Top Brand & Rail Toggle */}
      <div>
        <div
          className={`flex h-14 items-center border-b border-border px-3.5 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <GatewayMark />
            </div>
            {!collapsed && (
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                  SRouter
                </span>
                <Badge tone="neutral" size="sm">
                  v0.2
                </Badge>
              </div>
            )}
          </div>

          {!collapsed && (
            <Tooltip content="Collapse sidebar ([)" side="right">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                className="hidden size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground md:inline-flex"
              >
                <PanelLeftClose size={15} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4 p-2.5">
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Gateway
              </div>
            )}
            <div className="space-y-0.5">
              {MAIN_NAV_ITEMS.map(renderNavItem)}
            </div>
          </div>

          <div className="space-y-1 border-t border-border/60 pt-1">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                System
              </div>
            )}
            <div className="space-y-0.5">
              {SYSTEM_NAV_ITEMS.map(renderNavItem)}
            </div>
          </div>
        </div>
      </div>

      {/* Operator Session Footer */}
      <div className="border-t border-border p-2">
        <div className="flex items-center justify-between">
          <div className={collapsed ? "mx-auto" : "w-full"}>
            <UserMenu
              user={{
                name: "Admin Operator",
                email: "gateway-operator",
                plan: "Master",
              }}
              status="available"
              theme={theme}
              onThemeChange={(next) => setTheme(next)}
              showTheme
              showName={!collapsed}
              align={collapsed ? "center" : "start"}
              onSignOut={async () => {
                await logout.mutateAsync()
                window.location.href = "/login"
              }}
            />
          </div>

          {collapsed && (
            <Tooltip content="Expand sidebar ([)" side="right">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                className="mx-auto mt-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
              >
                <PanelLeft size={15} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`bg-surface fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`bg-surface hidden shrink-0 flex-col border-r border-border transition-[width] duration-200 ease-in-out md:flex ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
