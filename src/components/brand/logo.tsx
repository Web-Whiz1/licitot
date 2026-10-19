import { LIVE_DOT, MARK_VIEWBOX, PADDLE_PATH, PADDLE_TRANSFORM } from "@/lib/brand/logo-geometry"
import { cn } from "@/lib/utils"

/**
 * - `brand`: Klein blue paddle (periwinkle in dark mode) + lime dot, on paper or midnight.
 * - `inverse`: for ink bands (hero, footer) in both themes.
 * - `mono`: one color (currentColor), for photos or print. The L stays a hole in every variant.
 */
type LogoVariant = "brand" | "inverse" | "mono"

const PADDLE = { brand: "fill-primary", inverse: "fill-ink-accent", mono: "fill-current" }
const DOT = { brand: "fill-highlight", inverse: "fill-highlight", mono: "fill-current" }

type MarkProps = {
  className?: string
  variant?: LogoVariant
  title?: string
}

export function LogoMark({ className, variant = "brand", title }: MarkProps) {
  const a11y = title
    ? ({ role: "img", "aria-label": title } as const)
    : ({ "aria-hidden": true } as const)

  return (
    <svg viewBox={MARK_VIEWBOX} className={cn("size-8 shrink-0", className)} {...a11y}>
      <path d={PADDLE_PATH} transform={PADDLE_TRANSFORM} className={PADDLE[variant]} />
      <circle cx={LIVE_DOT.cx} cy={LIVE_DOT.cy} r={LIVE_DOT.r} className={DOT[variant]} />
    </svg>
  )
}

type LogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  variant?: LogoVariant
}

/** Mark + "LiciTot" wordmark in Fraunces (live text, so it stays crisp and accessible). */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  variant = "brand",
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark variant={variant} className={markClassName} />
      <span
        className={cn(
          "font-display text-[1.625rem] leading-none tracking-[-0.02em]",
          wordmarkClassName,
        )}
      >
        <span
          className={cn(
            variant === "brand" && "text-foreground",
            variant === "inverse" && "text-ink-foreground",
          )}
        >
          Lici
        </span>
        <span
          className={cn(
            variant === "brand" && "text-primary",
            variant === "inverse" && "text-ink-accent",
          )}
        >
          Tot
        </span>
      </span>
    </span>
  )
}
