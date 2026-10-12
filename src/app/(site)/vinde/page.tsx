import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { requireUser } from "@/features/auth/session"
import { AuctionForm } from "@/features/auctions/components/auction-form"
import { SellPageShell, SellSkeleton } from "@/features/auctions/components/sell-page-shell"
import { emptyAuctionForm } from "@/features/auctions/form-defaults"
import { getCategoryTree } from "@/features/auctions/queries"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sell")
  return { title: t("title"), robots: { index: false } }
}

export default async function SellPage() {
  const t = await getTranslations("sell")
  return (
    <SellPageShell title={t("title")} subtitle={t("subtitle")}>
      <Suspense fallback={<SellSkeleton />}>
        <NewAuction />
      </Suspense>
    </SellPageShell>
  )
}

async function NewAuction() {
  const user = await requireUser("/vinde")
  const supabase = await createClient()
  const [categories, { data: profile }] = await Promise.all([
    getCategoryTree(),
    supabase.from("profiles").select("county_code, city").eq("id", user.id).single(),
  ])
  return (
    <AuctionForm
      auctionId={null}
      categories={categories}
      defaults={emptyAuctionForm({
        countyCode: profile?.county_code ?? null,
        city: profile?.city ?? null,
      })}
    />
  )
}
