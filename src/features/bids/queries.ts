import "server-only"
import { createClient } from "@/lib/supabase/server"

// Account pages (request-time, RLS as the signed-in user).

type Image = { path: string; blur_data_url: string | null; position: number }

function cover(images: Image[]) {
  return [...images].sort((a, b) => a.position - b.position)[0] ?? null
}

/** Auctions the user bid on, most recent activity first, with their secret maximum. */
export async function getMyBids(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("auto_bids")
    .select(
      `max_amount, updated_at,
       auction:auctions!inner(id, slug, title, status, current_price, bid_count, ends_at,
         high_bidder_id, winner_id, final_price, auction_images(path, blur_data_url, position))`,
    )
    .eq("bidder_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data.map(({ auction, ...rest }) => {
    const { auction_images, ...a } = auction
    return { ...rest, auction: { ...a, cover: cover(auction_images) } }
  })
}

/** Auctions the user won (bidding or buy now), newest first, with the seller. */
export async function getWonAuctions(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("auctions")
    .select(
      `id, slug, title, final_price, ends_at, ship_pickup, ship_courier, courier_cost, city,
       seller:profiles!auctions_seller_id_fkey(username, display_name),
       order:orders(id, status, payment_due_at),
       auction_images(path, blur_data_url, position)`,
    )
    .eq("winner_id", userId)
    .eq("status", "ended_sold")
    .order("ends_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data.map(({ auction_images, ...a }) => ({ ...a, cover: cover(auction_images) }))
}

/** The user's sold auctions, newest first, with the buyer. */
export async function getSoldAuctions(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("auctions")
    .select(
      `id, slug, title, final_price, ends_at, bid_count,
       winner:profiles!auctions_winner_id_fkey(username, display_name),
       order:orders(id, status, payment_due_at),
       auction_images(path, blur_data_url, position)`,
    )
    .eq("seller_id", userId)
    .eq("status", "ended_sold")
    .order("ends_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data.map(({ auction_images, ...a }) => ({ ...a, cover: cover(auction_images) }))
}
