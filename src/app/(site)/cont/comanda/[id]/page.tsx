import {
  CircleCheck,
  CircleX,
  Clock,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Truck,
  TriangleAlert,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ActionButton } from "@/components/action-button"
import { AuctionThumb } from "@/components/auction-thumb"
import { Badge } from "@/components/ui/badge"
import { auctionHref } from "@/features/auctions/components/auction-card"
import { requireUser } from "@/features/auth/session"
import {
  cancelLateOrder,
  cancelUnpaidOrder,
  confirmOrderReceived,
} from "@/features/payments/actions"
import { CheckoutForm } from "@/features/payments/components/checkout-form"
import {
  DisputeForm,
  DisputeResponseForm,
  HandoverForm,
  ShipForm,
} from "@/features/payments/components/order-forms"
import {
  getHandoverCode,
  getOrder,
  getOrderContact,
  type OrderView,
} from "@/features/payments/queries"
import { fulfillCheckoutSession, settleOrders } from "@/features/payments/server"
import { formatDateTime, isPast } from "@/lib/dates"
import { PLATFORM_FEE_PERCENT, formatRON } from "@/lib/money"
import { formatRoPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders")
  return { title: t("title"), robots: { index: false } }
}

const STATUS_VARIANT = {
  pending_payment: "warning",
  paid: "sky",
  shipped: "sky",
  disputed: "warning",
  completed: "success",
  cancelled: "secondary",
} as const

const price = (bani: number) => formatRON(bani, { compact: true })

/** Money still has to move at Stripe (payout, refund) or a time limit has passed. */
function needsSettling(o: OrderView): boolean {
  if (o.status === "completed") return o.funds_model === "escrow" && !o.released_at
  if (o.status === "cancelled") return Boolean(o.paid_at) && !o.refunded_at
  if (o.status === "shipped") return Boolean(o.release_at) && isPast(o.release_at!)
  if (o.status === "paid") return Boolean(o.ship_by) && isPast(addDays(o.ship_by!, 5))
  return false
}

const addDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 86_400_000).toISOString()

export default async function OrderPage({ params, searchParams }: PageProps<"/cont/comanda/[id]">) {
  const { id } = await params
  const sp = await searchParams
  const user = await requireUser(`/cont/comanda/${id}`)
  const t = await getTranslations()

  let order = await getOrder(id)
  if (!order) notFound()

  // Back from Stripe Checkout: confirm the payment now (the webhook may arrive later).
  let note: "done" | "processing" | "cancelled" | null = null
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null
  if (sessionId && order.status === "pending_payment" && order.buyer_id === user.id) {
    try {
      const result = await fulfillCheckoutSession(sessionId)
      note = result === "pending" ? "processing" : result === "failed" ? null : "done"
      if (note === "done") order = (await getOrder(id)) ?? order
    } catch (e) {
      console.error("[order.return]", e)
    }
  } else if (sessionId && order.status !== "pending_payment") {
    note = "done"
  } else if (sp.plata === "anulata" && order.status === "pending_payment") {
    note = "cancelled"
  }

  // Catch up on payouts/refunds/deadlines for this order (the scheduled job does it too).
  if (needsSettling(order)) {
    try {
      await settleOrders(order.id)
      order = (await getOrder(id)) ?? order
    } catch (e) {
      console.error("[order.settle]", e)
    }
  }

  const total = order.item_price + order.shipping_cost
  const isBuyer = order.buyer_id === user.id
  const isSeller = order.seller_id === user.id
  const other = isBuyer ? order.seller : order.buyer
  const afterPayment = ["paid", "shipped", "disputed", "completed"].includes(order.status)
  const contact = afterPayment ? await getOrderContact(order.id) : null
  const handoverCode =
    isBuyer && order.status === "paid" && order.delivery_method === "pickup"
      ? await getHandoverCode(order.id)
      : null
  const a = order.auction
  const deliveryOptions = [
    ...(a.ship_pickup ? (["pickup"] as const) : []),
    ...(a.ship_courier ? (["courier"] as const) : []),
  ]

  return (
    <div className="space-y-6">
      {note === "done" ? (
        <Notice tone="success" icon={CircleCheck} text={t("orders.paymentDone")} />
      ) : note === "processing" ? (
        <Notice tone="warning" icon={Clock} text={t("orders.paymentProcessing")} />
      ) : note === "cancelled" ? (
        <Notice tone="muted" icon={CircleX} text={t("orders.paymentCancelled")} />
      ) : null}

      <div className="flex gap-4 rounded-2xl border bg-card p-4">
        <AuctionThumb
          path={order.cover?.path}
          blurDataUrl={order.cover?.blur_data_url}
          alt=""
          sizes="96px"
          noPhotoLabel={t("auction.noPhoto")}
          className="size-20 shrink-0 rounded-lg sm:size-24"
        />
        <div className="min-w-0 space-y-1">
          <Badge variant={STATUS_VARIANT[order.status]}>{t(`orders.status.${order.status}`)}</Badge>
          <h2 className="text-lg font-bold tracking-tight break-words">
            <Link href={auctionHref(a)} className="hover:underline">
              {a.title}
            </Link>
          </h2>
          {other ? (
            <p className="text-sm text-muted-foreground">
              {isBuyer ? t("orders.seller") : t("orders.buyer")}:{" "}
              <Link href={`/u/${other.username}`} className="text-primary hover:underline">
                {other.display_name}
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <dl className="divide-y rounded-2xl border bg-card text-sm">
            <Row label={t("orders.item")} value={price(order.item_price)} />
            <Row
              label={t("orders.shipping")}
              value={
                order.delivery_method === "courier"
                  ? `${t("orders.delivery.courier")} · ${order.shipping_cost ? price(order.shipping_cost) : t("orders.shippingFree")}`
                  : order.delivery_method === "pickup"
                    ? t("orders.delivery.pickup", { city: a.city })
                    : "—"
              }
            />
            <Row label={t("orders.total")} value={price(total)} strong />
            {isSeller ? (
              <>
                <Row
                  label={t("orders.fee", { percent: PLATFORM_FEE_PERCENT })}
                  value={`− ${price(order.platform_fee)}`}
                />
                <Row label={t("orders.payout")} value={price(total - order.platform_fee)} strong />
              </>
            ) : null}
          </dl>
          <FundsNote order={order} isBuyer={isBuyer} payout={total - order.platform_fee} />
        </div>

        <div className="space-y-4">
          <StatusPanel
            order={order}
            isBuyer={isBuyer}
            isSeller={isSeller}
            handoverCode={handoverCode}
            deliveryOptions={[...deliveryOptions]}
          />

          {contact ? (
            <section aria-labelledby="contact" className="space-y-3 rounded-2xl border bg-card p-5">
              <div>
                <h3 id="contact" className="font-semibold">
                  {t("orders.contactTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">{t("orders.contactHint")}</p>
              </div>
              <p className="font-medium">{contact.display_name}</p>
              {contact.email ? (
                <p className="flex items-center gap-2 text-sm">
                  <Mail aria-hidden className="size-4 text-primary" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </p>
              ) : null}
              <p className="flex items-center gap-2 text-sm">
                <Phone aria-hidden className="size-4 text-primary" />
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                    {formatRoPhone(contact.phone)}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{t("orders.noPhone")}</span>
                )}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Where the money is right now, in plain words. */
async function FundsNote({
  order,
  isBuyer,
  payout,
}: {
  order: OrderView
  isBuyer: boolean
  payout: number
}) {
  const t = await getTranslations("orders")
  const total = order.item_price + order.shipping_cost
  let text: string | null = null
  let tone: "success" | "muted" | "sky" = "sky"

  if (order.status === "cancelled" && order.paid_at) {
    tone = "muted"
    text = order.refunded_at
      ? isBuyer
        ? t("refundedBuyer", { amount: price(total), date: formatDateTime(order.refunded_at) })
        : t("refundedSeller")
      : t("refundPending")
  } else if (order.released_at) {
    tone = "success"
    text = isBuyer
      ? t("releasedBuyer", { date: formatDateTime(order.released_at) })
      : t("releasedSeller", { amount: price(payout), date: formatDateTime(order.released_at) })
  } else if (order.status === "completed") {
    text = isBuyer ? t("releasePendingBuyer") : t("releasePendingSeller", { amount: price(payout) })
  } else if (["paid", "shipped", "disputed"].includes(order.status)) {
    text = isBuyer ? t("heldBuyer") : t("heldSeller")
  }
  if (!text) return null

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl p-4 text-sm font-medium",
        tone === "success" && "bg-success-soft text-success",
        tone === "sky" && "bg-sky-soft text-secondary-foreground",
        tone === "muted" && "bg-muted",
      )}
    >
      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  )
}

async function StatusPanel({
  order,
  isBuyer,
  isSeller,
  handoverCode,
  deliveryOptions,
}: {
  order: OrderView
  isBuyer: boolean
  isSeller: boolean
  handoverCode: string | null
  deliveryOptions: ("pickup" | "courier")[]
}) {
  const t = await getTranslations("orders")
  const confirm = (title: string, text?: string) => ({
    title,
    text,
    confirmLabel: t("confirm"),
    cancelLabel: t("back"),
  })
  const total = order.item_price + order.shipping_cost

  switch (order.status) {
    case "pending_payment": {
      const overdue = isPast(order.payment_due_at)
      if (isBuyer) {
        return (
          <Card>
            <p className={cn("text-sm", overdue && "font-semibold text-destructive")}>
              {overdue ? t("overdue") : t("payDue", { date: formatDateTime(order.payment_due_at) })}
            </p>
            <CheckoutForm
              orderId={order.id}
              itemPrice={order.item_price}
              city={order.auction.city}
              options={deliveryOptions}
              courierCost={order.auction.courier_cost ?? 0}
              initial={order.delivery_method}
            />
          </Card>
        )
      }
      return (
        <Card>
          <p className="text-sm">
            {overdue
              ? t("overdue")
              : t("waitingPayment", { date: formatDateTime(order.payment_due_at) })}
          </p>
          {isSeller && overdue ? (
            <ActionButton
              action={cancelUnpaidOrder.bind(null, order.id)}
              variant="destructive"
              confirm={confirm(t("cancelUnpaid"), t("cancelUnpaidConfirm"))}
            >
              {t("cancelUnpaid")}
            </ActionButton>
          ) : null}
        </Card>
      )
    }

    case "paid": {
      const late = Boolean(order.ship_by) && isPast(order.ship_by!)
      const deadline = order.ship_by ? formatDateTime(order.ship_by) : ""
      if (isBuyer) {
        return (
          <>
            {handoverCode ? (
              <Card>
                <h3 className="flex items-center gap-2 font-semibold">
                  <KeyRound aria-hidden className="size-4 text-primary" />
                  {t("handoverTitle")}
                </h3>
                <p
                  className="text-center font-mono text-4xl font-extrabold tracking-[0.3em] text-primary"
                  aria-label={handoverCode.split("").join(" ")}
                >
                  {handoverCode}
                </p>
                <p className="text-sm">{t("handoverHint")}</p>
                <p className="flex items-start gap-2 text-xs text-warning">
                  <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {t("handoverWarning")}
                </p>
              </Card>
            ) : null}
            <Card>
              <p className={cn("text-sm", late && "font-semibold text-destructive")}>
                {late ? t("lateBuyer") : t("shipByBuyer", { date: deadline })}
              </p>
              {late ? (
                <ActionButton
                  action={cancelLateOrder.bind(null, order.id)}
                  variant="destructive"
                  className="w-full"
                  confirm={confirm(
                    t("cancelLate"),
                    t("cancelLateConfirm", { amount: price(total) }),
                  )}
                >
                  {t("cancelLate")}
                </ActionButton>
              ) : null}
              <ActionButton
                action={confirmOrderReceived.bind(null, order.id)}
                variant="outline"
                className="w-full"
                confirm={confirm(t("confirmReceived"), t("confirmReceivedConfirm"))}
              >
                {t("confirmReceived")}
              </ActionButton>
              <DisputeForm orderId={order.id} />
            </Card>
          </>
        )
      }
      return (
        <Card>
          <p className={cn("text-sm", late && "font-semibold text-destructive")}>
            {late ? t("lateSeller") : t("shipBySeller", { date: deadline })}
          </p>
          {order.delivery_method === "pickup" ? (
            <>
              <h3 className="flex items-center gap-2 font-semibold">
                <KeyRound aria-hidden className="size-4 text-primary" />
                {t("handoverEnterTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("handoverEnterHint")}</p>
              <HandoverForm orderId={order.id} />
            </>
          ) : (
            <>
              <h3 className="flex items-center gap-2 font-semibold">
                <Truck aria-hidden className="size-4 text-primary" />
                {t("shipTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("shipHint")}</p>
              <ShipForm orderId={order.id} />
            </>
          )}
        </Card>
      )
    }

    case "shipped": {
      const shipped = t("shippedInfo", {
        carrier: order.tracking_carrier ?? "",
        awb: order.tracking_number ?? "",
      })
      const releaseDate = order.release_at ? formatDateTime(order.release_at) : ""
      return (
        <Card>
          <p className="flex items-start gap-2 text-sm font-medium">
            <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            {shipped}
          </p>
          {isBuyer ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("autoRelease", { date: releaseDate })}
              </p>
              <ActionButton
                action={confirmOrderReceived.bind(null, order.id)}
                className="w-full"
                confirm={confirm(t("confirmReceived"), t("confirmReceivedConfirm"))}
              >
                {t("confirmReceived")}
              </ActionButton>
              <DisputeForm orderId={order.id} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("autoReleaseSeller", { date: releaseDate })}
            </p>
          )}
        </Card>
      )
    }

    case "disputed": {
      const d = order.dispute
      return (
        <Card tone="warning">
          <p className="flex items-start gap-2 text-sm font-semibold">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {d
              ? isBuyer
                ? t("disputeOpenBuyer", { date: formatDateTime(d.opened_at) })
                : t("disputeOpenSeller", { date: formatDateTime(d.opened_at) })
              : null}
          </p>
          {d ? (
            <>
              <p className="text-sm">
                {t("disputeReason", {
                  reason: t(`reasons.${d.reason as "not_received" | "not_as_described" | "other"}`),
                })}
              </p>
              <p className="rounded-lg bg-background p-3 text-sm whitespace-pre-line">
                {d.details}
              </p>
              {isSeller ? (
                <DisputeResponseForm orderId={order.id} initial={d.seller_response} />
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{t("sellerResponseTitle")}</p>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {d.seller_response ?? t("noResponseYet")}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </Card>
      )
    }

    case "completed":
      return (
        <Notice
          tone="success"
          icon={CircleCheck}
          text={t("completedOn", { date: formatDateTime(order.completed_at ?? order.created_at) })}
        />
      )

    case "cancelled":
      return (
        <>
          <Notice
            tone="muted"
            icon={CircleX}
            text={t("cancelledOn", {
              date: formatDateTime(order.cancelled_at ?? order.created_at),
            })}
          />
          {order.dispute?.resolution ? (
            <p className="text-sm text-muted-foreground">
              {order.dispute.resolution === "refund"
                ? t("disputeResolvedRefund")
                : t("disputeResolvedRelease")}
            </p>
          ) : null}
        </>
      )
  }
}

function Card({ children, tone }: { children: React.ReactNode; tone?: "warning" }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border bg-card p-5",
        tone === "warning" && "border-warning/40 bg-warning-soft/40",
      )}
    >
      {children}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", strong && "font-bold text-primary")}>{value}</dd>
    </div>
  )
}

function Notice({
  tone,
  icon: Icon,
  text,
}: {
  tone: "success" | "warning" | "muted"
  icon: typeof CircleCheck
  text: string
}) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-2xl p-4 text-sm font-medium",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "muted" && "bg-muted",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  )
}
