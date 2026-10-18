import type messages from "../../../messages/ro.json"
import { formatRON } from "@/lib/money"

// Notifications are stored as `type` + `data` (written by database triggers); the text is
// built here from messages/ro.json → notifications.types.*, on the server and in the browser.

export type NotificationTextKey = keyof (typeof messages)["notifications"]["types"]

export type NotificationRow = {
  id: number
  type: string
  data: unknown
  link: string | null
  read_at: string | null
  created_at: string
}

const str = (v: unknown) => (typeof v === "string" ? v : "")
const money = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) ? formatRON(v, { compact: true }) : ""

/** Message key + values for a notification (pass them to t(`types.${key}`, values)). */
export function notificationMessage(n: Pick<NotificationRow, "type" | "data">): {
  key: NotificationTextKey
  values: Record<string, string | number>
} {
  const d = (n.data && typeof n.data === "object" ? n.data : {}) as Record<string, unknown>
  const title = str(d.title)
  const role = str(d.role)

  switch (n.type) {
    case "outbid":
    case "auction_won":
    case "auction_sold":
    case "watch_ending":
      return { key: n.type, values: { title, price: money(d.price) } }
    case "auction_unsold":
    case "listing_hidden":
      return { key: n.type, values: { title } }
    case "order_paid":
      return {
        key: d.delivery === "pickup" ? "order_paid_pickup" : "order_paid_courier",
        values: { title },
      }
    case "order_shipped":
      return {
        key: "order_shipped",
        values: { title, carrier: str(d.carrier), awb: str(d.awb) },
      }
    case "order_completed":
      return {
        key: role === "seller" ? "order_completed_seller" : "order_completed_buyer",
        values: { title },
      }
    case "payout_sent":
      return { key: "payout_sent", values: { title, amount: money(d.amount) } }
    case "order_cancelled":
      return {
        key:
          d.refund === true
            ? role === "seller"
              ? "order_cancelled_seller_refund"
              : "order_cancelled_buyer_refund"
            : "order_cancelled",
        values: { title },
      }
    case "dispute_opened":
      return {
        key: role === "admin" ? "dispute_opened_admin" : "dispute_opened_seller",
        values: { title },
      }
    case "review_received":
      return {
        key: "review_received",
        values: { reviewer: str(d.reviewer), rating: typeof d.rating === "number" ? d.rating : 0 },
      }
    case "report_new":
      return title
        ? { key: "report_new_auction", values: { title } }
        : { key: "report_new_user", values: {} }
    default:
      return { key: "order_cancelled", values: { title } }
  }
}
