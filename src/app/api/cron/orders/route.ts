import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { settleOrders } from "@/features/payments/server"
import { serverEnv } from "@/lib/env.server"

/**
 * Scheduled job (netlify/functions/orders-cron.mts, every 10 minutes): completes orders whose
 * window passed, pays sellers and refunds buyers at Stripe. Authenticated with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""
  const ok =
    Boolean(secret) &&
    given.length === secret!.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret!))
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const result = await settleOrders()
  return NextResponse.json(result)
}
