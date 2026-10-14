import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { PAGE_SIZE, type BrowseFilters } from "@/features/search/params"
import { createPublicClient } from "@/lib/supabase/public"
import { getCategoryTree } from "./queries"

// Public listing data, cached for a few minutes (tag "auctions"). Live prices on the detail
// page come from Realtime (Phase 5); lists tolerate being a minute or two behind.

export const AUCTIONS_TAG = "auctions"
export const auctionTag = (id: string) => `auction:${id}`

export const CARD_COLUMNS =
  "id, slug, title, status, current_price, starting_price, bid_count, buy_now_price, ends_at, city, county_code, condition, auction_images(path, blur_data_url, position)"

export type CardRow = {
  id: string
  slug: string
  title: string
  status: string
  current_price: number
  starting_price: number
  bid_count: number
  buy_now_price: number | null
  ends_at: string | null
  city: string
  county_code: string
  condition: string
  auction_images: { path: string; blur_data_url: string | null; position: number }[]
}

export type AuctionCardData = Omit<CardRow, "auction_images"> & {
  cover: { path: string; blurDataUrl: string | null } | null
}

export function toCard(row: CardRow): AuctionCardData {
  const { auction_images, ...rest } = row
  const cover = [...auction_images].sort((a, b) => a.position - b.position)[0]
  return { ...rest, cover: cover ? { path: cover.path, blurDataUrl: cover.blur_data_url } : null }
}

/** Live = published, not hidden (RLS), not past its end time. */
function liveQuery() {
  return createPublicClient()
    .from("auctions")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .order("position", { referencedTable: "auction_images" })
    .limit(1, { referencedTable: "auction_images" })
}

/** Category slug → its id plus all child ids (parents include their subcategories). */
async function categoryIds(slug: string): Promise<number[] | null> {
  const tree = await getCategoryTree()
  for (const parent of tree) {
    if (parent.slug === slug) return [parent.id, ...parent.children.map((c) => c.id)]
    const child = parent.children.find((c) => c.slug === slug)
    if (child) return [child.id]
  }
  return null
}

export async function searchAuctions(
  f: BrowseFilters,
): Promise<{ items: AuctionCardData[]; total: number }> {
  "use cache"
  cacheTag(AUCTIONS_TAG)
  cacheLife("minutes")

  let query = liveQuery()
  if (f.q) query = query.textSearch("search_tsv", f.q, { config: "ro_unaccent", type: "websearch" })
  if (f.category) {
    const ids = await categoryIds(f.category)
    if (!ids) return { items: [], total: 0 }
    query = query.in("category_id", ids)
  }
  if (f.minPrice !== null) query = query.gte("current_price", f.minPrice * 100)
  if (f.maxPrice !== null) query = query.lte("current_price", f.maxPrice * 100)
  if (f.county) query = query.eq("county_code", f.county)
  if (f.conditions.length) query = query.in("condition", f.conditions)
  if (f.endingSoon) query = query.lte("ends_at", new Date(Date.now() + 86_400_000).toISOString())

  switch (f.sort) {
    case "noi":
      query = query.order("published_at", { ascending: false })
      break
    case "pret_asc":
      query = query.order("current_price", { ascending: true })
      break
    case "pret_desc":
      query = query.order("current_price", { ascending: false })
      break
    case "oferte":
      query = query.order("bid_count", { ascending: false }).order("ends_at", { ascending: true })
      break
    default:
      query = query.order("ends_at", { ascending: true })
  }

  const from = (f.page - 1) * PAGE_SIZE
  const { data, count, error } = await query.order("id").range(from, from + PAGE_SIZE - 1)
  if (error) throw error
  return { items: (data as CardRow[]).map(toCard), total: count ?? 0 }
}

export async function getHomeSections() {
  "use cache"
  cacheTag(AUCTIONS_TAG)
  cacheLife("minutes")

  const [endingSoon, newest, featured] = await Promise.all([
    liveQuery().order("ends_at", { ascending: true }).limit(8),
    liveQuery().order("published_at", { ascending: false }).limit(8),
    liveQuery()
      .order("bid_count", { ascending: false })
      .order("current_price", { ascending: false })
      .limit(4),
  ])
  for (const r of [endingSoon, newest, featured]) if (r.error) throw r.error
  return {
    endingSoon: (endingSoon.data as CardRow[]).map(toCard),
    newest: (newest.data as CardRow[]).map(toCard),
    featured: (featured.data as CardRow[]).map(toCard),
  }
}

/** Full public auction for the detail page (any non-draft, non-hidden status). */
export async function getPublicAuction(id: string) {
  "use cache"
  cacheTag(auctionTag(id), AUCTIONS_TAG)
  cacheLife("minutes")

  const { data, error } = await createPublicClient()
    .from("auctions")
    .select(
      `id, slug, title, description, condition, status, starting_price, has_reserve, reserve_met, buy_now_price,
       min_increment, current_price, bid_count, published_at, starts_at, ends_at, final_price, high_bidder_id, winner_id, updated_at,
       county_code, city, ship_pickup, ship_courier, courier_cost, seller_id, category_id,
       county:counties(name),
       category:categories(id, slug, name, parent_id),
       seller:profiles!auctions_seller_id_fkey(username, display_name, avatar_path, rating_avg, rating_count, created_at, city, county_code),
       auction_images(path, width, height, blur_data_url, position)`,
    )
    .eq("id", id)
    .neq("status", "draft")
    .order("position", { referencedTable: "auction_images" })
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getSimilarAuctions(categoryId: number, excludeId: string) {
  "use cache"
  cacheTag(AUCTIONS_TAG)
  cacheLife("minutes")

  const { data, error } = await liveQuery()
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("ends_at", { ascending: true })
    .limit(4)
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}

export async function getSellerAuctions(sellerId: string, excludeId?: string) {
  "use cache"
  cacheTag(AUCTIONS_TAG)
  cacheLife("minutes")

  let query = liveQuery().eq("seller_id", sellerId)
  if (excludeId) query = query.neq("id", excludeId)
  const { data, error } = await query.order("ends_at", { ascending: true }).limit(8)
  if (error) throw error
  return (data as CardRow[]).map(toCard)
}
