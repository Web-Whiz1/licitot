// Registers LiciTot's two Stripe webhook endpoints for a deployed site and prints their
// signing secrets. Usage: `pnpm stripe:webhooks https://licitot.netlify.app`
// Then set STRIPE_WEBHOOK_SECRET and STRIPE_CONNECT_WEBHOOK_SECRET in Netlify and redeploy.
// Re-running is safe: existing endpoints for the same URL are reused (secrets are only shown
// when an endpoint is created; roll them in the Stripe dashboard if you lose them).
import Stripe from "stripe"

const site = (process.argv[2] ?? "").replace(/\/$/, "")
if (!/^https:\/\//.test(site)) {
  console.error("Usage: pnpm stripe:webhooks https://your-site.netlify.app (HTTPS only)")
  process.exit(1)
}
const key = process.env.STRIPE_SECRET_KEY
if (!key) throw new Error("STRIPE_SECRET_KEY missing (run through `pnpm stripe:webhooks`)")

const stripe = new Stripe(key)
const url = `${site}/api/stripe/webhook`

const ENDPOINTS = [
  {
    env: "STRIPE_WEBHOOK_SECRET",
    connect: false,
    events: ["checkout.session.completed", "checkout.session.async_payment_succeeded"],
  },
  { env: "STRIPE_CONNECT_WEBHOOK_SECRET", connect: true, events: ["account.updated"] },
] as const

async function main() {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 })
  for (const e of ENDPOINTS) {
    const found = existing.data.find(
      (w) => w.url === url && Boolean(w.application) === e.connect && w.status === "enabled",
    )
    if (found) {
      console.log(`✓ ${e.env}: endpoint ${found.id} already exists (secret not shown again)`)
      continue
    }
    const created = await stripe.webhookEndpoints.create({
      url,
      connect: e.connect,
      enabled_events: [...e.events],
      description: e.connect ? "LiciTot · Connect accounts" : "LiciTot · Checkout",
    })
    console.log(`✓ ${e.env}=${created.secret}`)
  }
}

void main()
