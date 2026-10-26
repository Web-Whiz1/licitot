import { Gavel, Pencil, Plus } from "@/components/icons"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { AuctionThumb } from "@/components/auction-thumb"
import { QueryToast } from "@/components/query-toast"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/features/auth/session"
import { DeleteDraftButton } from "@/features/auctions/components/delete-draft-button"
import { AuctionStatusBadge } from "@/features/auctions/components/status-badge"
import { getMyAuctions } from "@/features/auctions/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatDateTime } from "@/lib/dates"
import { formatRON } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("listings"), robots: { index: false } }
}

export default async function MyListingsPage() {
  const t = await getTranslations()
  const user = await requireUser("/cont/licitatii")
  const auctions = await getMyAuctions(user.id)

  const sellButton = (
    <Button asChild>
      <Link href="/vinde">
        <Plus data-icon="inline-start" />
        {t("home.heroCtaSell")}
      </Link>
    </Button>
  )

  if (auctions.length === 0) {
    return (
      <>
        <QueryToast param="publicat" value="1" message="sell.published" />
        <EmptyState icon={Gavel} title={t("account.empty.listings")} action={sellButton} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <QueryToast param="publicat" value="1" message="sell.published" />
      <div className="flex justify-end">{sellButton}</div>
      <ul className="divide-y rounded-lg border bg-card">
        {auctions.map((a) => {
          const cover = a.auction_images[0]
          const isDraft = a.status === "draft"
          return (
            <li key={a.id} className="flex gap-4 p-4">
              <AuctionThumb
                path={cover?.path}
                blurDataUrl={cover?.blur_data_url}
                alt=""
                sizes="96px"
                noPhotoLabel={t("auction.noPhoto")}
                className="size-20 shrink-0 rounded-lg sm:size-24"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AuctionStatusBadge status={a.status} />
                  {a.ends_at && a.status === "active" ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(a.ends_at)}
                    </span>
                  ) : null}
                </div>
                <p className="truncate font-semibold">{a.title}</p>
                <p className="text-sm">
                  <span className="font-bold text-primary">
                    {formatRON(a.current_price, { compact: true })}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {t("auction.bids", { count: a.bid_count })}
                  </span>
                </p>
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  {isDraft ? (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/vinde/${a.id}`}>
                          <Pencil data-icon="inline-start" />
                          {t("auction.edit")}
                        </Link>
                      </Button>
                      <DeleteDraftButton id={a.id} />
                    </>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/licitatie/${a.id}-${a.slug}`}>{t("auction.view")}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
