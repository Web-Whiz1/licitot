import { Hand } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { EmptyState } from "@/features/profiles/components/empty-state"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("bids"), robots: { index: false } }
}

export default async function MyBidsPage() {
  const t = await getTranslations("account")
  return <EmptyState icon={Hand} title={t("empty.bids")} hint={t("comingInPhase")} />
}
