import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder for account pages (lists of auctions/orders) while their data streams in. */
export function AccountSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="divide-y rounded-lg border bg-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="size-20 shrink-0 rounded-lg sm:size-24" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4 max-w-sm" />
              <Skeleton className="h-4 w-1/2 max-w-xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
