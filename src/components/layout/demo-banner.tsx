import { FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"

/** Always-visible notice: Stripe runs in test mode, no real money moves. */
export function DemoBanner() {
  const t = useTranslations("demo")

  return (
    <div role="note" className="bg-warning-soft text-warning">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium md:px-6">
        <FlaskConical aria-hidden className="size-3.5 shrink-0" />
        {t("banner")}
      </p>
    </div>
  )
}
