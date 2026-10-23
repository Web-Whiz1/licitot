import type { LucideIcon } from "lucide-react"

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card/60 px-6 py-16 text-center">
      <span className="grid size-14 -rotate-6 place-items-center rounded-lg bg-tint text-primary">
        <Icon aria-hidden className="size-7" />
      </span>
      <p className="max-w-sm font-display text-xl">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {action}
    </div>
  )
}
