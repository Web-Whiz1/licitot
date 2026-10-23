import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  Gavel,
  KeyRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { AuctionThumb } from "@/components/auction-thumb"
import { LogoMark } from "@/components/brand/logo"
import { Countdown } from "@/components/countdown"
import { LiveDot } from "@/components/live-dot"
import { SearchForm } from "@/components/layout/search-form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuctionGrid, auctionHref } from "@/features/auctions/components/auction-card"
import { AuctionGridSkeleton } from "@/features/auctions/components/card-skeletons"
import { CategoryIcon } from "@/features/auctions/components/category-icon"
import { getHomeSections, type AuctionCardData } from "@/features/auctions/listing"
import { getCategoryTree } from "@/features/auctions/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatRON, PLATFORM_FEE_PERCENT } from "@/lib/money"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <>
      {/* ── Hero: a clear blue sky, with the auctions closest to the hammer on the right ── */}
      <section className="relative isolate overflow-hidden bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-32 -z-10 size-[44rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--card)_85%,transparent)_0%,transparent_62%)] dark:bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_30%,transparent)_0%,transparent_62%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-72 -left-48 -z-10 size-[38rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent)_0%,transparent_65%)]"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-10 pb-14 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-20 lg:pb-24">
          <div className="space-y-7">
            <Suspense fallback={<Eyebrow label={t("home.heroEyebrow")} />}>
              <LiveEyebrow />
            </Suspense>
            <h1 className="font-display text-[2.75rem] leading-[0.98] tracking-[-0.045em] text-balance md:text-display">
              {t.rich("home.heroTitle", {
                accent: (chunks) => <span className="text-primary">{chunks}</span>,
              })}
            </h1>
            <p className="max-w-lg animate-rise text-lg text-pretty text-muted-foreground [animation-delay:80ms]">
              {t("home.heroSubtitle")}
            </p>
            <div className="max-w-xl animate-rise space-y-4 [animation-delay:160ms]">
              <SearchForm id="search-hero" size="lg" />
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/vinde">{t("home.heroCtaSell")}</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-transparent bg-card/60 backdrop-blur-md hover:bg-card"
                >
                  <Link href="/cauta">
                    {t("home.heroCtaBrowse")}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <Suspense fallback={<LiveStackSkeleton />}>
            <LiveStack />
          </Suspense>
        </div>
      </section>

      <TrustStrip />

      <Categories />

      <Suspense fallback={<SectionSkeleton title={t("home.endingSoon")} count={4} />}>
        <Sections />
      </Suspense>

      <Steps />

      <SellBand />
    </>
  )
}

function Eyebrow({ label }: { label: string }) {
  return (
    <p className="inline-flex animate-rise items-center gap-2 rounded-full bg-card/70 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-primary/15 backdrop-blur-md">
      <LiveDot pulse className="text-primary" />
      {label}
    </p>
  )
}

/** "N licitații live acum" from the real count (the generic line while none are live). */
async function LiveEyebrow() {
  const [t, sections] = await Promise.all([getTranslations("home"), getHomeSections()])
  return (
    <Eyebrow
      label={
        sections.liveCount > 0 ? t("liveCount", { count: sections.liveCount }) : t("heroEyebrow")
      }
    />
  )
}

/** The two auctions closest to the hammer, as overlapping cards with live countdowns. */
async function LiveStack() {
  const [t, sections] = await Promise.all([getTranslations(), getHomeSections()])
  const items = sections.endingSoon.slice(0, 2)

  if (items.length === 0) {
    return (
      <div className="relative hidden justify-center lg:flex">
        <div className="grid w-full max-w-sm animate-rise justify-items-center gap-5 rounded-[2.5rem] bg-card/55 px-8 py-12 text-center ring-1 ring-card backdrop-blur-md">
          <LogoMark className="size-36 -rotate-3" />
          <div className="space-y-1">
            <p className="text-xl font-bold tracking-tight">{t("home.liveEmptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("home.liveEmptyHint")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ul
      className={cn(
        "relative mx-auto w-full max-w-md",
        items.length > 1 ? "h-[27rem] sm:h-[30.5rem]" : "h-auto",
      )}
    >
      {items.map((a, i) => (
        <li
          key={a.id}
          className={cn(
            "animate-rise",
            items.length > 1 &&
              (i === 0
                ? "absolute top-0 right-0 z-10 w-[78%] rotate-[4deg] [animation-delay:120ms]"
                : "absolute top-24 left-0 z-20 w-[78%] -rotate-[5deg] [animation-delay:240ms]"),
            items.length === 1 && "mx-auto w-[82%] -rotate-2",
          )}
        >
          <StackCard auction={a} priority={i === 0} />
        </li>
      ))}
    </ul>
  )
}

function StackCard({ auction: a, priority }: { auction: AuctionCardData; priority: boolean }) {
  const t = useTranslations()
  const hasBids = a.bid_count > 0
  return (
    <Link
      href={auctionHref(a)}
      className="group block overflow-hidden rounded-[1.5rem] border bg-card text-card-foreground shadow-overlay transition-transform duration-300 ease-snap hover:-translate-y-1.5 hover:rotate-0"
    >
      <div className="relative">
        <AuctionThumb
          path={a.cover?.path}
          blurDataUrl={a.cover?.blurDataUrl}
          alt=""
          sizes="(min-width: 1024px) 360px, 80vw"
          priority={priority}
          noPhotoLabel={t("auction.noPhoto")}
          className="aspect-[4/3] w-full"
          imageClassName="transition-transform duration-500 ease-snap group-hover:scale-[1.04]"
        />
        {a.ends_at ? (
          <Countdown endsAt={a.ends_at} compact variant="chip" className="absolute top-3 left-3" />
        ) : null}
      </div>
      <div className="space-y-2.5 p-4">
        <p className="line-clamp-1 text-[0.9375rem] font-semibold">{a.title}</p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {hasBids ? t("card.currentBid") : t("card.startingPrice")}
            </p>
            <p className="text-2xl leading-tight font-bold tracking-tight text-primary tabular-nums">
              {formatRON(a.current_price, { compact: true })}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Gavel aria-hidden className="size-3.5" />
            {t("auction.bids", { count: a.bid_count })}
          </span>
        </div>
      </div>
    </Link>
  )
}

function LiveStackSkeleton() {
  return (
    <div aria-hidden className="relative mx-auto h-[27rem] w-full max-w-md sm:h-[30.5rem]">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={cn(
            "absolute w-[78%] overflow-hidden rounded-[1.5rem] border bg-card shadow-overlay",
            i === 0 ? "top-0 right-0 rotate-[4deg]" : "top-24 left-0 -rotate-[5deg]",
          )}
        >
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

async function TrustStrip() {
  const t = await getTranslations("home")
  const items: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: ShieldCheck, title: t("trust.escrowTitle"), text: t("trust.escrow") },
    { icon: KeyRound, title: t("trust.codeTitle"), text: t("trust.code") },
    {
      icon: BadgePercent,
      title: t("trust.feeTitle"),
      text: t("trust.fee", { percent: PLATFORM_FEE_PERCENT }),
    },
    { icon: BadgeCheck, title: t("trust.verifiedTitle"), text: t("trust.verified") },
  ]
  return (
    <section aria-label={t("trustTitle")} className="border-b bg-card">
      <ul className="mx-auto grid max-w-7xl gap-x-6 gap-y-5 px-4 py-8 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-tint text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function Categories() {
  const [t, tree] = await Promise.all([getTranslations("home"), getCategoryTree()])
  return (
    <section aria-labelledby="categorii" className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
      <SectionHeader id="categorii" eyebrow={t("eyebrowCategories")} title={t("categories")} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {tree.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categorie/${c.slug}`}
              className="group flex h-full flex-col items-center gap-3 rounded-lg border bg-card px-3 py-5 text-center text-sm font-medium transition-[transform,box-shadow,border-color] duration-300 ease-snap hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="grid size-12 place-items-center rounded-lg bg-tint text-primary transition-[background-color,color,transform] duration-300 ease-snap group-hover:-rotate-6 group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function Sections() {
  const [t, sections] = await Promise.all([getTranslations("home"), getHomeSections()])
  const featured = sections.featured.filter((a) => a.bid_count > 0)
  if (sections.endingSoon.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
        <EmptyState
          icon={Gavel}
          title={t("emptyTitle")}
          hint={t("emptyHint")}
          action={
            <Button asChild>
              <Link href="/vinde">{t("heroCtaSell")}</Link>
            </Button>
          }
        />
      </section>
    )
  }
  // With few live auctions every section would list the same items: show each only once.
  const showNewest = sections.endingSoon.length >= 8
  return (
    <>
      {featured.length >= 4 ? (
        <Section
          id="recomandate"
          eyebrow={t("eyebrowFeatured")}
          title={t("featured")}
          href="/cauta?ordine=oferte"
          seeAll={t("seeAll")}
        >
          <AuctionGrid auctions={featured} priorityCount={2} />
        </Section>
      ) : null}
      <Section
        id="se-termina"
        eyebrow={t("eyebrowEndingSoon")}
        title={t("endingSoon")}
        href="/cauta"
        seeAll={t("seeAll")}
      >
        <AuctionGrid auctions={sections.endingSoon} priorityCount={featured.length >= 4 ? 0 : 2} />
      </Section>
      {showNewest ? (
        <Section
          id="recente"
          eyebrow={t("eyebrowNewest")}
          title={t("newlyListed")}
          href="/cauta?ordine=noi"
          seeAll={t("seeAll")}
        >
          <AuctionGrid auctions={sections.newest} />
        </Section>
      ) : null}
    </>
  )
}

async function Steps() {
  const t = await getTranslations("home")
  const steps = [
    { title: t("steps.s1t"), text: t("steps.s1") },
    { title: t("steps.s2t"), text: t("steps.s2") },
    { title: t("steps.s3t"), text: t("steps.s3") },
  ]
  return (
    <section aria-labelledby="pasi" className="mx-auto max-w-7xl px-4 pt-20 md:px-6">
      <div className="rounded-[2rem] bg-tint px-5 py-10 text-tint-foreground md:px-10 md:py-14">
        <SectionHeader
          id="pasi"
          eyebrow={t("stepsEyebrow")}
          title={t("stepsTitle")}
          href="/cum-functioneaza"
          seeAll={t("stepsMore")}
          tone="tint"
        />
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((s, i) => (
            <li key={s.title} className="space-y-3">
              <span className="block font-display text-5xl leading-none text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

async function SellBand() {
  const t = await getTranslations("home")
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-primary-foreground md:px-12 md:py-16">
        <LogoMark
          variant="mono"
          className="pointer-events-none absolute -right-10 -bottom-16 -z-10 size-72 text-primary-foreground/10 md:right-6 md:size-96"
        />
        <div className="max-w-xl space-y-4">
          <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.025em] md:text-5xl">
            {t("sellTitle")}
          </h2>
          <p className="text-lg text-pretty text-primary-foreground/85">
            {t("sellText", { percent: PLATFORM_FEE_PERCENT })}
          </p>
          <Button asChild size="lg" variant="inverse" className="mt-2">
            <Link href="/vinde">
              {t("sellCta")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function SectionHeader({
  id,
  eyebrow,
  title,
  href,
  seeAll,
  tone = "default",
}: {
  id: string
  eyebrow: string
  title: string
  href?: string
  seeAll?: string
  tone?: "default" | "tint"
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="space-y-1.5">
        <p
          className={
            tone === "tint"
              ? "text-xs font-semibold tracking-[0.14em] text-tint-foreground uppercase"
              : "text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
          }
        >
          {eyebrow}
        </p>
        <h2
          id={id}
          className="font-display text-3xl leading-tight tracking-[-0.02em] text-foreground md:text-4xl"
        >
          {title}
        </h2>
      </div>
      {href && seeAll ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 rounded-full py-1 text-sm font-semibold text-primary"
        >
          {seeAll}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-200 ease-snap group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  )
}

function Section({
  id,
  eyebrow,
  title,
  href,
  seeAll,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  href: string
  seeAll: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
      <SectionHeader id={id} eyebrow={eyebrow} title={title} href={href} seeAll={seeAll} />
      {children}
    </section>
  )
}

function SectionSkeleton({ title, count }: { title: string; count: number }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 md:px-6">
      <h2 className="mb-6 font-display text-3xl tracking-[-0.02em] md:text-4xl">{title}</h2>
      <AuctionGridSkeleton count={count} />
    </section>
  )
}
