import { CircleCheck, CircleX, Clock, Mail, Phone } from "lucide-react"
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
  cancelUnpaidOrder,
  confirmOrderReceived,
  markOrderShipped,
} from "@/features/payments/actions"
import { CheckoutForm } from "@/features/payments/components/checkout-form"
import { getOrder, getOrderContact, type OrderView } from "@/features/payments/queries"
import { fulfillCheckoutSession } from "@/features/payments/server"
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
  completed: "success",
  cancelled: "secondary",
} as const

const price = (bani: number) => formatRON(bani, { compact: true })

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

  const total = order.item_price + order.shipping_cost
  const isBuyer = order.buyer_id === user.id
  const isSeller = order.seller_id === user.id
  const other = isBuyer ? order.seller : order.buyer
  const paid = ["paid", "shipped", "completed"].includes(order.status)
  const contact = paid ? await getOrderContact(order.id) : null
  const overdue = isPast(order.payment_due_at)
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
        <dl className="h-fit divide-y rounded-2xl border bg-card text-sm">
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

        <div className="space-y-4">
          <StatusPanel
            order={order}
            isBuyer={isBuyer}
            isSeller={isSeller}
            overdue={overdue}
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

async function StatusPanel({
  order,
  isBuyer,
  isSeller,
  overdue,
  deliveryOptions,
}: {
  order: OrderView
  isBuyer: boolean
  isSeller: boolean
  overdue: boolean
  deliveryOptions: ("pickup" | "courier")[]
}) {
  const t = await getTranslations("orders")
  const confirm = (title: string) => ({
    title,
    confirmLabel: t("confirm"),
    cancelLabel: t("back"),
  })

  switch (order.status) {
    case "pending_payment":
      if (isBuyer) {
        return (
          <div className="space-y-3 rounded-2xl border bg-card p-5">
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
          </div>
        )
      }
      return (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-sm">
          <p>
            {overdue
              ? t("overdue")
              : t("waitingPayment", { date: formatDateTime(order.payment_due_at) })}
          </p>
          {isSeller && overdue ? (
            <ActionButton
              action={cancelUnpaidOrder.bind(null, order.id)}
              variant="destructive"
              confirm={{ ...confirm(t("cancelUnpaid")), text: t("cancelUnpaidConfirm") }}
            >
              {t("cancelUnpaid")}
            </ActionButton>
          ) : null}
        </div>
      )
    case "paid":
      return (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-sm">
          {order.paid_at ? <p>{t("paidOn", { date: formatDateTime(order.paid_at) })}</p> : null}
          {isSeller ? (
            <ActionButton
              action={markOrderShipped.bind(null, order.id)}
              className="w-full"
              confirm={confirm(t("markShippedConfirm"))}
            >
              {t("markShipped")}
            </ActionButton>
          ) : null}
          {isBuyer ? (
            <ActionButton
              action={confirmOrderReceived.bind(null, order.id)}
              variant="outline"
              className="w-full"
              confirm={confirm(t("confirmReceivedConfirm"))}
            >
              {t("confirmReceived")}
            </ActionButton>
          ) : null}
        </div>
      )
    case "shipped":
      return (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-sm">
          {order.shipped_at ? (
            <p>{t("shippedOn", { date: formatDateTime(order.shipped_at) })}</p>
          ) : null}
          {isBuyer ? (
            <ActionButton
              action={confirmOrderReceived.bind(null, order.id)}
              className="w-full"
              confirm={confirm(t("confirmReceivedConfirm"))}
            >
              {t("confirmReceived")}
            </ActionButton>
          ) : null}
        </div>
      )
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
        <Notice
          tone="muted"
          icon={CircleX}
          text={t("cancelledOn", { date: formatDateTime(order.cancelled_at ?? order.created_at) })}
        />
      )
  }
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
