// Dates are stored as UTC (timestamptz) and always displayed in Romania's timezone,
// independent of the server's or the browser's settings — so SSR and hydration agree.

export const APP_TIME_ZONE = "Europe/Bucharest"
export const APP_LOCALE = "ro-RO"

const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const dayTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

const shortDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

type DateInput = Date | string | number

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d))

/** True when the moment has passed (request-time code only). */
export function isPast(d: DateInput): boolean {
  return toDate(d).getTime() < Date.now()
}

/** "12 octombrie 2026" */
export function formatDate(d: DateInput): string {
  return dateFormatter.format(toDate(d))
}

/** "12 oct. 2026, 14:30" */
export function formatDateTime(d: DateInput): string {
  return dateTimeFormatter.format(toDate(d))
}

/** "12 oct., 14:30" (compact, for chips) */
export function formatDayTime(d: DateInput): string {
  return dayTimeFormatter.format(toDate(d))
}

/** "12.10.2026" */
export function formatShortDate(d: DateInput): string {
  return shortDateFormatter.format(toDate(d))
}

export type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

/** Remaining time until `end`, clamped at zero. Pure: pass `now` for deterministic rendering. */
export function timeLeft(end: DateInput, now: DateInput = Date.now()): TimeLeft {
  const totalMs = Math.max(0, toDate(end).getTime() - toDate(now).getTime())
  const totalSeconds = Math.floor(totalMs / 1000)
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  }
}

/** Compact countdown label: "2z 4h", "3h 12m", "4m 05s", "Încheiată". */
export function formatTimeLeft(t: TimeLeft): string {
  if (t.totalMs <= 0) return "Încheiată"
  if (t.days > 0) return `${t.days}z ${t.hours}h`
  if (t.hours > 0) return `${t.hours}h ${t.minutes}m`
  return `${t.minutes}m ${String(t.seconds).padStart(2, "0")}s`
}
