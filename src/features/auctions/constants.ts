// Mirrors the Postgres enums/checks in supabase/migrations/*_auctions.sql.

export const ITEM_CONDITIONS = ["nou", "ca_nou", "folosit", "pentru_piese"] as const
export type ItemCondition = (typeof ITEM_CONDITIONS)[number]

export const DURATIONS = [1, 3, 5, 7, 10] as const
export type DurationDays = (typeof DURATIONS)[number]
export const DEFAULT_DURATION: DurationDays = 7

export const AUCTION_STATUSES = [
  "draft",
  "active",
  "ended_sold",
  "ended_unsold",
  "cancelled",
] as const
export type AuctionStatus = (typeof AUCTION_STATUSES)[number]

export const MAX_IMAGES = 10

/** Price limits in bani: 2 RON (Stripe's minimum charge in RON) … 10,000,000 RON. */
export const MIN_PRICE = 200
export const MAX_PRICE = 1_000_000_000
export const MIN_INCREMENT = 100
export const MAX_INCREMENT = 100_000_000
export const MAX_COURIER_COST = 100_000
