import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import type { AuctionStatus } from "../constants"

const VARIANT = {
  draft: "outline",
  active: "success",
  ended_sold: "sky",
  ended_unsold: "secondary",
  cancelled: "danger",
} as const satisfies Record<AuctionStatus, string>

export function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
  const t = useTranslations("auction.status")
  return <Badge variant={VARIANT[status]}>{t(status)}</Badge>
}
