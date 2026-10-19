import { Trophy } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { auctionHref } from "@/features/auctions/components/auction-card"
import { AuctionListItem } from "@/features/auctions/components/auction-list-item"
import { requireUser } from "@/features/auth/session"
import { getWonAuctions } from "@/features/bids/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatDate } from "@/lib/dates"
import { formatRON } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("won"), robots: { index: false } }
}

export default async function WonPage() {
  const t = await getTranslations("account")
  const tAll = await getTranslations()
  const user = await requireUser("/cont/castigate")
  const rows = await getWonAuctions(user.id)

  if (rows.length === 0) return <EmptyState icon={Trophy} title={t("empty.won")} />

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {rows.map((a) => {
        const shipping = [
          a.ship_pickup ? t("won.pickup", { city: a.city }) : null,
          a.ship_courier ? t("won.courier") : null,
        ]
          .filter(Boolean)
          .join(", ")
        return (
          <AuctionListItem
            key={a.id}
            href={auctionHref(a)}
            title={a.title}
            cover={a.cover}
            highlight={a.order?.status === "pending_payment" ? "warning" : undefined}
            badges={
              a.order ? (
                <Badge variant={a.order.status === "pending_payment" ? "warning" : "tint"}>
                  {tAll(`orders.status.${a.order.status}`)}
                </Badge>
              ) : null
            }
            actions={
              a.order ? (
                <Button
                  asChild
                  size="sm"
                  variant={a.order.status === "pending_payment" ? "default" : "outline"}
                >
                  <Link href={`/cont/comanda/${a.order.id}`}>
                    {a.order.status === "pending_payment" ? t("won.pay") : t("won.details")}
                  </Link>
                </Button>
              ) : null
            }
          >
            <p className="text-sm">
              <span className="font-bold text-primary">
                {t("won.price", { price: formatRON(a.final_price ?? 0, { compact: true }) })}
              </span>
              {a.ends_at ? (
                <span className="text-muted-foreground">
                  {" "}
                  {t("won.on", { date: formatDate(a.ends_at) })}
                </span>
              ) : null}
            </p>
            {a.seller ? (
              <p className="text-sm text-muted-foreground">
                {t("won.seller", { name: a.seller.display_name })}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t("won.shipping", { options: shipping })}
            </p>
          </AuctionListItem>
        )
      })}
    </ul>
  )
}
