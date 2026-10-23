import { useTranslations } from "next-intl"
import { LiveDot } from "@/components/live-dot"
import { Badge } from "@/components/ui/badge"
import type { AuctionStatus } from "../constants"

// Accent tint + bordo dot = live, ink = sold (the hammer fell), neutral = no winner.
const VARIANT = {
  draft: "outline",
  active: "live",
  ended_sold: "ink",
  ended_unsold: "neutral",
  cancelled: "danger",
} as const satisfies Record<AuctionStatus, string>

export function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
  const t = useTranslations("auction.status")
  return (
    <Badge variant={VARIANT[status]}>
      {status === "active" ? <LiveDot className="size-1.5 text-primary" /> : null}
      {t(status)}
    </Badge>
  )
}
