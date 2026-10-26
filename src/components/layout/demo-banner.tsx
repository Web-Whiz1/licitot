import { FlaskConical } from "@/components/icons"
import { useTranslations } from "next-intl"
import { isPaymentsTestMode } from "@/lib/env"

/** Shown on every page while Stripe uses sandbox keys: no real money moves. Hidden in live mode. */
export function DemoBanner() {
  const t = useTranslations("demo")
  if (!isPaymentsTestMode) return null

  return (
    <div role="note" className="bg-warning-soft text-warning">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium md:px-6">
        <FlaskConical aria-hidden className="size-3.5 shrink-0" />
        {t("banner")}
      </p>
    </div>
  )
}
