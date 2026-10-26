import "server-only"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import type Stripe from "stripe"
import { formatRON, PLATFORM_FEE_PERCENT } from "@/lib/money"
import { SITE_URL } from "@/lib/site"
import { stripe } from "@/lib/stripe.server"
import { createAdminClient } from "@/lib/supabase/admin"

// Trusted payment helpers shared by Server Actions, the return pages and the webhook.

/**
 * Origin for Stripe return URLs: the current host when it is this site (or a local server,
 * e.g. E2E on another port), otherwise the configured SITE_URL.
 */
export async function returnOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) return SITE_URL
  const site = new URL(SITE_URL)
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
  if (host !== site.host && !local) return SITE_URL
  const proto = local ? "http" : (h.get("x-forwarded-proto") ?? site.protocol.replace(":", ""))
  return `${proto}://${host}`
}

/** Copies a connected account's status from Stripe into profiles_private. */
export async function syncConnectedAccount(account: Stripe.Account | string): Promise<void> {
  const a = typeof account === "string" ? await stripe().accounts.retrieve(account) : account
  const { error } = await createAdminClient().rpc("sync_stripe_account", {
    p_account_id: a.id,
    p_details_submitted: a.details_submitted ?? false,
    p_charges_enabled: a.charges_enabled ?? false,
    p_payouts_enabled: a.payouts_enabled ?? false,
  })
  if (error) throw new Error(`[stripe.sync] ${error.message}`)
}

export type FulfillResult = "paid" | "already_paid" | "pending" | "failed"

/**
 * Marks the order of a completed Checkout Session as paid (idempotent). Called from the
 * webhook and when the buyer returns from Checkout, whichever comes first.
 */
export async function fulfillCheckoutSession(
  sessionOrId: Stripe.Checkout.Session | string,
): Promise<FulfillResult> {
  const session =
    typeof sessionOrId === "string"
      ? await stripe().checkout.sessions.retrieve(sessionOrId)
      : sessionOrId
  const orderId = session.metadata?.order_id
  if (!orderId) return "failed"
  if (session.payment_status !== "paid") return "pending"
  if (session.currency !== "ron" || session.amount_total === null) return "failed"

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)
  if (!paymentIntentId) return "failed"

  // The charge is the source of the later transfer to the seller (escrow release).
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId)
  const chargeId =
    typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge?.id ?? null)
  if (!chargeId) return "failed"

  const { data, error } = await createAdminClient().rpc("order_mark_paid", {
    p_order_id: orderId,
    p_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_charge_id: chargeId,
    p_amount: session.amount_total,
  })
  if (error) {
    console.error("[stripe.fulfill]", orderId, error.message)
    return "failed"
  }
  return data ? "paid" : "already_paid"
}

export type SettleResult = { released: number; refunded: number; failed: number }

/**
 * Moves held money (idempotent; safe to run from several places at once):
 * - completed orders not yet paid out → transfer item + shipping − 5% fee to the seller, with
 *   the breakdown (price, shipping, fee, payout) as description and metadata on the transfer
 *   and on the payment the seller sees in their own Stripe account;
 * - cancelled orders that were paid but not refunded → full refund to the buyer.
 * Runs on the order page, after order actions, and from the scheduled job (/api/cron/orders).
 */
export async function settleOrders(orderId?: string): Promise<SettleResult> {
  const db = createAdminClient()
  const result: SettleResult = { released: 0, refunded: 0, failed: 0 }
  // Time-based steps first (shipped past the window → completed; abandoned → cancelled).
  await db.rpc("advance_orders")

  // Which payouts are due is decided by the database clock (release_at uses now() too).
  const { data: releases } = await db.rpc(
    "orders_ready_for_payout",
    orderId ? { p_order_id: orderId } : {},
  )

  const due = releases ?? []
  // The fee breakdown travels with each payout, so the seller sees it in Stripe too.
  const { data: details } = due.length
    ? await db
        .from("orders")
        .select("id, item_price, shipping_cost, platform_fee, auction:auctions(title)")
        .in(
          "id",
          due.map((o) => o.id),
        )
    : { data: [] }
  const detailsById = new Map((details ?? []).map((d) => [d.id, d]))
  const t = due.length ? await getTranslations({ locale: "ro", namespace: "payouts" }) : null

  for (const o of due) {
    try {
      if (!o.stripe_account_id) throw new Error("seller has no Stripe account")
      const d = detailsById.get(o.id)
      const ron = (bani: number) => formatRON(bani, { compact: true })
      const breakdown: Record<string, string> = d
        ? {
            item_price: String(d.item_price),
            shipping_cost: String(d.shipping_cost),
            platform_fee: String(d.platform_fee),
            payout: String(o.amount),
          }
        : {}
      const description =
        d && t
          ? t("transferDescription", {
              title: (d.auction?.title ?? "").slice(0, 80),
              item: ron(d.item_price),
              hasShipping: d.shipping_cost > 0 ? "yes" : "no",
              shipping: ron(d.shipping_cost),
              percent: PLATFORM_FEE_PERCENT,
              fee: ron(d.platform_fee),
              payout: ron(o.amount),
            })
          : undefined
      const transfer = await stripe().transfers.create(
        {
          amount: o.amount,
          currency: "ron",
          destination: o.stripe_account_id,
          source_transaction: o.stripe_charge_id,
          transfer_group: o.id,
          description,
          metadata: { order_id: o.id, ...breakdown },
        },
        // Same key as before: a retry must never create a second transfer.
        { idempotencyKey: `release-${o.id}` },
      )
      const { error } = await db.rpc("order_mark_released", {
        p_order_id: o.id,
        p_transfer_id: transfer.id,
      })
      if (error) throw new Error(error.message)
      result.released++
      // The seller's Stripe shows the payment created in their account, not our transfer:
      // label that payment with the same breakdown (best effort, the money already moved).
      if (description && typeof transfer.destination_payment === "string") {
        await stripe()
          .charges.update(
            transfer.destination_payment,
            { description, metadata: { order_id: o.id, ...breakdown } },
            { stripeAccount: o.stripe_account_id },
          )
          .catch((e: unknown) => console.error("[settle.label]", o.id, e))
      }
    } catch (e) {
      console.error("[settle.release]", o.id, e)
      result.failed++
    }
  }

  let toRefund = db
    .from("orders")
    .select("id, funds_model, stripe_payment_intent_id")
    .eq("status", "cancelled")
    .not("paid_at", "is", null)
    .is("refunded_at", null)
    .not("stripe_payment_intent_id", "is", null)
    .limit(50)
  if (orderId) toRefund = toRefund.eq("id", orderId)
  const { data: refunds } = await toRefund

  for (const o of refunds ?? []) {
    try {
      const refund = await stripe().refunds.create(
        {
          payment_intent: o.stripe_payment_intent_id!,
          // Orders paid before escrow sent the money to the seller at once: take it back.
          ...(o.funds_model === "direct"
            ? { reverse_transfer: true, refund_application_fee: true }
            : {}),
          metadata: { order_id: o.id },
        },
        { idempotencyKey: `refund-${o.id}` },
      )
      const { error } = await db.rpc("order_mark_refunded", {
        p_order_id: o.id,
        p_refund_id: refund.id,
      })
      if (error) throw new Error(error.message)
      result.refunded++
    } catch (e) {
      console.error("[settle.refund]", o.id, e)
      result.failed++
    }
  }
  return result
}
