import { TriangleAlert } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getPayoutStatus } from "../queries"

/** On the sell pages: publishing needs active Stripe payouts, so say it before the form. */
export async function PayoutsNotice({ userId }: { userId: string }) {
  const status = await getPayoutStatus(userId)
  if (status.stripe_charges_enabled) return null
  const t = await getTranslations("payouts")
  return (
    <div
      role="note"
      className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-warning-soft p-4 text-sm text-warning"
    >
      <TriangleAlert aria-hidden className="size-5 shrink-0" />
      <p className="flex-1 font-medium">{t("sellNotice")}</p>
      <Link href="/cont/incasari" className="font-semibold underline underline-offset-2">
        {t("sellNoticeLink")}
      </Link>
    </div>
  )
}
