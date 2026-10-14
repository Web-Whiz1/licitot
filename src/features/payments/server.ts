import "server-only"
import { headers } from "next/headers"
import type Stripe from "stripe"
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

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  const { data, error } = await createAdminClient().rpc("order_mark_paid", {
    p_order_id: orderId,
    p_session_id: session.id,
    p_payment_intent_id: paymentIntent ?? session.id,
    p_amount: session.amount_total,
  })
  if (error) {
    console.error("[stripe.fulfill]", orderId, error.message)
    return "failed"
  }
  return data ? "paid" : "already_paid"
}
