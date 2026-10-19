import { Flag } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ActionButton } from "@/components/action-button"
import { Badge } from "@/components/ui/badge"
import { auctionHref } from "@/features/auctions/components/auction-card"
import {
  adminHideAuction,
  adminResolveReport,
  adminSetBanned,
  adminUnhideAuction,
} from "@/features/moderation/actions"
import { getHiddenAuctions, getOpenReports, getSuspendedUsers } from "@/features/moderation/queries"
import type { REPORT_REASONS } from "@/features/moderation/schemas"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatDateTime } from "@/lib/dates"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.tabs")
  return { title: t("reports"), robots: { index: false } }
}

/** Reports queue + suspended accounts + hidden listings (the admin layout checks the role). */
export default async function AdminReportsPage() {
  const t = await getTranslations()
  const [reports, suspended, hidden] = await Promise.all([
    getOpenReports(),
    getSuspendedUsers(),
    getHiddenAuctions(),
  ])
  const confirm = (title: string, text?: string) => ({
    title,
    text,
    confirmLabel: t("admin.confirm"),
    cancelLabel: t("admin.back"),
  })

  return (
    <div className="space-y-10">
      <section aria-labelledby="reports" className="space-y-4">
        <h2 id="reports" className="font-display text-xl tracking-tight">
          {t("admin.reportsTitle")}
        </h2>
        {reports.length === 0 ? (
          <EmptyState icon={Flag} title={t("admin.reportsEmpty")} />
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const reason = r.reason as (typeof REPORT_REASONS)[number]
              // The account to act on: the reported user, or the listing's seller.
              const targetUserId = r.reported?.id ?? r.auction?.seller_id ?? null
              return (
                <li key={r.id} className="space-y-3 rounded-2xl border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.auction ? "tint" : "neutral"}>
                      {r.auction ? t("admin.reportedAuction") : t("admin.reportedUser")}
                    </Badge>
                    {r.auction ? (
                      <Link href={auctionHref(r.auction)} className="font-semibold hover:underline">
                        {r.auction.title}
                      </Link>
                    ) : r.reported ? (
                      <Link
                        href={`/u/${r.reported.username}`}
                        className="font-semibold hover:underline"
                      >
                        {r.reported.display_name}
                      </Link>
                    ) : null}
                  </div>
                  <p className="text-sm">
                    {t("admin.reportReason", { reason: t(`reports.reasons.${reason}`) })}
                  </p>
                  {r.details ? (
                    <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">
                      {r.details}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reportedBy", {
                      name: r.reporter?.display_name ?? "—",
                      date: formatDateTime(r.created_at),
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {r.auction && !r.auction.is_hidden ? (
                      <ActionButton
                        action={adminHideAuction.bind(null, r.auction.id)}
                        variant="destructive"
                        size="sm"
                        confirm={confirm(t("admin.hide"), t("admin.hideConfirm"))}
                      >
                        {t("admin.hide")}
                      </ActionButton>
                    ) : null}
                    {targetUserId ? (
                      <ActionButton
                        action={adminSetBanned.bind(null, targetUserId, true)}
                        variant="destructive"
                        size="sm"
                        confirm={confirm(t("admin.ban"), t("admin.banConfirm"))}
                      >
                        {t("admin.ban")}
                      </ActionButton>
                    ) : null}
                    <ActionButton
                      action={adminResolveReport.bind(null, r.id, "resolved")}
                      variant="outline"
                      size="sm"
                    >
                      {t("admin.resolve")}
                    </ActionButton>
                    <ActionButton
                      action={adminResolveReport.bind(null, r.id, "dismissed")}
                      variant="ghost"
                      size="sm"
                    >
                      {t("admin.dismiss")}
                    </ActionButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="suspended" className="space-y-3">
        <h2 id="suspended" className="text-lg font-bold tracking-tight">
          {t("admin.suspendedTitle")}
        </h2>
        {suspended.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.suspendedEmpty")}</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {suspended.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <span className="text-sm">
                  <span className="font-medium">{u.display_name}</span>{" "}
                  <span className="text-muted-foreground">@{u.username}</span>
                </span>
                <ActionButton
                  action={adminSetBanned.bind(null, u.id, false)}
                  variant="outline"
                  size="sm"
                >
                  {t("admin.unban")}
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="hidden" className="space-y-3">
        <h2 id="hidden" className="text-lg font-bold tracking-tight">
          {t("admin.hiddenTitle")}
        </h2>
        {hidden.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.hiddenEmpty")}</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {hidden.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <Link href={auctionHref(a)} className="text-sm font-medium hover:underline">
                  {a.title}
                </Link>
                <ActionButton
                  action={adminUnhideAuction.bind(null, a.id)}
                  variant="outline"
                  size="sm"
                >
                  {t("admin.unhide")}
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
