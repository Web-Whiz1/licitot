import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { fulfillCheckoutSession, syncConnectedAccount } from "@/features/payments/server"
import { serverEnv } from "@/lib/env.server"
import { stripe } from "@/lib/stripe.server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Stripe webhook. Two endpoints may point here: the platform endpoint (Checkout events) and
 * the Connect endpoint (account.updated of sellers' accounts), each with its own signing
 * secret. The signature is the only trust signal; the body is never parsed before it checks.
 * Every event is processed once (private.stripe_events); a failed handler releases the event
 * so Stripe's retry runs it again.
 */
export async function POST(request: NextRequest) {
  const env = serverEnv()
  const secrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => Boolean(s),
  )
  const signature = request.headers.get("stripe-signature")
  if (!secrets.length || !signature) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 })
  }

  const payload = await request.text()
  let event: Stripe.Event | null = null
  for (const secret of secrets) {
    try {
      event = stripe().webhooks.constructEvent(payload, signature, secret)
      break
    } catch {
      // Try the next endpoint's secret.
    }
  }
  if (!event) return NextResponse.json({ error: "bad_signature" }, { status: 400 })

  const db = createAdminClient()
  const { data: first, error: seenError } = await db.rpc("stripe_event_once", {
    p_event_id: event.id,
    p_type: event.type,
  })
  if (seenError) return NextResponse.json({ error: "db" }, { status: 500 })
  if (!first) return NextResponse.json({ received: true, duplicate: true })

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const result = await fulfillCheckoutSession(event.data.object)
        if (result === "failed") throw new Error(`fulfill failed for ${event.data.object.id}`)
        break
      }
      case "account.updated":
        await syncConnectedAccount(event.data.object)
        break
      default:
        // Not used by LiciTot.
        break
    }
  } catch (e) {
    console.error("[stripe.webhook]", event.type, event.id, e)
    await db.rpc("stripe_event_release", { p_event_id: event.id })
    return NextResponse.json({ error: "handler_failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
