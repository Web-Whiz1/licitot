import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { getAdminStats } from "@/features/moderation/queries"
import { formatRON } from "@/lib/money"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.tabs")
  return { title: t("stats"), robots: { index: false } }
}

export default async function AdminStatsPage() {
  const t = await getTranslations("admin.stats")
  const s = await getAdminStats()
  const n = (k: string) => s[k] ?? 0
  const ron = (k: string) => formatRON(n(k), { compact: true })

  const cards: {
    label: string
    value: string | number
    hint?: string
    href?: string
    alert?: boolean
  }[] = [
    {
      label: t("users"),
      value: n("users"),
      hint: t("usersNew", { week: n("users_7d"), month: n("users_30d") }),
    },
    {
      label: t("activeAuctions"),
      value: n("active_auctions"),
      hint: t("published30d", { count: n("published_30d") }),
    },
    { label: t("bids30d"), value: n("bids_30d") },
    { label: t("completedOrders"), value: n("orders_completed") },
    { label: t("gmv"), value: ron("gmv"), hint: t("gmv30d", { amount: ron("gmv_30d") }) },
    { label: t("fees"), value: ron("fees"), hint: t("fees30d", { amount: ron("fees_30d") }) },
    { label: t("held"), value: ron("held"), hint: t("heldHint") },
    { label: t("awaitingPayment"), value: n("awaiting_payment") },
    {
      label: t("openDisputes"),
      value: n("open_disputes"),
      href: "/admin/dispute",
      alert: n("open_disputes") > 0,
    },
    {
      label: t("openReports"),
      value: n("open_reports"),
      href: "/admin/rapoarte",
      alert: n("open_reports") > 0,
    },
    { label: t("banned"), value: n("banned_users"), href: "/admin/rapoarte" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cards.map((c) => {
        const body = (
          <>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight tabular-nums",
                c.alert && "text-warning",
              )}
            >
              {c.value}
            </p>
            {c.hint ? <p className="text-xs text-muted-foreground">{c.hint}</p> : null}
          </>
        )
        return c.href ? (
          <Link
            key={c.label}
            href={c.href}
            className="space-y-1 rounded-lg border bg-card p-4 hover:bg-muted"
          >
            {body}
          </Link>
        ) : (
          <div key={c.label} className="space-y-1 rounded-lg border bg-card p-4">
            {body}
          </div>
        )
      })}
    </div>
  )
}
