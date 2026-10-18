"use server"

import { updateTag } from "next/cache"
import type { z } from "zod"
import { getCurrentUser } from "@/features/auth/session"
import { profileTag } from "@/features/profiles/queries"
import type { MessageKey } from "@/i18n/keys"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { reviewSchema } from "./schemas"

const RPC_ERRORS = new Set([
  "order_not_found",
  "review_not_allowed",
  "review_expired",
  "review_invalid",
  "review_exists",
])

/** Rate the other party of a completed order (once, within 30 days). */
export async function leaveReview(input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) return fail("reviews.errors.review_invalid", zodFieldErrors(parsed.error))
  const user = await getCurrentUser()
  if (!user) return fail("auth.errors.generic")
  if (!(await rateLimit({ key: `review:${user.id}`, limit: 20, windowSeconds: 3600 }))) {
    return fail("auth.errors.generic")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("leave_review", {
    p_order_id: parsed.data.orderId,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment,
  })
  if (error) {
    return fail(
      RPC_ERRORS.has(error.message)
        ? (`reviews.errors.${error.message}` as MessageKey)
        : "auth.errors.generic",
    )
  }

  // The reviewee's public profile shows the new rating.
  const { data: order } = await supabase
    .from("orders")
    .select(
      "buyer_id, buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)",
    )
    .eq("id", parsed.data.orderId)
    .single()
  const reviewee = order ? (order.buyer_id === user.id ? order.seller : order.buyer) : null
  if (reviewee?.username) updateTag(profileTag(reviewee.username))
  return { ok: true, message: "reviews.thanks" }
}
