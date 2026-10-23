import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { createPublicClient } from "@/lib/supabase/public"
import { createClient } from "@/lib/supabase/server"

export const profileTag = (username: string) => `profile:${username}`

/** Public profile by username. Cached; invalidated by updateProfile() via updateTag. */
export async function getPublicProfile(username: string) {
  "use cache"
  cacheTag(profileTag(username))
  cacheLife("hours")

  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_path, city, bio, rating_avg, rating_count, created_at, county:counties(name)",
    )
    .eq("username", username)
    .maybeSingle()
  if (error) throw error
  return data
}

/** The signed-in user's editable profile + private data (RLS: owner only). */
export async function getMySettings(userId: string) {
  const supabase = await createClient()
  const [profile, priv] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_path, county_code, city, bio")
      .eq("id", userId)
      .single(),
    supabase.from("profiles_private").select("phone, phone_verified_at").eq("id", userId).single(),
  ])
  if (profile.error) throw profile.error
  if (priv.error) throw priv.error
  return { ...profile.data, ...priv.data }
}

/**
 * Everything the account overview needs in one round of parallel queries (RLS: own rows):
 * the profile card plus counters for what needs attention. Counts only (head requests).
 */
export async function getAccountOverview(userId: string) {
  const supabase = await createClient()
  const count = { count: "exact", head: true } as const
  const [profile, listings, toPay, toShip, toConfirm, outbid, unread, payouts] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_path, city, rating_avg, rating_count, created_at")
      .eq("id", userId)
      .single(),
    supabase.from("auctions").select("id", count).eq("seller_id", userId).eq("status", "active"),
    supabase
      .from("orders")
      .select("id", count)
      .eq("buyer_id", userId)
      .eq("status", "pending_payment"),
    supabase.from("orders").select("id", count).eq("seller_id", userId).eq("status", "paid"),
    supabase.from("orders").select("id", count).eq("buyer_id", userId).eq("status", "shipped"),
    // Running auctions where someone else now leads.
    supabase
      .from("auto_bids")
      .select("auction_id, auction:auctions!inner(id)", count)
      .eq("bidder_id", userId)
      .eq("auction.status", "active")
      .neq("auction.high_bidder_id", userId),
    supabase.from("notifications").select("id", count).eq("user_id", userId).is("read_at", null),
    supabase.from("profiles_private").select("stripe_charges_enabled").eq("id", userId).single(),
  ])
  if (profile.error) throw profile.error
  return {
    profile: profile.data,
    activeListings: listings.count ?? 0,
    ordersToPay: toPay.count ?? 0,
    ordersToShip: toShip.count ?? 0,
    ordersToConfirm: toConfirm.count ?? 0,
    outbid: outbid.count ?? 0,
    unreadNotifications: unread.count ?? 0,
    payoutsActive: payouts.data?.stripe_charges_enabled ?? false,
  }
}
