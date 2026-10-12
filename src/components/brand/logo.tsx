import { cn } from "@/lib/utils"
import {
  ARROW_PATH,
  ARROW_STROKE_WIDTH,
  LOGO_COLORS,
  MARK_VIEWBOX,
  TAG_PATH,
} from "@/lib/brand/logo-geometry"

type MarkProps = {
  className?: string
  /** Single-color version using currentColor (arrow knocked out). */
  mono?: boolean
  title?: string
}

export function LogoMark({ className, mono = false, title }: MarkProps) {
  const a11y = title
    ? ({ role: "img", "aria-label": title } as const)
    : ({ "aria-hidden": true } as const)

  if (mono) {
    return (
      <svg viewBox={MARK_VIEWBOX} className={cn("size-8 shrink-0", className)} {...a11y}>
        <defs>
          <mask id="lt-mono-knockout" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect width="64" height="64" fill="#fff" />
            <path
              d={ARROW_PATH}
              fill="none"
              stroke="#000"
              strokeWidth={ARROW_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>
        </defs>
        <path d={TAG_PATH} fill="currentColor" fillRule="evenodd" mask="url(#lt-mono-knockout)" />
      </svg>
    )
  }

  return (
    <svg viewBox={MARK_VIEWBOX} className={cn("size-8 shrink-0", className)} {...a11y}>
      <path d={TAG_PATH} fill={LOGO_COLORS.tag} fillRule="evenodd" />
      <path
        d={ARROW_PATH}
        fill="none"
        stroke={LOGO_COLORS.arrow}
        strokeWidth={ARROW_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type LogoProps = {
  className?: string
  markClassName?: string
  mono?: boolean
}

/** Mark + "LiciTot" wordmark. Wordmark colors follow the theme tokens. */
export function Logo({ className, markClassName, mono = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark mono={mono} className={markClassName} />
      <span className="text-[1.375rem] leading-none font-extrabold tracking-tight">
        <span className={mono ? undefined : "text-foreground"}>Lici</span>
        <span className={mono ? undefined : "text-primary"}>Tot</span>
      </span>
    </span>
  )
}
