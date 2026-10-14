import { z } from "zod"
import { money } from "@/features/auctions/schemas"
import { MAX_PRICE, MIN_PRICE } from "@/features/auctions/constants"

// The bid form sends what the user typed ("1.250"); the schema outputs bani. The minimum for
// a given auction is checked by place_bid() in Postgres (the price can move at any moment).
export const placeBidSchema = z.object({
  auctionId: z.uuid(),
  maxAmount: money(MIN_PRICE, MAX_PRICE),
})

export type PlaceBidInput = z.input<typeof placeBidSchema>

export const auctionIdSchema = z.uuid()

/** Smallest acceptable bid right now (bani). */
export function minNextBid(a: {
  bid_count: number
  current_price: number
  starting_price: number
  min_increment: number
}): number {
  return a.bid_count === 0 ? a.starting_price : a.current_price + a.min_increment
}
