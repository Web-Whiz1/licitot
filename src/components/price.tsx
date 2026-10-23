import { formatRON } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * A RON amount for display: the number in the surrounding style with tabular figures, the
 * currency smaller and muted ("12.500 RON"). The text content stays "12.500 RON", so screen
 * readers and tests read the same string as `formatRON`.
 */
export function Price({
  bani,
  compact = true,
  className,
}: {
  bani: number
  compact?: boolean
  className?: string
}) {
  const text = formatRON(bani, { compact })
  const cut = text.search(/\s\S+$/)
  if (cut === -1) return <span className={cn("tabular-nums", className)}>{text}</span>
  return (
    <span className={cn("tabular-nums", className)}>
      {text.slice(0, cut + 1)}
      <span className="text-[0.6em] font-semibold tracking-normal text-muted-foreground">
        {text.slice(cut + 1)}
      </span>
    </span>
  )
}
