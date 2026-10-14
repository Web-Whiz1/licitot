import Link from "next/link"
import { useTranslations } from "next-intl"
import { AuctionThumb } from "@/components/auction-thumb"
import { cn } from "@/lib/utils"

/** One row in the account lists: photo, title (linked), then free-form details and actions. */
export function AuctionListItem({
  href,
  title,
  cover,
  badges,
  children,
  actions,
  highlight,
}: {
  href: string
  title: string
  cover: { path: string; blur_data_url: string | null } | null
  badges?: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
  highlight?: "success" | "warning"
}) {
  const t = useTranslations("auction")
  return (
    <li
      className={cn(
        "flex gap-4 p-4",
        highlight === "success" && "bg-success-soft/40",
        highlight === "warning" && "bg-warning-soft/40",
      )}
    >
      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
        <AuctionThumb
          path={cover?.path}
          blurDataUrl={cover?.blur_data_url}
          alt=""
          sizes="96px"
          noPhotoLabel={t("noPhoto")}
          className="size-20 rounded-lg sm:size-24"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        <Link href={href} className="truncate font-semibold hover:underline">
          {title}
        </Link>
        {children}
        {actions ? <div className="mt-auto flex flex-wrap gap-1 pt-1">{actions}</div> : null}
      </div>
    </li>
  )
}
