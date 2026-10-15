import { Scale } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { ActionButton } from "@/components/action-button"
import { Skeleton } from "@/components/ui/skeleton"
import { auctionHref } from "@/features/auctions/components/auction-card"
import { getCurrentProfile, requireUser } from "@/features/auth/session"
import { resolveDispute } from "@/features/payments/actions"
import { getOpenDisputes } from "@/features/payments/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatDateTime } from "@/lib/dates"
import { formatRON } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin")
  return { title: t("title"), robots: { index: false } }
}

export default async function AdminPage() {
  const t = await getTranslations("admin")
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
        <Disputes />
      </Suspense>
    </div>
  )
}

/** Open disputes. Admins only (RLS lets admins read every order; the RPC re-checks). */
async function Disputes() {
  await requireUser("/admin")
  const profile = await getCurrentProfile()
  if (profile?.role !== "admin" || profile.is_banned) notFound()

  const t = await getTranslations()
  const disputes = await getOpenDisputes()
  const price = (bani: number) => formatRON(bani, { compact: true })

  return (
    <section aria-labelledby="disputes" className="space-y-4">
      <h2 id="disputes" className="text-xl font-bold tracking-tight">
        {t("admin.disputesTitle")}
      </h2>
      {disputes.length === 0 ? (
        <EmptyState icon={Scale} title={t("admin.empty")} />
      ) : (
        <ul className="space-y-4">
          {disputes.map((o) => {
            const d = o.dispute
            const amount = price(o.item_price + o.shipping_cost)
            const reason = d?.reason as "not_received" | "not_as_described" | "other" | undefined
            return (
              <li key={o.id} className="space-y-3 rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={auctionHref(o.auction)} className="font-semibold hover:underline">
                    {o.auction.title}
                  </Link>
                  {d ? (
                    <span className="text-xs text-muted-foreground">
                      {t("admin.opened", { date: formatDateTime(d.opened_at) })}
                    </span>
                  ) : null}
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="inline text-muted-foreground">{t("admin.buyer")}: </dt>
                    <dd className="inline">{o.buyer?.display_name}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">{t("admin.seller")}: </dt>
                    <dd className="inline">{o.seller?.display_name}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">{t("admin.amount")}: </dt>
                    <dd className="inline font-semibold">{amount}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">{t("admin.delivery")}: </dt>
                    <dd className="inline">
                      {o.delivery_method === "courier"
                        ? `${o.tracking_carrier ?? "—"} · ${o.tracking_number ?? "—"}`
                        : t("admin.pickup")}
                    </dd>
                  </div>
                </dl>
                {d ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {t("admin.details")}
                        {reason ? ` · ${t(`orders.reasons.${reason}`)}` : ""}
                      </p>
                      <p className="rounded-lg bg-muted p-3 whitespace-pre-line">{d.details}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{t("admin.sellerResponse")}</p>
                      <p className="rounded-lg bg-muted p-3 whitespace-pre-line">
                        {d.seller_response ?? t("admin.noResponse")}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    action={resolveDispute.bind(null, o.id, "refund")}
                    variant="destructive"
                    confirm={{
                      title: t("admin.refund"),
                      text: t("admin.refundConfirm", { amount }),
                      confirmLabel: t("admin.confirm"),
                      cancelLabel: t("admin.back"),
                    }}
                  >
                    {t("admin.refund")}
                  </ActionButton>
                  <ActionButton
                    action={resolveDispute.bind(null, o.id, "release")}
                    variant="outline"
                    confirm={{
                      title: t("admin.release"),
                      text: t("admin.releaseConfirm"),
                      confirmLabel: t("admin.confirm"),
                      cancelLabel: t("admin.back"),
                    }}
                  >
                    {t("admin.release")}
                  </ActionButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
