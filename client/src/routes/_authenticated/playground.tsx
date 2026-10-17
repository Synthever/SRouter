import { createFileRoute } from "@tanstack/react-router"

import { SectionHeader } from "@/components/layout/section-header"
import { PlaygroundView } from "@/components/playground/PlaygroundView"

export const Route = createFileRoute("/_authenticated/playground")({
  component: PlaygroundPage,
})

function PlaygroundPage() {
  return (
    /* Mobile: natural height so `main` scrolls the stacked columns. Desktop:
       lock to the shell height and scroll inside the panels instead. */
    <div className="flex flex-col gap-5 sm:gap-6 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <SectionHeader
        title="Model playground"
        description="Chat with any model the gateway advertises, streamed live. Requests use your operator session and are logged like every gateway call."
      />
      <div className="min-h-0 flex-1">
        <PlaygroundView />
      </div>
    </div>
  )
}
