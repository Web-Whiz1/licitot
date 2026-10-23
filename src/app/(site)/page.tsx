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
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { LogoMark } from "@/components/brand/logo"
import { LiveDot } from "@/components/live-dot"
import { SearchForm } from "@/components/layout/search-form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuctionCard, AuctionGrid } from "@/features/auctions/components/auction-card"
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
      {/* ── Hero: the thesis in the serif, with the auctions closest to the hammer on the right ── */}
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

/** The two auctions closest to the hammer, straight and side by side, with live countdowns. */
async function LiveStack() {
  const [t, sections] = await Promise.all([getTranslations(), getHomeSections()])
  const items = sections.endingSoon.slice(0, 2)

  if (items.length === 0) {
    return (
      <div className="hidden lg:block">
        <div className="grid justify-items-center gap-5 rounded-lg border bg-card px-8 py-14 text-center">
          <LogoMark className="size-20" />
          <div className="space-y-1.5">
            <p className="font-display text-2xl">{t("home.liveEmptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("home.liveEmptyHint")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ul className={cn("grid gap-4", items.length > 1 ? "grid-cols-2" : "mx-auto w-full max-w-xs")}>
      {items.map((a, i) => (
        <li key={a.id}>
          <AuctionCard auction={a} priority={i === 0} />
        </li>
      ))}
    </ul>
  )
}

function LiveStackSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-3.5">
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
          <li key={title} className="flex gap-3">
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
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
