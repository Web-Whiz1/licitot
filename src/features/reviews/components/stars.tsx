import { Star } from "@/components/icons"
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
          weight={i <= Math.round(rating) ? "fill" : "light"}
          className={cn(
            "size-4",
            i <= Math.round(rating) ? "text-warning" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  )
}
