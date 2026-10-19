import { MARK_VIEWBOX, PADDLE_PATH, PADDLE_TRANSFORM } from "@/lib/brand/logo-geometry"
import { cn } from "@/lib/utils"

/**
 * - `brand`: blue paddle (lighter blue in dark mode) on the page background.
 * - `inverse`: for navy (ink) bands such as the footer, in both themes.
 * - `mono`: one color (currentColor), for photos or print. The L stays a hole in every variant.
 */
type LogoVariant = "brand" | "inverse" | "mono"

const PADDLE = { brand: "fill-primary", inverse: "fill-ink-accent", mono: "fill-current" }

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
    </svg>
  )
}

type LogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  variant?: LogoVariant
}

/** Mark + "LiciTot" wordmark (live text, so it stays crisp and accessible). */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  variant = "brand",
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <LogoMark variant={variant} className={markClassName} />
      <span
        className={cn(
          "text-[1.4375rem] leading-none font-bold tracking-[-0.035em]",
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
