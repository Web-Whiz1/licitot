import { ArrowRight } from "@/components/icons"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import aboutPhoto from "@/assets/home/about.webp"
import bidPhoto from "@/assets/home/bid.webp"
import findPhoto from "@/assets/home/find.webp"
import heroPhoto from "@/assets/home/hero.webp"
import sellPhoto from "@/assets/home/sell.webp"
import winPhoto from "@/assets/home/win.webp"
import { LiveDot } from "@/components/live-dot"
import { SearchForm } from "@/components/layout/search-form"
import { PhotoTile } from "@/components/photo-tile"
import { Button } from "@/components/ui/button"
import { AuctionGrid } from "@/features/auctions/components/auction-card"
import { AuctionGridSkeleton } from "@/features/auctions/components/card-skeletons"
import { getHomeSections } from "@/features/auctions/listing"
import { getCategoryTree } from "@/features/auctions/queries"
import { CategoryCards } from "@/features/home/components/category-cards"
import { PLATFORM_FEE_PERCENT } from "@/lib/money"
import { cn } from "@/lib/utils"

// The home page speaks the language of the category cards: real photographs in mounted tiles,
// serif type set on them, magazine layouts.

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <>
      {/* ── Hero: the thesis on the paper, a mounted photograph of the house beside it ── */}
      <section className="container-page grid gap-8 pt-8 pb-6 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-14 lg:pb-8">
        <div className="flex flex-col justify-center space-y-6 lg:py-10">
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
        <div className="h-72 sm:h-96 lg:h-auto lg:min-h-[36rem]">
          <PhotoTile src={heroPhoto} priority sizes="(min-width: 1024px) 50vw, 100vw">
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-9">
              <p className="text-xs font-semibold tracking-[0.08em] text-ink-foreground/75 uppercase">
                {t("home.heroPhotoEyebrow")}
              </p>
              <p className="mt-2 max-w-sm font-display text-2xl leading-tight md:text-3xl">
                {t("home.heroPhotoCaption")}
              </p>
            </div>
          </PhotoTile>
        </div>
      </section>

      <TrustBand />

      <Categories />

      <Suspense fallback={<SectionSkeleton title={t("home.endingSoon")} count={4} />}>
        <Sections />
      </Suspense>

      <Steps />

      <About />

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

// The slalom between the four stop centres (12.5%, 37.5%, 62.5%, 87.5% of the row), drawn in a
// 1000×64 box stretched over the row; the even stops sit 40px lower. The dots keep their size
// because the stroke does not scale with the box.
const TRUST_PATH = "M125 12 C250 12 250 52 375 52 C500 52 500 12 625 12 C750 12 750 52 875 52"

/** The four guarantees as numbered stops on a dotted slalom, from 1 to 4. */
async function TrustBand() {
  const t = await getTranslations("home")
  const stops = [
    { title: t("trust.escrowTitle"), text: t("trust.escrow") },
    { title: t("trust.codeTitle"), text: t("trust.code") },
    { title: t("trust.feeTitle"), text: t("trust.fee", { percent: PLATFORM_FEE_PERCENT }) },
    { title: t("trust.verifiedTitle"), text: t("trust.verified") },
  ]
  return (
    <section aria-label={t("trustTitle")} className="container-page">
      <div className="relative rounded-lg border bg-card px-5 py-7 md:px-10 md:py-10">
        <svg
          aria-hidden
          viewBox="0 0 1000 64"
          preserveAspectRatio="none"
          className="absolute inset-x-10 top-12 hidden h-16 w-[calc(100%-5rem)] text-primary/45 lg:block"
        >
          <path
            d={TRUST_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0 10"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="grid gap-5 lg:grid-cols-4 lg:gap-8">
          {stops.map((s, i) => (
            <li
              key={s.title}
              className={cn(
                // Phones: a straight dotted trail from one marker to the next.
                "relative flex gap-4 not-last:before:absolute not-last:before:top-11 not-last:before:-bottom-3 not-last:before:left-[19px] not-last:before:border-l-2 not-last:before:border-dotted not-last:before:border-primary/45",
                "lg:flex-col lg:items-center lg:text-center lg:before:hidden",
                i % 2 === 1 && "lg:mt-10",
              )}
            >
              <span
                aria-hidden
                className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-card font-display text-lg leading-none text-primary"
              >
                {i + 1}
              </span>
              <div className="pt-2 lg:pt-0">
                <p className="leading-5 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm leading-5 text-pretty text-muted-foreground lg:mx-auto lg:max-w-60">
                  {s.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

async function Categories() {
  const [t, tree] = await Promise.all([getTranslations("home"), getCategoryTree()])
  return (
    <section aria-labelledby="categorii" className="container-page pt-20">
      <SectionHeader
        id="categorii"
        eyebrow={t("eyebrowCategories")}
        title={t("categories")}
        href="/cauta"
        seeAll={t("seeAll")}
      />
      <CategoryCards tree={tree} />
    </section>
  )
}

async function Sections() {
  const [t, sections] = await Promise.all([getTranslations("home"), getHomeSections()])
  const featured = sections.featured.filter((a) => a.bid_count > 0)
  if (sections.endingSoon.length === 0) {
    // Nothing live yet: an invitation to open the sale, beside the paddle on its stage.
    return (
      <section className="container-page pt-20">
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <div className="flex flex-col justify-center rounded-lg border bg-card p-8 md:p-12">
            <h2 className="font-display text-3xl leading-tight md:text-4xl">{t("emptyTitle")}</h2>
            <p className="mt-3 max-w-md text-pretty text-muted-foreground">{t("emptyHint")}</p>
            <Button asChild size="lg" className="mt-6 self-start">
              <Link href="/vinde">
                {t("heroCtaSell")}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <div className="h-64 md:h-auto md:min-h-80">
            <PhotoTile src={bidPhoto} shade="none" sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        </div>
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

/** The three steps as photo tiles: find it, raise the paddle, receive it. */
async function Steps() {
  const t = await getTranslations("home")
  const steps = [
    { title: t("steps.s1t"), text: t("steps.s1"), photo: findPhoto, focus: "50% 50%" },
    { title: t("steps.s2t"), text: t("steps.s2"), photo: bidPhoto, focus: "50% 45%" },
    { title: t("steps.s3t"), text: t("steps.s3"), photo: winPhoto, focus: "45% 50%" },
  ]
  return (
    <section aria-labelledby="pasi" className="container-page pt-24">
      <SectionHeader
        id="pasi"
        eyebrow={t("stepsEyebrow")}
        title={t("stepsTitle")}
        href="/cum-functioneaza"
        seeAll={t("stepsMore")}
      />
      <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="h-[26rem] md:h-[30rem]">
            <PhotoTile src={s.photo} focus={s.focus} sizes="(min-width: 768px) 33vw, 100vw">
              <span className="absolute top-5 left-6 font-display text-6xl leading-none text-ink-foreground/90 tabular-nums md:top-7 md:left-8">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <h3 className="font-display text-2xl leading-tight md:text-[1.75rem]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-ink-foreground/80">
                  {s.text}
                </p>
              </div>
            </PhotoTile>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** "Cine suntem?": a dark band with who we are, what the house stands for, and a photograph. */
async function About() {
  const t = await getTranslations("home.about")
  const pillars = [
    { title: t("p1Title"), text: t("p1") },
    { title: t("p2Title"), text: t("p2", { percent: PLATFORM_FEE_PERCENT }) },
    { title: t("p3Title"), text: t("p3") },
  ]
  return (
    <section
      aria-labelledby="cine-suntem"
      className="dark mt-24 bg-background text-foreground md:mt-32"
    >
      <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-2 lg:items-stretch lg:gap-16">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            {t("eyebrow")}
          </p>
          <h2
            id="cine-suntem"
            className="mt-3 font-display text-[2.75rem] leading-none tracking-[-0.02em] md:text-6xl"
          >
            {t("title")}
          </h2>
          <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">{t("lead")}</p>
          <ol className="mt-10 space-y-7">
            {pillars.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
                <span className="pt-4 font-display text-sm text-ink-accent tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="border-t border-ink-accent/30 pt-3">
                  <h3 className="font-display text-xl">{p.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-pretty text-muted-foreground">
                    {p.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="h-80 sm:h-[28rem] lg:h-auto lg:min-h-[34rem]">
          <PhotoTile src={aboutPhoto} shade="none" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </div>
    </section>
  )
}

/** The call to sellers: a shelf of someone's collection beside the offer, in bordo. */
async function SellBand() {
  const t = await getTranslations("home")
  return (
    <section className="container-page pt-24">
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <div className="h-72 md:h-auto md:min-h-[26rem]">
          <PhotoTile
            src={sellPhoto}
            shade="none"
            focus="50% 40%"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
        <div className="flex flex-col justify-center rounded-lg bg-primary p-8 text-primary-foreground md:p-12 dark:bg-tint dark:text-foreground">
          <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.02em] md:text-5xl">
            {t("sellTitle")}
          </h2>
          <p className="mt-4 max-w-md text-lg text-pretty text-primary-foreground/85 dark:text-foreground/80">
            {t("sellText", { percent: PLATFORM_FEE_PERCENT })}
          </p>
          <Button asChild size="lg" variant="inverse" className="mt-7 self-start">
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
    <section aria-labelledby={id} className="container-page pt-20">
      <SectionHeader id={id} eyebrow={eyebrow} title={title} href={href} seeAll={seeAll} />
      {children}
    </section>
  )
}

function SectionSkeleton({ title, count }: { title: string; count: number }) {
  return (
    <section className="container-page pt-20">
      <h2 className="mb-6 font-display text-[1.75rem] md:text-3xl">{title}</h2>
      <AuctionGridSkeleton count={count} />
    </section>
  )
}
