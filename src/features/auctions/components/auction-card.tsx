import { Gavel, MapPin } from "@/components/icons"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { AuctionThumb } from "@/components/auction-thumb"
import { Countdown } from "@/components/countdown"
import { HammerStamp } from "@/components/hammer-stamp"
import { Price } from "@/components/price"
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
    // No shadow and no lift: hover darkens the border and underlines the title.
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-150 ease-out hover:border-input">
      <div className="relative">
        <AuctionThumb
          path={auction.cover?.path}
          blurDataUrl={auction.cover?.blurDataUrl}
          alt=""
          sizes="(min-width: 1280px) 290px, (min-width: 768px) 25vw, 50vw"
          priority={priority}
          noPhotoLabel={t("auction.noPhoto")}
          className="aspect-[4/3] w-full border-b"
        />
        {auction.ends_at ? (
          <Countdown
            endsAt={auction.ends_at}
            compact
            variant="chip"
            className="absolute top-2 left-2"
          />
        ) : null}
        {auction.status === "ended_sold" ? <HammerStamp className="right-2.5 bottom-2.5" /> : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3 md:p-3.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium md:text-[0.9375rem]">
          {/* Stretched link: the whole card is clickable, one tab stop. */}
          <Link
            href={auctionHref(auction)}
            className="decoration-input underline-offset-3 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
          >
            {auction.title}
          </Link>
        </h3>
        <div className="mt-auto space-y-2">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
              {auction.status === "ended_sold"
                ? t("bid.finalPrice")
                : hasBids
                  ? t("card.currentBid")
                  : t("card.startingPrice")}
            </p>
            <p className="text-lg leading-tight font-bold tracking-tight text-primary md:text-xl">
              <Price bani={auction.current_price} />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gavel aria-hidden className="size-3.5" />
              {t("auction.bids", { count: auction.bid_count })}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{auction.city}</span>
            </span>
          </div>
        </div>
      </div>
      {/* Focus ring for the stretched link. */}
      <span className="pointer-events-none absolute inset-0 rounded-lg ring-ring group-has-[a:focus-visible]:ring-2" />
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
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {auctions.map((a, i) => (
        <li key={a.id}>
          <AuctionCard auction={a} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  )
}
