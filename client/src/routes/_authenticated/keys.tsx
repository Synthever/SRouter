import { createFileRoute } from "@tanstack/react-router"

import { KeysView } from "@/components/keys/KeysView"

export const Route = createFileRoute("/_authenticated/keys")({
  component: KeysPage,
})

function KeysPage() {
  return <KeysView />
}
