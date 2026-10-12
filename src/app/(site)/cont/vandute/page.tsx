import { PackageCheck } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { EmptyState } from "@/features/profiles/components/empty-state"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("sold"), robots: { index: false } }
}

export default async function SoldPage() {
  const t = await getTranslations("account")
  return <EmptyState icon={PackageCheck} title={t("empty.sold")} hint={t("comingInPhase")} />
}
