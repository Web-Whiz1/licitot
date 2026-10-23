import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/**
 * "Adjudecat": the hammer fell. A rubber-stamp label laid over a sold item's photo (the one
 * decorative flourish of the brand; position it with `className`).
 */
export function HammerStamp({ className }: { className?: string }) {
  const t = useTranslations("auction")
  return (
    <span
      className={cn(
        "pointer-events-none absolute -rotate-4 rounded-sm border-2 border-current bg-card px-2 pt-0.5 pb-1 font-serif text-xs leading-tight font-semibold tracking-[0.1em] text-foreground uppercase sm:px-2.5 sm:text-sm",
        className,
      )}
    >
      {t("hammer")}
    </span>
  )
}
