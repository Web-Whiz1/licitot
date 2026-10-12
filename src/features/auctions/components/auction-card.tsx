import { Gavel, MapPin } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { AuctionThumb } from "@/components/auction-thumb"
import { Countdown } from "@/components/countdown"
import { formatRON } from "@/lib/money"
import type { AuctionCardData } from "../listing"

export const auctionHref = (a: { id: string; slug: string }) => `/licitatie/${a.id}-${a.slug}`

export function AuctionCard({
  auction,
  priority = false,
}: {
  auction: AuctionCardData
  priority?: boolean
}) {
  const t = useTranslations()
  const hasBids = auction.bid_count > 0

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-shadow hover:shadow-raised">
      <AuctionThumb
        path={auction.cover?.path}
        blurDataUrl={auction.cover?.blurDataUrl}
        alt=""
        sizes="(min-width: 1280px) 290px, (min-width: 768px) 25vw, 50vw"
        priority={priority}
        noPhotoLabel={t("auction.noPhoto")}
        className="aspect-[4/3] w-full"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
          {/* Stretched link: the whole card is clickable, one tab stop. */}
          <Link
            href={auctionHref(auction)}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {auction.title}
          </Link>
        </h3>
        <div className="mt-auto space-y-1">
          <p className="text-xs text-muted-foreground">
            {hasBids ? t("card.currentBid") : t("card.startingPrice")}
          </p>
          <p className="text-lg leading-none font-extrabold text-primary">
            {formatRON(auction.current_price, { compact: true })}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
            {auction.ends_at ? <Countdown endsAt={auction.ends_at} compact /> : null}
            <span className="inline-flex items-center gap-1">
              <Gavel aria-hidden className="size-3.5" />
              {t("auction.bids", { count: auction.bid_count })}
            </span>
          </div>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin aria-hidden className="size-3.5" />
            {auction.city}
          </p>
        </div>
      </div>
      {/* Focus ring for the stretched link. */}
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-ring group-has-[a:focus-visible]:ring-2" />
    </article>
  )
}

export function AuctionGrid({
  auctions,
  priorityCount = 0,
}: {
  auctions: AuctionCardData[]
  priorityCount?: number
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {auctions.map((a, i) => (
        <li key={a.id}>
          <AuctionCard auction={a} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  )
}
