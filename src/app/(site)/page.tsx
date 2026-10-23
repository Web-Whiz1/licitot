import { ArrowRight, Gavel } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { LogoMark } from "@/components/brand/logo"
import { LiveDot } from "@/components/live-dot"
import { SearchForm } from "@/components/layout/search-form"
import { Button } from "@/components/ui/button"
import { AuctionGrid } from "@/features/auctions/components/auction-card"
import { AuctionGridSkeleton } from "@/features/auctions/components/card-skeletons"
import { CategoryIcon } from "@/features/auctions/components/category-icon"
import { getHomeSections } from "@/features/auctions/listing"
import { getCategoryTree } from "@/features/auctions/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { PLATFORM_FEE_PERCENT } from "@/lib/money"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <>
      {/* ── Hero: the thesis in the serif; on the right, the guarantees as a trail from the paddle ── */}
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-12 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-16 lg:pb-20">
          <div className="space-y-6">
            <Suspense fallback={<Eyebrow label={t("home.heroEyebrow")} />}>
              <LiveEyebrow />
            </Suspense>
            <h1 className="font-display text-[2.5rem] leading-[1.02] tracking-[-0.02em] text-balance md:text-display">
              {t.rich("home.heroTitle", {
                accent: (chunks) => (
                  <em className="font-serif-italic font-medium text-primary italic">{chunks}</em>
                ),
              })}
            </h1>
            <p className="max-w-lg text-lg text-pretty text-muted-foreground">
              {t("home.heroSubtitle")}
            </p>
            <div className="max-w-xl space-y-4">
              <SearchForm id="search-hero" size="lg" />
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/vinde">{t("home.heroCtaSell")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/cauta">
                    {t("home.heroCtaBrowse")}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <TrustTrail />
        </div>
      </section>

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
    <p className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums">
      <LiveDot className="text-primary" />
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

/**
 * The trail on desktop: a fixed 420×560 box, so the dotted SVG path and the stops line up
 * exactly. It starts under the paddle and winds right, left, right through the four stops
 * (top-left corners below). The path runs behind the stop markers, which mask it.
 */
const TRAIL_STOPS = [
  { x: 12, y: 120, side: "left" },
  { x: 60, y: 250, side: "right" },
  { x: 12, y: 380, side: "left" },
  { x: 60, y: 510, side: "right" },
] as const
// S-curves (a slalom) between the stop centers (32,140) → (388,270) → (32,400) → (388,530);
// the control points keep every curve clear of the text blocks next to the stops.
const TRAIL_PATH =
  "M32 66 V140 C32 280 388 160 388 270 C388 410 32 290 32 400 C32 540 388 420 388 530"

/** The four guarantees as numbered stops on a dotted trail that starts at the paddle. */
async function TrustTrail() {
  const t = await getTranslations("home")
  const stops = [
    { title: t("trust.escrowTitle"), text: t("trust.escrow") },
    { title: t("trust.codeTitle"), text: t("trust.code") },
    { title: t("trust.feeTitle"), text: t("trust.fee", { percent: PLATFORM_FEE_PERCENT }) },
    { title: t("trust.verifiedTitle"), text: t("trust.verified") },
  ]
  return (
    <div className="relative lg:mx-auto lg:h-[560px] lg:w-[420px]">
      <LogoMark className="absolute top-0 left-0 hidden size-16 lg:block" />
      <svg
        aria-hidden
        viewBox="0 0 420 560"
        className="absolute inset-0 hidden size-full text-primary/45 lg:block"
      >
        <path
          d={TRAIL_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="0 10"
        />
      </svg>
      <ol aria-label={t("trustTitle")} className="flex flex-col gap-3 lg:block">
        {stops.map((s, i) => {
          const pos = TRAIL_STOPS[i]!
          return (
            <li
              key={s.title}
              style={{ "--x": `${pos.x}px`, "--y": `${pos.y}px` } as React.CSSProperties}
              className={cn(
                // Phones: a straight dotted trail from one marker to the next.
                "relative flex gap-4 not-last:before:absolute not-last:before:top-11 not-last:before:-bottom-2 not-last:before:left-[19px] not-last:before:border-l-2 not-last:before:border-dotted not-last:before:border-primary/45",
                "lg:absolute lg:top-(--y) lg:left-(--x) lg:w-[348px] lg:before:hidden",
                pos.side === "right" && "lg:flex-row-reverse lg:text-right",
              )}
            >
              <span
                aria-hidden
                className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-background font-display text-lg leading-none text-primary"
              >
                {i + 1}
              </span>
              <div className="pt-2.5">
                <p className="leading-5 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm leading-5 text-pretty text-muted-foreground">{s.text}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
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
              className="flex h-full flex-col items-center gap-2.5 rounded-lg border bg-card px-3 py-5 text-center text-sm font-medium transition-colors duration-150 ease-out hover:border-input hover:bg-muted"
            >
              <CategoryIcon name={c.icon} className="size-6 text-primary" />
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
      <div className="rounded-lg border bg-card px-5 py-10 md:px-10 md:py-12">
        <SectionHeader
          id="pasi"
          eyebrow={t("stepsEyebrow")}
          title={t("stepsTitle")}
          href="/cum-functioneaza"
          seeAll={t("stepsMore")}
        />
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((s, i) => (
            <li key={s.title} className="space-y-3">
              <span className="block font-display text-4xl leading-none text-primary tabular-nums">
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
      <div className="relative isolate overflow-hidden rounded-lg bg-primary px-6 py-12 text-primary-foreground md:px-12 md:py-16 dark:bg-tint dark:text-foreground">
        <LogoMark
          variant="mono"
          className="pointer-events-none absolute -right-10 -bottom-16 -z-10 size-72 text-primary-foreground/10 md:right-6 md:size-96 dark:text-primary/15"
        />
        <div className="max-w-xl space-y-4">
          <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.02em] md:text-5xl">
            {t("sellTitle")}
          </h2>
          <p className="text-lg text-pretty text-primary-foreground/85 dark:text-foreground/80">
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
}: {
  id: string
  eyebrow: string
  title: string
  href?: string
  seeAll?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2
          id={id}
          className="font-display text-[1.75rem] leading-tight text-foreground md:text-3xl"
        >
          {title}
        </h2>
      </div>
      {href && seeAll ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 rounded-md py-1 text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
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
      <h2 className="mb-6 font-display text-[1.75rem] md:text-3xl">{title}</h2>
      <AuctionGridSkeleton count={count} />
    </section>
  )
}
