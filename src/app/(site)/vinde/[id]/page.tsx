import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { requireUser } from "@/features/auth/session"
import { AuctionForm } from "@/features/auctions/components/auction-form"
import { SellPageShell, SellSkeleton } from "@/features/auctions/components/sell-page-shell"
import { draftToForm } from "@/features/auctions/form-defaults"
import { getCategoryTree, getOwnDraft } from "@/features/auctions/queries"
import { PayoutsNotice } from "@/features/payments/components/payouts-notice"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sell")
  return { title: t("editTitle"), robots: { index: false } }
}

export default async function EditDraftPage({ params }: PageProps<"/vinde/[id]">) {
  const t = await getTranslations("sell")
  return (
    <SellPageShell title={t("editTitle")}>
      <Suspense fallback={<SellSkeleton />}>
        <EditDraft params={params} />
      </Suspense>
    </SellPageShell>
  )
}

async function EditDraft({ params }: Pick<PageProps<"/vinde/[id]">, "params">) {
  const { id } = await params
  const user = await requireUser(`/vinde/${id}`)
  const [categories, draft] = await Promise.all([getCategoryTree(), getOwnDraft(id)])
  // RLS returns only the user's own auction; anything not a draft can't be edited.
  if (!draft) notFound()
  return (
    <>
      <PayoutsNotice userId={user.id} />
      <AuctionForm
        key={draft.id}
        auctionId={draft.id}
        categories={categories}
        defaults={draftToForm(draft)}
      />
    </>
  )
}
