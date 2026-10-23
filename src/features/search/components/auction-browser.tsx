import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuctionGrid } from "@/features/auctions/components/auction-card"
import { searchAuctions } from "@/features/auctions/listing"
import type { CategoryGroup } from "@/features/auctions/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { countyName } from "@/lib/counties"
import { browseHref, PAGE_SIZE, type BrowseFilters } from "../params"
import { FiltersForm } from "./filters-form"
import { MobileFilters } from "./mobile-filters"
import { SortSelect } from "./sort-select"

/**
 * Results + filters for /cauta and /categorie/[slug]. `basePath` is where filter links point;
 * on category pages the category lives in the path, not in ?categorie=.
 */
export async function AuctionBrowser({
  basePath,
  filters,
  categories,
  lockCategory,
}: {
  basePath: string
  filters: BrowseFilters
  categories: CategoryGroup[]
  lockCategory: boolean
}) {
  const t = await getTranslations()
  const { items, total } = await searchAuctions(filters)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const href = (patch: Partial<BrowseFilters>) =>
    browseHref(basePath, { ...filters, ...patch }, { includeCategory: !lockCategory })

  const categoryLabel = (slug: string) =>
    categories.flatMap((g) => [g, ...g.children]).find((c) => c.slug === slug)?.name ?? slug

  const chips: { key: string; label: string; href: string }[] = []
  if (!lockCategory && filters.category)
    chips.push({
      key: "cat",
      label: categoryLabel(filters.category),
      href: href({ category: null, page: 1 }),
    })
  if (filters.minPrice !== null)
    chips.push({
      key: "min",
      label: `≥ ${filters.minPrice} RON`,
      href: href({ minPrice: null, page: 1 }),
    })
  if (filters.maxPrice !== null)
    chips.push({
      key: "max",
      label: `≤ ${filters.maxPrice} RON`,
      href: href({ maxPrice: null, page: 1 }),
    })
  if (filters.county)
    chips.push({
      key: "county",
      label: countyName(filters.county) ?? filters.county,
      href: href({ county: null, page: 1 }),
    })
  for (const c of filters.conditions)
    chips.push({
      key: `c-${c}`,
      label: t(`sell.conditions.${c}`),
      href: href({ conditions: filters.conditions.filter((x) => x !== c), page: 1 }),
    })
  if (filters.endingSoon)
    chips.push({
      key: "soon",
      label: t("browse.endingSoon"),
      href: href({ endingSoon: false, page: 1 }),
    })

  const form = (prefix: string) => (
    <FiltersForm
      idPrefix={prefix}
      action={basePath}
      filters={filters}
      categories={categories}
      showCategory={!lockCategory}
    />
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label={t("browse.filters")}>
        <div className="sticky top-24 rounded-lg border bg-card p-5">{form("desktop")}</div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("browse.count", { count: total })}
          </p>
          <div className="flex items-center gap-2">
            <MobileFilters activeCount={chips.length}>{form("mobile")}</MobileFilters>
            <SortSelect value={filters.sort} />
          </div>
        </div>

        {chips.length ? (
          <ul className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.key}>
                <Link
                  href={c.href}
                  aria-label={t("browse.removeFilter", { label: c.label })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-sm font-medium transition-colors duration-150 ease-out hover:border-input hover:bg-muted"
                >
                  {c.label}
                  <X aria-hidden className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {items.length ? (
          <AuctionGrid auctions={items} priorityCount={4} />
        ) : (
          <EmptyState icon={SearchX} title={t("browse.emptyTitle")} hint={t("browse.emptyHint")} />
        )}

        {pages > 1 ? (
          <nav
            aria-label={t("browse.pagination")}
            className="flex items-center justify-center gap-2 pt-4"
          >
            <Button asChild variant="outline" size="sm" aria-disabled={filters.page <= 1}>
              <Link
                href={href({ page: filters.page - 1 })}
                className={filters.page <= 1 ? "pointer-events-none opacity-50" : undefined}
              >
                <ChevronLeft data-icon="inline-start" />
                {t("browse.previous")}
              </Link>
            </Button>
            <span className="px-2 text-sm">
              {filters.page} / {pages}
            </span>
            <Button asChild variant="outline" size="sm" aria-disabled={filters.page >= pages}>
              <Link
                href={href({ page: filters.page + 1 })}
                className={filters.page >= pages ? "pointer-events-none opacity-50" : undefined}
              >
                {t("browse.next")}
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  )
}
