import { Hand } from "@/components/icons"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Countdown } from "@/components/countdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { auctionHref } from "@/features/auctions/components/auction-card"
import { AuctionListItem } from "@/features/auctions/components/auction-list-item"
import { requireUser } from "@/features/auth/session"
import { getMyBids } from "@/features/bids/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatRON } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("bids"), robots: { index: false } }
}

const price = (bani: number) => formatRON(bani, { compact: true })

export default async function MyBidsPage() {
  const t = await getTranslations("account")
  const user = await requireUser("/cont/oferte")
  const rows = await getMyBids(user.id)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Hand}
        title={t("empty.bids")}
        action={
          <Button asChild>
            <Link href="/cauta">{t("browse")}</Link>
          </Button>
        }
      />
    )
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      {rows.map(({ auction: a, max_amount }) => {
        const href = auctionHref(a)
        const active = a.status === "active"
        const leading = a.high_bidder_id === user.id
        const state = active
          ? leading
            ? { label: t("myBids.leading"), variant: "success" as const }
            : { label: t("myBids.outbid"), variant: "warning" as const }
          : a.winner_id === user.id
            ? { label: t("myBids.won"), variant: "success" as const }
            : {
                label: a.status === "ended_sold" ? t("myBids.lost") : t("myBids.ended"),
                variant: "secondary" as const,
              }
        return (
          <AuctionListItem
            key={a.id}
            href={href}
            title={a.title}
            cover={a.cover}
            highlight={active && !leading ? "warning" : undefined}
            badges={
              <>
                <Badge variant={state.variant}>{state.label}</Badge>
                {active && a.ends_at ? (
                  <Countdown endsAt={a.ends_at} compact className="text-xs text-muted-foreground" />
                ) : null}
              </>
            }
            actions={
              active && !leading ? (
                <Button asChild size="sm">
                  <Link href={href}>{t("myBids.raise")}</Link>
                </Button>
              ) : null
            }
          >
            <p className="text-sm">
              <span className="font-bold text-primary">
                {t("myBids.current", { amount: price(a.final_price ?? a.current_price) })}
              </span>
              <span className="text-muted-foreground">
                {" · "}
                {t("myBids.yourMax", { amount: price(max_amount) })}
              </span>
            </p>
          </AuctionListItem>
        )
      })}
    </ul>
  )
}
