import { Skeleton } from "@/components/arc/skeleton/skeleton"

export function LogRowPlaceholders({ rows = 8 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border/60" aria-hidden="true">
      {Array.from({ length: rows }, (_, idx) => (
        <li key={idx} className="flex flex-col gap-2 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-14 rounded" lines={1} />
              <Skeleton className="h-4 w-28" lines={1} />
              <Skeleton className="h-4 w-20" lines={1} />
            </div>
            <Skeleton className="h-4 w-16" lines={1} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-40" lines={1} />
            <Skeleton className="h-3 w-24" lines={1} />
          </div>
        </li>
      ))}
    </ul>
  )
}
