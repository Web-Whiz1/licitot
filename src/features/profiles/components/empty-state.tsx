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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/40 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-sky-soft text-primary">
        <Icon aria-hidden className="size-7" />
      </span>
      <p className="max-w-sm font-medium">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {action}
    </div>
  )
}
