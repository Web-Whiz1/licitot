import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { AuctionGridSkeleton } from "@/features/auctions/components/card-skeletons"
import { getCategoryTree, type CategoryGroup } from "@/features/auctions/queries"
import { AuctionBrowser } from "@/features/search/components/auction-browser"
import { parseBrowseParams } from "@/features/search/params"
import { cn } from "@/lib/utils"

type Found = { name: string; slug: string; group: CategoryGroup; isParent: boolean }

async function findCategory(slug: string): Promise<Found | null> {
  for (const group of await getCategoryTree()) {
    if (group.slug === slug) return { name: group.name, slug, group, isParent: true }
    const child = group.children.find((c) => c.slug === slug)
    if (child) return { name: child.name, slug, group, isParent: false }
  }
  return null
}

export async function generateStaticParams() {
  const tree = await getCategoryTree()
  return tree.flatMap((g) => [{ slug: g.slug }, ...g.children.map((c) => ({ slug: c.slug }))])
}

export async function generateMetadata({
  params,
}: PageProps<"/categorie/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const category = await findCategory(slug)
  if (!category) return {}
  const t = await getTranslations("browse")
  return {
    title: category.name,
    description: t("categoryIntro", { name: category.name }),
    alternates: { canonical: `/categorie/${slug}` },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/categorie/[slug]">) {
  const { slug } = await params
  const category = await findCategory(slug)
  if (!category) notFound()
  const t = await getTranslations()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <nav aria-label={t("detail.breadcrumb")} className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          {t("detail.home")}
        </Link>
        {category.isParent ? null : (
          <>
            {" / "}
            <Link href={`/categorie/${category.group.slug}`} className="hover:underline">
              {category.group.name}
            </Link>
          </>
        )}
      </nav>
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">{category.name}</h1>

      <ul aria-label={t("browse.subcategories")} className="mb-6 flex flex-wrap gap-2">
        {[
          { slug: category.group.slug, name: t("browse.allCategories") },
          ...category.group.children,
        ].map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categorie/${c.slug}`}
              aria-current={c.slug === slug ? "page" : undefined}
              className={cn(
                "inline-block rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                c.slug === slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:border-primary hover:text-primary",
              )}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>

      <Suspense fallback={<AuctionGridSkeleton />}>
        <Results slug={slug} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Results({
  slug,
  searchParams,
}: {
  slug: string
  searchParams: PageProps<"/categorie/[slug]">["searchParams"]
}) {
  const [raw, categories] = await Promise.all([searchParams, getCategoryTree()])
  const filters = { ...parseBrowseParams(raw), category: slug }
  return (
    <AuctionBrowser
      basePath={`/categorie/${slug}`}
      filters={filters}
      categories={categories}
      lockCategory
    />
  )
}
