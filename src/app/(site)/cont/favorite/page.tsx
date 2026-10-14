import { Heart } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuctionGrid } from "@/features/auctions/components/auction-card"
import { requireUser } from "@/features/auth/session"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { getWatchlist } from "@/features/watchlist/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("favorites"), robots: { index: false } }
}

export default async function FavoritesPage() {
  const t = await getTranslations("account")
  const user = await requireUser("/cont/favorite")
  const items = await getWatchlist(user.id)

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("empty.favorites")}
        action={
          <Button asChild>
            <Link href="/cauta">{t("browse")}</Link>
          </Button>
        }
      />
    )
  }

  return <AuctionGrid auctions={items} />
}
