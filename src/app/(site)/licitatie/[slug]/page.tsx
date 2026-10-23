import { BadgeCheck, CalendarDays, MapPin, Star, Tag, Truck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { HammerStamp } from "@/components/hammer-stamp"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { AuctionGrid, auctionHref } from "@/features/auctions/components/auction-card"
import { Gallery } from "@/features/auctions/components/gallery"
import { AuctionStatusBadge } from "@/features/auctions/components/status-badge"
import { BidBox } from "@/features/bids/components/bid-box"
import type { LiveAuction } from "@/features/bids/live-store"
import { ViewerBidBox } from "@/features/bids/components/viewer-bid-box"
import { ReportButton } from "@/features/moderation/components/report-button"
import { ViewerWatchButton } from "@/features/watchlist/viewer-watch-button"
import { WatchButton } from "@/features/watchlist/watch-button"
import { getPublicAuction, getSimilarAuctions } from "@/features/auctions/listing"
import { getCategoryTree } from "@/features/auctions/queries"
import { APP_LOCALE, APP_TIME_ZONE } from "@/lib/dates"
import { publicEnv } from "@/lib/env"
import { imagekitUrl } from "@/lib/imagekit"
import { formatRON } from "@/lib/money"
import { SITE_URL } from "@/lib/site"

const memberSince = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
})

/** "/licitatie/<uuid>-<slug>" → uuid (the slug part is cosmetic and may change). */
function parseId(param: string): string | null {
  const id = decodeURIComponent(param).slice(0, 36)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ? id : null
}

async function load(param: string) {
  const id = parseId(param)
  return id ? getPublicAuction(id) : null
}

export async function generateMetadata({
  params,
}: PageProps<"/licitatie/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const a = await load(slug)
  if (!a) return { title: (await getTranslations("detail"))("notFoundTitle") }
  const cover = a.auction_images[0]
  const description = a.description.slice(0, 160)
  return {
    title: a.title,
    description,
    alternates: { canonical: auctionHref(a) },
    openGraph: {
      title: a.title,
      description,
      type: "website",
      url: auctionHref(a),
      images: cover
        ? [
            {
              url: imagekitUrl(publicEnv.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT, cover.path, {
                width: 1200,
                height: 630,
              }),
              width: 1200,
              height: 630,
              alt: a.title,
            },
          ]
        : undefined,
    },
  }
}

export default function AuctionPage({ params }: PageProps<"/licitatie/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <Suspense fallback={<DetailSkeleton />}>
        <AuctionDetail params={params} />
      </Suspense>
    </div>
  )
}

async function AuctionDetail({ params }: Pick<PageProps<"/licitatie/[slug]">, "params">) {
  const { slug } = await params
  const a = await load(slug)
  if (!a) notFound()
  // Canonical URL: fix outdated or missing slugs.
  if (decodeURIComponent(slug) !== `${a.id}-${a.slug}`) permanentRedirect(auctionHref(a))

  const t = await getTranslations()
  const isActive = a.status === "active"
  const live: LiveAuction = {
    id: a.id,
    seller_id: a.seller_id,
    status: a.status,
    starting_price: a.starting_price,
    min_increment: a.min_increment,
    buy_now_price: a.buy_now_price,
    current_price: a.current_price,
    bid_count: a.bid_count,
    high_bidder_id: a.high_bidder_id,
    ends_at: a.ends_at,
    has_reserve: a.has_reserve,
    reserve_met: a.reserve_met,
    final_price: a.final_price,
    winner_id: a.winner_id,
    updated_at: a.updated_at,
  }
  const seller = a.seller
  const category = a.category
  const parent = category?.parent_id
    ? (await getCategoryTree()).find((g) => g.id === category.parent_id)
    : undefined
  const price = (bani: number) => formatRON(bani, { compact: true })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: a.title,
    description: a.description,
    image: a.auction_images.map((i) =>
      imagekitUrl(publicEnv.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT, i.path, { width: 1200 }),
    ),
    category: category?.name,
    itemCondition:
      a.condition === "nou"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${auctionHref(a)}`,
      priceCurrency: "RON",
      price: (a.current_price / 100).toFixed(2),
      priceValidUntil: a.ends_at ?? undefined,
      availability: isActive ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      seller: seller ? { "@type": "Person", name: seller.display_name } : undefined,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so user content can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label={t("detail.breadcrumb")} className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/" className="hover:underline">
              {t("detail.home")}
            </Link>
          </li>
          {parent ? (
            <li>
              {"/ "}
              <Link href={`/categorie/${parent.slug}`} className="hover:underline">
                {parent.name}
              </Link>
            </li>
          ) : null}
          {category ? (
            <li>
              {"/ "}
              <Link href={`/categorie/${category.slug}`} className="hover:underline">
                {category.name}
              </Link>
            </li>
          ) : null}
        </ol>
      </nav>

      {/* Mobile order: photos → price/bid box → description. Desktop: sticky box on the right. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr]">
        <div className="relative min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery photos={a.auction_images} title={a.title} />
          {a.status === "ended_sold" ? (
            <HammerStamp className="top-4 right-4 px-3 text-lg md:top-5 md:right-5" />
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="space-y-4 rounded-lg border bg-card p-5 md:p-6">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <AuctionStatusBadge status={a.status} />
                <Suspense fallback={<WatchButton auctionId={a.id} watched={undefined} signedIn />}>
                  <ViewerWatchButton auctionId={a.id} sellerId={a.seller_id} />
                </Suspense>
              </div>
              <h1 className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em] break-words md:text-3xl">
                {a.title}
              </h1>
            </div>

            <Suspense fallback={<BidBox initial={live} viewer={undefined} />}>
              <ViewerBidBox initial={live} />
            </Suspense>
          </div>

          {seller ? (
            <div className="space-y-4 rounded-lg border bg-card p-5 md:p-6">
              <h2 className="text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                {t("detail.seller")}
              </h2>
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={seller.display_name}
                  avatarPath={seller.avatar_path}
                  size={48}
                  className="size-12"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{seller.display_name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star aria-hidden className="size-3.5" />
                    {seller.rating_count > 0 && seller.rating_avg !== null
                      ? t("profile.rating", {
                          avg: seller.rating_avg.toLocaleString(APP_LOCALE, {
                            maximumFractionDigits: 1,
                          }),
                          count: seller.rating_count,
                        })
                      : t("profile.noRating")}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays aria-hidden className="size-3.5" />
                    {t("detail.memberSince", {
                      date: memberSince.format(new Date(seller.created_at)),
                    })}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/u/${seller.username}`}>{t("detail.viewProfile")}</Link>
              </Button>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="description-title" className="space-y-3">
            <h2 id="description-title" className="font-display text-2xl tracking-[-0.02em]">
              {t("detail.description")}
            </h2>
            <p className="leading-relaxed whitespace-pre-line">{a.description}</p>
            <ReportButton auctionId={a.id} />
          </section>

          <section aria-labelledby="details-title" className="space-y-3">
            <h2 id="details-title" className="font-display text-2xl tracking-[-0.02em]">
              {t("detail.details")}
            </h2>
            <dl className="grid gap-x-6 gap-y-4 rounded-lg border bg-card p-5 text-sm sm:grid-cols-2 md:p-6">
              <Detail icon={BadgeCheck} label={t("detail.condition")}>
                {t(`sell.conditions.${a.condition}`)}
              </Detail>
              <Detail icon={Tag} label={t("detail.category")}>
                {category ? (
                  <Link
                    href={`/categorie/${category.slug}`}
                    className="text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                ) : null}
              </Detail>
              <Detail icon={MapPin} label={t("detail.location")}>
                {a.county?.name && a.county.name !== a.city
                  ? `${a.city}, ${a.county.name}`
                  : a.city}
              </Detail>
              <Detail icon={Truck} label={t("detail.shipping")}>
                <ul>
                  {a.ship_pickup ? <li>{t("detail.pickup", { city: a.city })}</li> : null}
                  {a.ship_courier ? (
                    <li>
                      {a.courier_cost
                        ? t("detail.courier", { price: price(a.courier_cost) })
                        : t("detail.courierFree")}
                    </li>
                  ) : null}
                </ul>
              </Detail>
            </dl>
          </section>
        </div>
      </div>

      {category ? (
        <Suspense fallback={null}>
          <Similar categoryId={category.id} excludeId={a.id} title={t("detail.similar")} />
        </Suspense>
      ) : null}
    </>
  )
}

async function Similar({
  categoryId,
  excludeId,
  title,
}: {
  categoryId: number
  excludeId: string
  title: string
}) {
  const items = await getSimilarAuctions(categoryId, excludeId)
  if (!items.length) return null
  return (
    <section aria-labelledby="similar-title" className="mt-12">
      <h2 id="similar-title" className="mb-6 font-display text-3xl tracking-[-0.02em] md:text-4xl">
        {title}
      </h2>
      <AuctionGrid auctions={items} />
    </section>
  )
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}
