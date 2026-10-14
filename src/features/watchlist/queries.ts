import "server-only"
import { CARD_COLUMNS, toCard, type CardRow } from "@/features/auctions/listing"
import { createClient } from "@/lib/supabase/server"

export async function isWatched(userId: string, auctionId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("watchlist")
    .select("auction_id")
    .eq("user_id", userId)
    .eq("auction_id", auctionId)
    .maybeSingle()
  return data !== null
}

/** Followed auctions as cards: live ones first (ending soonest), then the ended ones. */
export async function getWatchlist(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("watchlist")
    .select(`created_at, auction:auctions!inner(${CARD_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) throw error
  const cards = data.map((r) => toCard(r.auction as unknown as CardRow))
  const live = cards.filter((c) => c.status === "active")
  const ended = cards.filter((c) => c.status !== "active")
  live.sort((a, b) => (a.ends_at ?? "").localeCompare(b.ends_at ?? ""))
  return [...live, ...ended]
}
