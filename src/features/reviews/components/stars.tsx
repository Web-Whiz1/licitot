import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

/** 1–5 stars, read-only. `label` is the accessible text (e.g. "4 stele"). */
export function Stars({
  rating,
  label,
  className,
}: {
  rating: number
  label: string
  className?: string
}) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "size-4",
            i <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  )
}
