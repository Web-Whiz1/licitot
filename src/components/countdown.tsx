"use client"

import { Clock } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSyncExternalStore } from "react"
import { LiveDot } from "@/components/live-dot"
import { formatDateTime, formatDayTime, timeLeft } from "@/lib/dates"
import { cn } from "@/lib/utils"

// One shared 1-second clock for every countdown on the page.
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
function subscribe(cb: () => void) {
  listeners.add(cb)
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000)
  return () => {
    listeners.delete(cb)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000
// Server (and first client render): no clock → render the absolute end time instead.
const getServerNow = () => null

const HOUR = 3_600_000

/** Current time (ms, whole seconds) from the shared clock; null during SSR and hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getNow, getServerNow)
}

const CHIP =
  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold tabular-nums backdrop-blur-md"

/**
 * Live countdown. SSR renders the end date in Romanian time; the client then ticks.
 * `compact` drops seconds when more than an hour remains (cards).
 * `chip` renders a pill for photos: navy glass with a red "live" dot, all red in the last hour.
 */
export function Countdown({
  endsAt,
  compact = false,
  className,
  showIcon = true,
  variant = "inline",
}: {
  endsAt: string
  compact?: boolean
  className?: string
  showIcon?: boolean
  variant?: "inline" | "chip"
}) {
  const t = useTranslations("countdown")
  const now = useNow()

  if (now === null) {
    if (variant === "chip") {
      return (
        <time dateTime={endsAt} className={cn(CHIP, "bg-ink/75 text-ink-foreground", className)}>
          <Clock aria-hidden className="size-3.5" />
          {formatDayTime(endsAt)}
        </time>
      )
    }
    return (
      <time dateTime={endsAt} className={cn("inline-flex items-center gap-1", className)}>
        {showIcon ? <Clock aria-hidden className="size-3.5" /> : null}
        {formatDateTime(endsAt)}
      </time>
    )
  }

  const left = timeLeft(endsAt, now)
  const urgent = left.totalMs > 0 && left.totalMs < HOUR
  const soon = left.totalMs > 0 && left.totalMs < 24 * HOUR

  let label: string
  if (left.totalMs <= 0) label = t("ended")
  else if (left.days > 0) label = `${t("days", { n: left.days })} ${t("hours", { n: left.hours })}`
  else if (left.hours > 0)
    label = compact
      ? `${t("hours", { n: left.hours })} ${t("minutes", { n: left.minutes })}`
      : `${t("hours", { n: left.hours })} ${t("minutes", { n: left.minutes })} ${t("seconds", { n: left.seconds })}`
  else
    label = `${t("minutes", { n: left.minutes })} ${t("seconds", { n: String(left.seconds).padStart(2, "0") })}`

  if (variant === "chip") {
    const ended = left.totalMs <= 0
    return (
      <time
        dateTime={endsAt}
        title={formatDateTime(endsAt)}
        className={cn(
          CHIP,
          urgent ? "bg-live text-live-foreground" : "bg-ink/75 text-ink-foreground",
          className,
        )}
      >
        {ended ? (
          <Clock aria-hidden className="size-3.5" />
        ) : (
          <LiveDot pulse={soon} className={urgent ? undefined : "text-live"} />
        )}
        {label}
      </time>
    )
  }

  return (
    <time
      dateTime={endsAt}
      title={formatDateTime(endsAt)}
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        soon && "text-warning",
        urgent && "font-semibold text-destructive",
        className,
      )}
    >
      {showIcon ? <Clock aria-hidden className="size-3.5" /> : null}
      {label}
    </time>
  )
}
