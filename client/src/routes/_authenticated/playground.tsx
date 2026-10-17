import { createFileRoute } from "@tanstack/react-router"

import { SectionHeader } from "@/components/layout/section-header"
import { PlaygroundView } from "@/components/playground/PlaygroundView"

export const Route = createFileRoute("/_authenticated/playground")({
  component: PlaygroundPage,
})

function PlaygroundPage() {
  return (
    <div className="flex h-full min-h-0 max-w-full flex-col gap-5 overflow-hidden sm:gap-6">
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
