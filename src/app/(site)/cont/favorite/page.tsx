import { Heart } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { EmptyState } from "@/features/profiles/components/empty-state"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("favorites"), robots: { index: false } }
}

export default async function FavoritesPage() {
  const t = await getTranslations("account")
  return <EmptyState icon={Heart} title={t("empty.favorites")} hint={t("comingInPhase")} />
}
