"use server"

import { redirect, unstable_rethrow } from "next/navigation"
import { z } from "zod"
import { getCurrentUser } from "@/features/auth/session"
import type { MessageKey } from "@/i18n/keys"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import { publicEnv } from "@/lib/env"
import { imagekitUrl } from "@/lib/imagekit"
import { rateLimit } from "@/lib/rate-limit"
import { SITE_URL } from "@/lib/site"
import { stripe } from "@/lib/stripe.server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { fulfillCheckoutSession, returnOrigin, settleOrders, syncConnectedAccount } from "./server"
import { disputeSchema, disputeResponseSchema, handoverSchema, shipSchema } from "./schemas"

/** Stable codes raised by the order RPCs (SQLSTATE P0001), mapped to orders.errors.*. */
const RPC_ERRORS = new Set([
  "order_not_found",
  "order_not_pending",
  "order_not_paid",
  "delivery_unavailable",
  "payment_not_overdue",
  "order_not_handover",
  "order_not_shippable",
  "tracking_invalid",
  "dispute_not_allowed",
  "dispute_invalid",
  "deadline_not_passed",
  "not_admin",
])

function rpcErrorKey(message: string | undefined): MessageKey {
  return message && RPC_ERRORS.has(message)
    ? (`orders.errors.${message}` as MessageKey)
    : "auth.errors.generic"
}

const orderIdSchema = z.uuid()
const checkoutSchema = z.object({
  orderId: z.uuid(),
  delivery: z.enum(["pickup", "courier"]).optional(),
})

// ─── Stripe Connect (sellers) ───────────────────────────────────────────

/** Creates the seller's Express account on first use, then sends them to Stripe onboarding. */
export async function startStripeOnboarding(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  if (!(await rateLimit({ key: `connect:${user.id}`, limit: 10, windowSeconds: 600 }))) {
    return fail("orders.errors.rate_limited")
  }

  const supabase = await createClient()
  const { data: priv } = await supabase
    .from("profiles_private")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single()

  let accountId = priv?.stripe_account_id ?? null
  try {
    if (!accountId) {
      const account = await stripe().accounts.create(
        {
          type: "express",
          country: "RO",
          email: user.email ?? undefined,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          business_profile: { product_description: "Vânzări prin licitații pe LiciTot" },
          metadata: { user_id: user.id },
        },
        // A double click must not create two accounts.
        { idempotencyKey: `connect-account-${user.id}` },
      )
      const { data: stored, error } = await createAdminClient().rpc("set_stripe_account", {
        p_user_id: user.id,
        p_account_id: account.id,
      })
      if (error || !stored) throw new Error(error?.message ?? "set_stripe_account failed")
      accountId = stored
    }

    const origin = await returnOrigin()
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/cont/incasari?stripe=reia`,
      return_url: `${origin}/cont/incasari?stripe=gata`,
    })
    redirect(link.url)
  } catch (e) {
    unstable_rethrow(e) // redirect() throws on purpose
    console.error("[connect.onboarding]", e)
    return fail("orders.errors.stripe_unavailable")
  }
}

const sellerKindSchema = z.enum(["individual", "company"])
export type SellerKind = z.infer<typeof sellerKindSchema>

/**
 * Creates the seller's Express account with the business type they picked (most LiciTot
 * sellers are private individuals), prefilled with what we already know, so Stripe's
 * onboarding asks as little as possible. Onboarding itself is embedded on /cont/incasari.
 * For an account that exists but isn't submitted yet, only the business type is updated.
 */
export async function createSellerAccount(kind: SellerKind): Promise<ActionResult> {
  const parsed = sellerKindSchema.safeParse(kind)
  if (!parsed.success) return fail("auth.errors.generic")
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  if (!(await rateLimit({ key: `connect:${user.id}`, limit: 10, windowSeconds: 600 }))) {
    return fail("orders.errors.rate_limited")
  }

  const supabase = await createClient()
  const [{ data: priv }, { data: profile }] = await Promise.all([
    supabase
      .from("profiles_private")
      .select("stripe_account_id, stripe_details_submitted")
      .eq("id", user.id)
      .single(),
    supabase.from("profiles").select("username").eq("id", user.id).single(),
  ])

  try {
    if (priv?.stripe_account_id) {
      if (!priv.stripe_details_submitted) {
        await stripe().accounts.update(priv.stripe_account_id, { business_type: parsed.data })
      }
      return { ok: true }
    }

    // Stripe needs a public https address; the seller's profile page is what buyers see.
    const profileUrl =
      profile && SITE_URL.startsWith("https://") ? `${SITE_URL}/u/${profile.username}` : undefined
    const account = await stripe().accounts.create(
      {
        type: "express",
        country: "RO",
        email: user.email ?? undefined,
        business_type: parsed.data,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: {
          product_description: "Vânzări prin licitații pe LiciTot",
          mcc: "5999", // Miscellaneous and specialty retail
          url: profileUrl,
        },
        metadata: { user_id: user.id },
      },
      // A double click must not create two accounts.
      { idempotencyKey: `connect-account-${user.id}-${parsed.data}` },
    )
    const { data: stored, error } = await createAdminClient().rpc("set_stripe_account", {
      p_user_id: user.id,
      p_account_id: account.id,
    })
    if (error || !stored) throw new Error(error?.message ?? "set_stripe_account failed")
    return { ok: true }
  } catch (e) {
    console.error("[connect.create]", e)
    return fail("orders.errors.stripe_unavailable")
  }
}

/**
 * Short-lived Account Session for the embedded Stripe components on /cont/incasari:
 * onboarding, alerts, balance and payouts, and account details (bank account, identity).
 */
export async function createConnectSession(): Promise<ActionResult<{ clientSecret: string }>> {
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  if (!(await rateLimit({ key: `connect-session:${user.id}`, limit: 30, windowSeconds: 600 }))) {
    return fail("orders.errors.rate_limited")
  }
  const supabase = await createClient()
  const { data: priv } = await supabase
    .from("profiles_private")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single()
  if (!priv?.stripe_account_id) return fail("orders.errors.connect_missing")

  try {
    const bank = { external_account_collection: true }
    const session = await stripe().accountSessions.create({
      account: priv.stripe_account_id,
      components: {
        account_onboarding: { enabled: true, features: bank },
        notification_banner: { enabled: true, features: bank },
        account_management: { enabled: true, features: bank },
        // Payouts follow Stripe's automatic schedule; sellers only see them.
        payouts: {
          enabled: true,
          features: {
            ...bank,
            instant_payouts: false,
            standard_payouts: false,
            edit_payout_schedule: false,
          },
        },
      },
    })
    return { ok: true, data: { clientSecret: session.client_secret } }
  } catch (e) {
    console.error("[connect.session]", e)
    return fail("orders.errors.stripe_unavailable")
  }
}

/** Re-reads the seller's Stripe account (after the embedded onboarding closes). */
export async function refreshSellerAccount(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  const supabase = await createClient()
  const { data: priv } = await supabase
    .from("profiles_private")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single()
  if (!priv?.stripe_account_id) return fail("orders.errors.connect_missing")
  try {
    await syncConnectedAccount(priv.stripe_account_id)
    return { ok: true }
  } catch (e) {
    console.error("[connect.refresh]", e)
    return fail("orders.errors.stripe_unavailable")
  }
}

/** One-time login link to the seller's Stripe Express dashboard (payouts, balance). */
export async function openStripeDashboard(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  const supabase = await createClient()
  const { data: priv } = await supabase
    .from("profiles_private")
    .select("stripe_account_id, stripe_details_submitted")
    .eq("id", user.id)
    .single()
  if (!priv?.stripe_account_id || !priv.stripe_details_submitted) {
    return fail("orders.errors.connect_missing")
  }
  try {
    const link = await stripe().accounts.createLoginLink(priv.stripe_account_id)
    redirect(link.url)
  } catch (e) {
    unstable_rethrow(e)
    console.error("[connect.dashboard]", e)
    return fail("orders.errors.stripe_unavailable")
  }
}

// ─── Checkout (buyers) ──────────────────────────────────────────────────

/** Saves the delivery choice if given, then sends the buyer to Stripe Checkout. */
export async function startCheckout(input: z.input<typeof checkoutSchema>): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return fail("orders.errors.order_not_found")
  const { orderId, delivery } = parsed.data

  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  if (!(await rateLimit({ key: `checkout:${user.id}`, limit: 20, windowSeconds: 600 }))) {
    return fail("orders.errors.rate_limited")
  }

  const supabase = await createClient()
  if (delivery) {
    const { error } = await supabase.rpc("choose_delivery", {
      p_order_id: orderId,
      p_method: delivery,
    })
    if (error) return fail(rpcErrorKey(error.message))
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, buyer_id, seller_id, status, item_price, platform_fee, shipping_cost, total,
       delivery_method, stripe_checkout_session_id,
       auction:auctions!inner(id, title, auction_images(path, position))`,
    )
    .eq("id", orderId)
    .maybeSingle()
  if (!order || order.buyer_id !== user.id) return fail("orders.errors.order_not_found")
  if (order.status !== "pending_payment") return fail("orders.errors.order_not_pending")
  if (!order.delivery_method) return fail("orders.errors.delivery_required")

  // The seller must be able to receive money.
  const { data: seller } = await createAdminClient()
    .from("profiles_private")
    .select("stripe_account_id, stripe_charges_enabled")
    .eq("id", order.seller_id)
    .single()
  if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
    return fail("orders.errors.seller_not_ready")
  }

  const origin = await returnOrigin()
  let url: string | null = null
  try {
    // Reuse an open session for the same amount; otherwise start a new one.
    if (order.stripe_checkout_session_id) {
      const existing = await stripe().checkout.sessions.retrieve(order.stripe_checkout_session_id)
      if (existing.status === "complete") {
        await fulfillCheckoutSession(existing)
        redirect(`/cont/comanda/${order.id}`)
      }
      if (existing.status === "open") {
        if (existing.amount_total === order.item_price + order.shipping_cost && existing.url)
          url = existing.url
        else await stripe().checkout.sessions.expire(existing.id)
      }
    }

    if (!url) {
      const cover = [...order.auction.auction_images].sort((a, b) => a.position - b.position)[0]
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        locale: "ro",
        currency: "ron",
        customer_email: user.email ?? undefined,
        client_reference_id: order.id,
        metadata: { order_id: order.id, auction_id: order.auction.id },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "ron",
              unit_amount: order.item_price,
              product_data: {
                name: order.auction.title,
                images: cover
                  ? [
                      imagekitUrl(publicEnv.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT, cover.path, {
                        width: 600,
                      }),
                    ]
                  : undefined,
              },
            },
          },
          ...(order.shipping_cost > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: "ron",
                    unit_amount: order.shipping_cost,
                    product_data: { name: "Livrare prin curier" },
                  },
                },
              ]
            : []),
        ],
        // Escrow: the platform collects the payment; the seller is paid (minus the 5% fee)
        // only when the order is completed (settleOrders → transfer with this group).
        payment_intent_data: {
          transfer_group: order.id,
          metadata: { order_id: order.id, auction_id: order.auction.id },
          description: `LiciTot: ${order.auction.title}`.slice(0, 200),
        },
        success_url: `${origin}/cont/comanda/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cont/comanda/${order.id}?plata=anulata`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      })
      const { error } = await createAdminClient().rpc("order_attach_checkout", {
        p_order_id: order.id,
        p_session_id: session.id,
      })
      if (error) throw new Error(error.message)
      url = session.url
    }
  } catch (e) {
    unstable_rethrow(e)
    console.error("[checkout]", e)
    return fail("orders.errors.stripe_unavailable")
  }

  if (!url) return fail("orders.errors.stripe_unavailable")
  redirect(url)
}

// ─── Order steps ────────────────────────────────────────────────────────
// Each step is a Postgres function that checks who may do what; settleOrders() then moves the
// money at Stripe (payout to the seller, or refund to the buyer) when the step requires it.

async function settleQuietly(orderId: string) {
  try {
    await settleOrders(orderId)
  } catch (e) {
    // The scheduled job retries; the order itself is already in the right state.
    console.error("[orders.settle]", orderId, e)
  }
}

/** Seller, pickup: the buyer's 6-digit code proves the handover and releases the money. */
export async function confirmHandover(
  input: z.input<typeof handoverSchema>,
): Promise<ActionResult> {
  const parsed = handoverSchema.safeParse(input)
  if (!parsed.success)
    return fail("orders.errors.handover_invalid", { code: "orders.errors.handover_invalid" })
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")
  if (!(await rateLimit({ key: `handover:${user.id}`, limit: 20, windowSeconds: 600 }))) {
    return fail("orders.errors.rate_limited")
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("confirm_handover", {
    p_order_id: parsed.data.orderId,
    p_code: parsed.data.code,
  })
  if (error) return fail(rpcErrorKey(error.message))
  if (data === "locked") return fail("orders.errors.handover_locked")
  if (data !== "ok")
    return fail("orders.errors.handover_invalid", { code: "orders.errors.handover_invalid" })
  await settleQuietly(parsed.data.orderId)
  return { ok: true, message: "orders.handoverDone" }
}

/** Seller, courier: AWB number required. */
export async function markOrderShipped(input: z.input<typeof shipSchema>): Promise<ActionResult> {
  const parsed = shipSchema.safeParse(input)
  if (!parsed.success) return fail("orders.errors.tracking_invalid", zodFieldErrors(parsed.error))
  const supabase = await createClient()
  const { error } = await supabase.rpc("mark_order_shipped", {
    p_order_id: parsed.data.orderId,
    p_carrier: parsed.data.carrier,
    p_tracking_number: parsed.data.trackingNumber,
  })
  if (error) return fail(rpcErrorKey(error.message))
  return { ok: true, message: "orders.shippedDone" }
}

/** Buyer: received and happy → the seller is paid now. */
export async function confirmOrderReceived(orderId: string): Promise<ActionResult> {
  if (!orderIdSchema.safeParse(orderId).success) return fail("orders.errors.order_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("confirm_order_received", { p_order_id: orderId })
  if (error) return fail(rpcErrorKey(error.message))
  await settleQuietly(orderId)
  return { ok: true, message: "orders.receivedDone" }
}

/** Buyer: something is wrong → the money stays frozen until an admin decides. */
export async function openDispute(input: z.input<typeof disputeSchema>): Promise<ActionResult> {
  const parsed = disputeSchema.safeParse(input)
  if (!parsed.success) return fail("orders.errors.dispute_invalid", zodFieldErrors(parsed.error))
  const supabase = await createClient()
  const { error } = await supabase.rpc("open_dispute", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  })
  if (error) return fail(rpcErrorKey(error.message))
  return { ok: true, message: "orders.disputeOpened" }
}

/** Seller: their side of the story. */
export async function respondDispute(
  input: z.input<typeof disputeResponseSchema>,
): Promise<ActionResult> {
  const parsed = disputeResponseSchema.safeParse(input)
  if (!parsed.success) return fail("orders.errors.dispute_invalid", zodFieldErrors(parsed.error))
  const supabase = await createClient()
  const { error } = await supabase.rpc("respond_dispute", {
    p_order_id: parsed.data.orderId,
    p_response: parsed.data.response,
  })
  if (error) return fail(rpcErrorKey(error.message))
  return { ok: true, message: "orders.disputeResponded" }
}

/** Buyer: the seller missed the 5-day deadline → cancel and get a full refund. */
export async function cancelLateOrder(orderId: string): Promise<ActionResult> {
  if (!orderIdSchema.safeParse(orderId).success) return fail("orders.errors.order_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("cancel_late_order", { p_order_id: orderId })
  if (error) return fail(rpcErrorKey(error.message))
  await settleQuietly(orderId)
  return { ok: true, message: "orders.refundDone" }
}

/** Admin: decide a dispute (refund the buyer, or pay the seller). */
export async function resolveDispute(
  orderId: string,
  outcome: "refund" | "release",
): Promise<ActionResult> {
  if (!orderIdSchema.safeParse(orderId).success) return fail("orders.errors.order_not_found")
  if (outcome !== "refund" && outcome !== "release") return fail("orders.errors.dispute_invalid")
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_resolve_dispute", {
    p_order_id: orderId,
    p_outcome: outcome,
  })
  if (error) return fail(rpcErrorKey(error.message))
  await settleQuietly(orderId)
  return { ok: true, message: outcome === "refund" ? "orders.refundDone" : "orders.releaseDone" }
}

/** Seller cancels an order that wasn't paid by the deadline. Closes any open Checkout first. */
export async function cancelUnpaidOrder(orderId: string): Promise<ActionResult> {
  if (!orderIdSchema.safeParse(orderId).success) return fail("orders.errors.order_not_found")
  const user = await getCurrentUser()
  if (!user) return fail("orders.errors.not_authenticated")

  const supabase = await createClient()
  const { data: order } = await supabase
    .from("orders")
    .select("id, seller_id, stripe_checkout_session_id")
    .eq("id", orderId)
    .maybeSingle()
  if (!order || order.seller_id !== user.id) return fail("orders.errors.order_not_found")

  if (order.stripe_checkout_session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(order.stripe_checkout_session_id)
      if (s.status === "complete") {
        await fulfillCheckoutSession(s)
        return fail("orders.errors.order_not_pending")
      }
      if (s.status === "open") await stripe().checkout.sessions.expire(s.id)
    } catch (e) {
      console.error("[orders.cancel]", e)
      return fail("orders.errors.stripe_unavailable")
    }
  }

  const { error } = await supabase.rpc("cancel_unpaid_order", { p_order_id: orderId })
  if (error) return fail(rpcErrorKey(error.message))
  return { ok: true, message: "orders.cancelledDone" }
}
