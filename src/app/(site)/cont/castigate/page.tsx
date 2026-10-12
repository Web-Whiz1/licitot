import { Trophy } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { EmptyState } from "@/features/profiles/components/empty-state"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("won"), robots: { index: false } }
}

export default async function WonPage() {
  const t = await getTranslations("account")
  return <EmptyState icon={Trophy} title={t("empty.won")} hint={t("comingInPhase")} />
}
