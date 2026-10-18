import { Skeleton } from "@/components/ui/skeleton"

/** Instant feedback when switching admin tabs. */
export default function AdminLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}
