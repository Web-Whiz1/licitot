"use server"

import { redirect, unstable_rethrow } from "next/navigation"
import { z } from "zod"
import { getCurrentUser } from "@/features/auth/session"
import type { MessageKey } from "@/i18n/keys"
import { fail, type ActionResult } from "@/lib/action-result"
import { publicEnv } from "@/lib/env"
import { imagekitUrl } from "@/lib/imagekit"
import { rateLimit } from "@/lib/rate-limit"
import { stripe } from "@/lib/stripe.server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { fulfillCheckoutSession, returnOrigin } from "./server"

/** Stable codes raised by the order RPCs (SQLSTATE P0001), mapped to orders.errors.*. */
const RPC_ERRORS = new Set([
  "order_not_found",
  "order_not_pending",
  "order_not_paid",
  "delivery_unavailable",
  "payment_not_overdue",
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
        // Destination charge: the seller receives the money minus LiciTot's 5% fee.
        payment_intent_data: {
          application_fee_amount: order.platform_fee,
          transfer_data: { destination: seller.stripe_account_id },
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

export async function markOrderShipped(orderId: string): Promise<ActionResult> {
  if (!orderIdSchema.safeParse(orderId).success) return fail("orders.errors.order_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("mark_order_shipped", { p_order_id: orderId })
  if (error) return fail(rpcErrorKey(error.message))
  return { ok: true, message: "orders.shippedDone" }
}

export async function confirmOrderReceived(orderId: string): Promise<ActionResult> {
  if (!orderIdSchema.safeParse(orderId).success) return fail("orders.errors.order_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("confirm_order_received", { p_order_id: orderId })
  if (error) return fail(rpcErrorKey(error.message))
  return { ok: true, message: "orders.receivedDone" }
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
