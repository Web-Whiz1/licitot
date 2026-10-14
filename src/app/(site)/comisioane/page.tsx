import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { PLATFORM_FEE_PERCENT, calcPlatformFee, calcSellerPayout, formatRON } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("info")
  return { title: t("feesTitle"), description: t("feesIntro") }
}

const EXAMPLE_PRICE = 1_000_00 // 1.000 RON

export default async function FeesPage() {
  const t = await getTranslations("info")
  const percent = PLATFORM_FEE_PERCENT
  const rows = [
    [t("feeRows.listing"), t("feeRows.listingValue")],
    [t("feeRows.buyer"), t("feeRows.buyerValue")],
    [t("feeRows.unsold"), t("feeRows.unsoldValue")],
    [t("feeRows.sale"), t("feeRows.saleValue", { percent })],
  ] as const

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight">{t("feesTitle")}</h1>
        <p className="text-lg text-muted-foreground">{t("feesIntro")}</p>
      </header>

      <dl className="mt-10 divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-4">
            <dt>{label}</dt>
            <dd className="text-right font-bold text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10 space-y-3 rounded-2xl bg-sky-soft p-6">
        <h2 className="text-xl font-bold tracking-tight">{t("exampleTitle")}</h2>
        <p className="text-secondary-foreground">
          {t("example", {
            price: formatRON(EXAMPLE_PRICE, { compact: true }),
            fee: formatRON(calcPlatformFee(EXAMPLE_PRICE), { compact: true }),
            payout: formatRON(calcSellerPayout(EXAMPLE_PRICE), { compact: true }),
          })}
        </p>
        <p className="text-sm text-secondary-foreground">{t("shippingNote")}</p>
      </section>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link href="/vinde">{t("ctaSell")}</Link>
        </Button>
      </div>
    </div>
  )
}
