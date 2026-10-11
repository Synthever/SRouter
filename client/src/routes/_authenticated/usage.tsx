import { createFileRoute } from "@tanstack/react-router"

import { MetricCard } from "@/components/arc/metric-card/metric-card"
import { SectionHeader } from "@/components/layout/section-header"

export const Route = createFileRoute("/_authenticated/usage")({
  component: UsagePage,
})

function UsagePage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Usage and quota telemetry"
        description="Aggregated token statistics, inference cost estimations, and quota reservations."
        badge="Live stream"
      />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="Usage numbers"
      >
        <MetricCard
          label="Total tokens processed"
          value={48290120}
          change="+18.4%"
          context="32.1M input, 16.1M output"
        />
        <MetricCard
          label="Estimated incurred cost"
          value={24.18}
          suffix=" USD"
          change="+4.2%"
          context="calculated from catalog pricing"
        />
        <MetricCard
          label="Prompt cache hit tokens"
          value={12400000}
          change="+38.0%"
          context="approx 38% cost reduction"
        />
      </section>
    </div>
  )
}
