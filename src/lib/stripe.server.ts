import "server-only"
import Stripe from "stripe"
import { serverEnv } from "@/lib/env.server"

let client: Stripe | undefined

/** Stripe API client (platform account). Server-only; the SDK pins its own API version. */
export function stripe(): Stripe {
  const key = serverEnv().STRIPE_SECRET_KEY
  // Callers catch this and show "payments unavailable".
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  client ??= new Stripe(key, {
    appInfo: { name: "LiciTot" },
    maxNetworkRetries: 2,
  })
  return client
}
