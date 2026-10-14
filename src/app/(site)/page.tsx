import { ArrowRight, Gavel } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { AuctionGrid } from "@/features/auctions/components/auction-card"
import { AuctionGridSkeleton } from "@/features/auctions/components/card-skeletons"
import { CategoryIcon } from "@/features/auctions/components/category-icon"
import { getHomeSections } from "@/features/auctions/listing"
import { getCategoryTree } from "@/features/auctions/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <>
      <section className="bg-sky-soft">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-20">
          <div className="space-y-5">
            <h1 className="text-4xl font-extrabold tracking-tight text-balance md:text-display">
              {t("home.heroTitle")}
            </h1>
            <p className="max-w-lg text-lg text-pretty text-muted-foreground">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
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
          <div aria-hidden className="hidden justify-center md:flex">
            <div className="grid size-72 place-items-center rounded-[3rem] bg-background shadow-raised">
              <LogoMark className="size-40" />
            </div>
          </div>
        </div>
      </section>

      <Categories />

      <Suspense fallback={<SectionSkeleton title={t("home.featured")} count={4} />}>
        <Sections />
      </Suspense>
    </>
  )
}

async function Categories() {
  const [t, tree] = await Promise.all([getTranslations("home"), getCategoryTree()])
  return (
    <section aria-labelledby="categorii" className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
      <h2 id="categorii" className="mb-4 text-2xl font-bold tracking-tight">
        {t("categories")}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {tree.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categorie/${c.slug}`}
              className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-medium shadow-card transition-colors hover:border-primary hover:text-primary"
            >
              <span className="grid size-11 place-items-center rounded-full bg-sky-soft text-primary">
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
      <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
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
          title={t("featured")}
          href="/cauta?ordine=oferte"
          seeAll={t("seeAll")}
        >
          <AuctionGrid auctions={featured} priorityCount={2} />
        </Section>
      ) : null}
      <Section id="se-termina" title={t("endingSoon")} href="/cauta" seeAll={t("seeAll")}>
        <AuctionGrid auctions={sections.endingSoon} priorityCount={featured.length >= 4 ? 0 : 2} />
      </Section>
      {showNewest ? (
        <Section
          id="recente"
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

function Section({
  id,
  title,
  href,
  seeAll,
  children,
}: {
  id: string
  title: string
  href: string
  seeAll: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id={id} className="text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <Link href={href} className="text-sm font-semibold text-primary hover:underline">
          {seeAll}
        </Link>
      </div>
      {children}
    </section>
  )
}

function SectionSkeleton({ title, count }: { title: string; count: number }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      <AuctionGridSkeleton count={count} />
    </section>
  )
}
