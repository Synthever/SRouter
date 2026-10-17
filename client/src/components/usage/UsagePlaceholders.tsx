import { Skeleton } from "@/components/arc/skeleton/skeleton"

/**
 * Placeholder rows shaped like the rows they stand in for (id, provider, value,
 * share track), so the list fills in instead of being replaced by a different
 * layout. Hidden from assistive tech: the page announces its own loading state
 * once through a status region, and repeating it per row would only chatter.
 */
export function ModelRowPlaceholders({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="max-w-[18rem]" lines={1} />
            <Skeleton className="max-w-[6rem]" lines={1} />
          </div>
          <div className="h-1.5 w-1/3 overflow-hidden rounded-full bg-surface-muted" />
        </li>
      ))}
    </ul>
  )
}

/** The key rows carry a bar and a caption line, so their placeholders do too. */
export function KeyRowPlaceholders({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="max-w-[16rem]" lines={1} />
            <Skeleton className="max-w-[4rem]" lines={1} />
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" />
          <Skeleton className="max-w-[20rem]" lines={1} />
        </li>
      ))}
    </ul>
  )
}
