import { calcSellerPayout } from "@/lib/money"

// Suggested minimum bid increment by starting price (all bani). Tiers keep bidding meaningful
// on cheap items without making expensive ones crawl.
const TIERS: [upTo: number, increment: number][] = [
  [100_00, 5_00], // < 100 RON → 5 RON
  [500_00, 10_00], // < 500 RON → 10 RON
  [1_000_00, 20_00], // < 1.000 RON → 20 RON
  [5_000_00, 50_00], // < 5.000 RON → 50 RON
  [20_000_00, 100_00], // < 20.000 RON → 100 RON
]

export function suggestIncrement(startingPrice: number): number {
  for (const [upTo, inc] of TIERS) if (startingPrice < upTo) return inc
  return 250_00
}

/** What the seller would receive if the auction sold at `price` (5% fee, shipping excluded). */
export function estimatePayout(price: number): number {
  return calcSellerPayout(price)
}
