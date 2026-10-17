import { Menu, PanelLeft } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useLocation, useNavigate } from "@tanstack/react-router"

import { providerDetailQuery } from "@/api/providers"
import { Breadcrumb, type BreadcrumbItem } from "@/components/arc/breadcrumb/breadcrumb"
import { Tooltip } from "@/components/arc/tooltip/tooltip"
import { TAB_LABELS, type DashboardTab } from "./sidebar"

export interface TopbarProps {
  currentTab: DashboardTab
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenMobile: () => void
}

export function Topbar({
  currentTab,
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}: TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const providerDetailMatch = location.pathname.match(
    /^\/providers\/([^/]+)/
  )
  const providerId = providerDetailMatch
    ? decodeURIComponent(providerDetailMatch[1] ?? "")
    : ""

  const { data: provider } = useQuery({
    ...providerDetailQuery(providerId),
    enabled: Boolean(providerId),
  })

  const controlClass =
    "inline-flex size-[var(--control-height-sm)] shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "SRouter", onClick: () => navigate({ to: "/" }) },
  ]

  if (providerDetailMatch) {
    breadcrumbItems.push({
      label: "Providers",
      onClick: () => navigate({ to: "/providers" }),
    })
    breadcrumbItems.push({
      label: provider?.name || providerId,
    })
  } else {
    breadcrumbItems.push({
      label: TAB_LABELS[currentTab],
    })
  }

  return (
    // The horizontal padding mirrors `main` in app-shell, so the crumb sits on
    // the same vertical line as the page heading below it.
    <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className={`${controlClass} md:hidden`}
      >
        <Menu size={18} />
      </button>

      {collapsed && (
        <Tooltip content="Expand sidebar ([)" side="bottom">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className={`${controlClass} hidden md:inline-flex`}
          >
            <PanelLeft size={17} />
          </button>
        </Tooltip>
      )}

      {/* The path is the header's only content: an operator tool says which
          section is open and stays out of the way of the data below it. */}
      <Breadcrumb items={breadcrumbItems} />
    </header>
  )
}
