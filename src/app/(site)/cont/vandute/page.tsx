import { PackageCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { auctionHref } from "@/features/auctions/components/auction-card"
import { AuctionListItem } from "@/features/auctions/components/auction-list-item"
import { requireUser } from "@/features/auth/session"
import { getSoldAuctions } from "@/features/bids/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatDate } from "@/lib/dates"
import { formatRON } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("sold"), robots: { index: false } }
}

export default async function SoldPage() {
  const t = await getTranslations()
  const user = await requireUser("/cont/vandute")
  const rows = await getSoldAuctions(user.id)

  if (rows.length === 0) return <EmptyState icon={PackageCheck} title={t("account.empty.sold")} />

  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      {rows.map((a) => (
        <AuctionListItem
          key={a.id}
          href={auctionHref(a)}
          title={a.title}
          cover={a.cover}
          highlight={a.order?.status === "paid" ? "success" : undefined}
          badges={
            a.order ? (
              <Badge variant={a.order.status === "paid" ? "success" : "secondary"}>
                {t(`orders.status.${a.order.status}`)}
              </Badge>
            ) : null
          }
          actions={
            a.order ? (
              <Button asChild size="sm" variant={a.order.status === "paid" ? "default" : "outline"}>
                <Link href={`/cont/comanda/${a.order.id}`}>{t("account.sold.details")}</Link>
              </Button>
            ) : null
          }
        >
          <p className="text-sm">
            <span className="font-bold text-primary">
              {t("account.sold.price", {
                price: formatRON(a.final_price ?? 0, { compact: true }),
              })}
            </span>
            {a.ends_at ? (
              <span className="text-muted-foreground">
                {" "}
                {t("account.sold.on", { date: formatDate(a.ends_at) })}
              </span>
            ) : null}
            <span className="text-muted-foreground">
              {" · "}
              {t("auction.bids", { count: a.bid_count })}
            </span>
          </p>
          {a.winner ? (
            <p className="text-sm text-muted-foreground">
              {t("account.sold.buyer", { name: a.winner.display_name })}
            </p>
          ) : null}
        </AuctionListItem>
      ))}
    </ul>
  )
}
