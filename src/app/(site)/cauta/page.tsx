import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { AuctionGridSkeleton } from "@/features/auctions/components/card-skeletons"
import { getCategoryTree } from "@/features/auctions/queries"
import { AuctionBrowser } from "@/features/search/components/auction-browser"
import { parseBrowseParams } from "@/features/search/params"

export async function generateMetadata({ searchParams }: PageProps<"/cauta">): Promise<Metadata> {
  const t = await getTranslations("browse")
  const { q } = parseBrowseParams(await searchParams)
  return {
    title: q ? t("resultsFor", { q }) : t("allAuctions"),
    // Search result pages shouldn't be indexed; categories and auctions are.
    robots: { index: false, follow: true },
    alternates: { canonical: "/cauta" },
  }
}

export default function SearchPage({ searchParams }: PageProps<"/cauta">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <Suspense fallback={<AuctionGridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Results({ searchParams }: Pick<PageProps<"/cauta">, "searchParams">) {
  const [t, filters, categories] = await Promise.all([
    getTranslations("browse"),
    searchParams.then(parseBrowseParams),
    getCategoryTree(),
  ])
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight break-words">
        {filters.q ? t("resultsFor", { q: filters.q }) : t("allAuctions")}
      </h1>
      <AuctionBrowser
        basePath="/cauta"
        filters={filters}
        categories={categories}
        lockCategory={false}
      />
    </>
  )
}
