import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useSearch,
} from "@tanstack/react-router"

import { adminStatusQuery } from "@/api/admin"
import { AppShell } from "@/components/layout/app-shell"
import type { DashboardTab } from "@/components/layout/sidebar"

export type AuthenticatedSearch = {
  tab?: DashboardTab
}

/**
 * Pathless layout that owns the session gate and dashboard shell.
 * `beforeLoad` runs before the route renders, ensuring protected screens
 * never flash unauthenticated content.
 */
export const Route = createFileRoute("/_authenticated")({
  validateSearch: (search: Record<string, unknown>): AuthenticatedSearch => {
    const tab = typeof search.tab === "string" ? search.tab : undefined
    if (
      tab &&
      ["overview", "providers", "usage", "logs", "keys", "settings"].includes(
        tab
      )
    ) {
      return { tab: tab as DashboardTab }
    }
    return {}
  },
  beforeLoad: async ({ context, location }) => {
    const status = await context.queryClient.ensureQueryData(adminStatusQuery)

    // A server with no admin account cannot authenticate anyone. Send the
    // operator to the setup form instead of a login form they cannot use.
    if (status.setup_required) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }

    if (!status.authenticated) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/_authenticated" })
  const currentTab: DashboardTab = search.tab ?? "overview"

  const handleSelectTab = (tab: DashboardTab) => {
    navigate({
      to: "/",
      search: tab === "overview" ? {} : { tab },
    })
  }

  return (
    <AppShell currentTab={currentTab} onSelectTab={handleSelectTab}>
      <Outlet />
    </AppShell>
  )
}
