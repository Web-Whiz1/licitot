import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { sendPendingEmails } from "@/features/notifications/email"
import { settleOrders } from "@/features/payments/server"
import { serverEnv } from "@/lib/env.server"

/**
 * Scheduled job (pg_cron + pg_net in Supabase, every 5 minutes): completes orders whose
 * window passed, pays sellers and refunds buyers at Stripe, then sends notification emails (when
 * configured). Authenticated with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""
  const ok =
    Boolean(secret) &&
    given.length === secret!.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret!))
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const orders = await settleOrders()
  const emails = await sendPendingEmails()
  return NextResponse.json({ ...orders, emails })
}
