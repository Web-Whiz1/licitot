import { SearchX } from "@/components/icons"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/features/profiles/components/empty-state"

export default async function AuctionNotFound() {
  const t = await getTranslations("detail")
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={SearchX}
        title={t("notFoundTitle")}
        hint={t("notFoundText")}
        action={
          <Button asChild>
            <Link href="/cauta">{t("backToBrowse")}</Link>
          </Button>
        }
      />
    </div>
  )
}
