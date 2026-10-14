"use server"

import { revalidateTag, updateTag } from "next/cache"
import { AUCTIONS_TAG, auctionTag } from "@/features/auctions/listing"
import { getCurrentUser } from "@/features/auth/session"
import type { MessageKey } from "@/i18n/keys"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { auctionIdSchema, placeBidSchema, type PlaceBidInput } from "./schemas"

/** Stable codes raised by place_bid() / buy_now() / cancel_auction() (SQLSTATE P0001). */
const RPC_ERRORS = new Set([
  "not_authenticated",
  "auction_not_found",
  "auction_ended",
  "own_auction",
  "user_banned",
  "bid_too_low",
  "bid_too_high",
  "max_not_higher",
  "buy_now_unavailable",
  "has_bids",
])

function rpcErrorKey(message: string | undefined): MessageKey {
  return message && RPC_ERRORS.has(message)
    ? (`bid.errors.${message}` as MessageKey)
    : "auth.errors.generic"
}

export type BidOutcome = {
  leading: boolean
  current_price: number
  bid_count: number
  ends_at: string
  extended: boolean
}

export async function placeBid(input: PlaceBidInput): Promise<ActionResult<BidOutcome>> {
  const parsed = placeBidSchema.safeParse(input)
  if (!parsed.success) return fail("bid.errors.invalid", zodFieldErrors(parsed.error))

  const user = await getCurrentUser()
  if (!user) return fail("bid.errors.not_authenticated")
  if (!(await rateLimit({ key: `bid:${user.id}`, limit: 20, windowSeconds: 60 }))) {
    return fail("bid.errors.rate_limited")
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("place_bid", {
    p_auction_id: parsed.data.auctionId,
    p_max_amount: parsed.data.maxAmount,
  })
  if (error) {
    if (error.code !== "P0001") console.error("[bids.place]", error.code, error.message)
    return fail(rpcErrorKey(error.message))
  }

  // Lists may lag a little (stale-while-revalidate); the detail page is live via Realtime.
  revalidateTag(auctionTag(parsed.data.auctionId), "max")
  revalidateTag(AUCTIONS_TAG, "max")
  const outcome = data as BidOutcome
  return {
    ok: true,
    data: outcome,
    message: outcome.leading ? "bid.placedLeading" : "bid.placedOutbid",
  }
}

export async function buyNow(auctionId: string): Promise<ActionResult> {
  if (!auctionIdSchema.safeParse(auctionId).success) return fail("bid.errors.auction_not_found")
  const user = await getCurrentUser()
  if (!user) return fail("bid.errors.not_authenticated")
  if (!(await rateLimit({ key: `bid:${user.id}`, limit: 20, windowSeconds: 60 }))) {
    return fail("bid.errors.rate_limited")
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("buy_now", { p_auction_id: auctionId })
  if (error) {
    if (error.code !== "P0001") console.error("[bids.buyNow]", error.code, error.message)
    return fail(rpcErrorKey(error.message))
  }

  updateTag(auctionTag(auctionId))
  updateTag(AUCTIONS_TAG)
  return { ok: true, message: "bid.bought" }
}

export async function cancelAuction(auctionId: string): Promise<ActionResult> {
  if (!auctionIdSchema.safeParse(auctionId).success) return fail("bid.errors.auction_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("cancel_auction", { p_auction_id: auctionId })
  if (error) {
    if (error.code !== "P0001") console.error("[bids.cancel]", error.code, error.message)
    return fail(rpcErrorKey(error.message))
  }

  updateTag(auctionTag(auctionId))
  updateTag(AUCTIONS_TAG)
  return { ok: true, message: "bid.cancelled" }
}
