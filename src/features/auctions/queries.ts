import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { createPublicClient } from "@/lib/supabase/public"
import { createClient } from "@/lib/supabase/server"

export type CategoryGroup = {
  id: number
  slug: string
  name: string
  icon: string | null
  children: { id: number; slug: string; name: string }[]
}

/** Two-level category tree (reference data; changes only via migrations). */
export async function getCategoryTree(): Promise<CategoryGroup[]> {
  "use cache"
  cacheTag("categories")
  cacheLife("days")

  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, slug, name, icon, parent_id, sort_order")
    .order("sort_order")
  if (error) throw error

  const parents = data.filter((c) => c.parent_id === null)
  return parents.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    icon: p.icon,
    children: data
      .filter((c) => c.parent_id === p.id)
      .map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  }))
}

/** A draft owned by the current user (RLS), with images in display order. */
export async function getOwnDraft(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  // reserve_price is not publicly selectable (it is secret); the seller reads it via RPC.
  const [{ data }, { data: reserve }] = await Promise.all([
    supabase
      .from("auctions")
      .select(
        `id, title, description, category_id, condition, starting_price, min_increment,
         buy_now_price, duration_days, county_code, city, ship_pickup, ship_courier, courier_cost,
         auction_images(file_id, path, width, height, blur_data_url, position)`,
      )
      .eq("id", id)
      .eq("status", "draft")
      .order("position", { referencedTable: "auction_images" })
      .maybeSingle(),
    supabase.rpc("get_auction_reserve", { p_auction_id: id }),
  ])
  return data ? { ...data, reserve_price: reserve ?? null } : null
}

/** Seller dashboard list: every auction of the user, newest first, with the cover photo. */
export async function getMyAuctions(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("auctions")
    .select(
      "id, slug, title, status, current_price, starting_price, bid_count, ends_at, created_at, auction_images(path, blur_data_url, position)",
    )
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "auction_images" })
    .limit(1, { referencedTable: "auction_images" })
  if (error) throw error
  return data
}
