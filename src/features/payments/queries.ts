import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * Opts a read out of Next.js request memoization: identical GET fetches in one render return
 * the first response, so re-reading an order right after changing it would show stale data.
 */
const fresh = () => new AbortController().signal

/** The signed-in user's Stripe Connect status (owner-only row). */
export async function getPayoutStatus(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles_private")
    .select(
      "stripe_account_id, stripe_details_submitted, stripe_charges_enabled, stripe_payouts_enabled",
    )
    .eq("id", userId)
    .abortSignal(fresh())
    .single()
  if (error) throw error
  return data
}

/** An order the user takes part in (RLS: buyer, seller or admin), with item and parties. */
export async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, status, item_price, platform_fee, shipping_cost, total, delivery_method,
       payment_due_at, paid_at, shipped_at, completed_at, cancelled_at, created_at,
       buyer_id, seller_id, funds_model, ship_by, release_at, released_at, refunded_at,
       handed_over_at, tracking_carrier, tracking_number,
       dispute:order_disputes(reason, details, seller_response, resolution, opened_at),
       auction:auctions!inner(id, slug, title, city, ship_pickup, ship_courier, courier_cost,
         auction_images(path, blur_data_url, position)),
       buyer:profiles!orders_buyer_id_fkey(username, display_name),
       seller:profiles!orders_seller_id_fkey(username, display_name)`,
    )
    .eq("id", id)
    .abortSignal(fresh())
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const cover = [...data.auction.auction_images].sort((a, b) => a.position - b.position)[0] ?? null
  return { ...data, cover }
}

export type OrderView = NonNullable<Awaited<ReturnType<typeof getOrder>>>

/** The pickup handover code: only the buyer gets it, only while the order is paid. */
export async function getHandoverCode(orderId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_handover_code", { p_order_id: orderId })
  return data ?? null
}

/** Open disputes for the admin page (RLS: admins see every order and dispute). */
export async function getOpenDisputes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, item_price, shipping_cost, delivery_method, tracking_carrier, tracking_number,
       paid_at, shipped_at,
       dispute:order_disputes!inner(reason, details, seller_response, opened_at),
       auction:auctions!inner(id, slug, title),
       buyer:profiles!orders_buyer_id_fkey(username, display_name),
       seller:profiles!orders_seller_id_fkey(username, display_name)`,
    )
    .eq("status", "disputed")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data
}

/** Contact details of the other party (only once the order is paid). */
export async function getOrderContact(orderId: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_order_contact", { p_order_id: orderId })
  return data?.[0] ?? null
}
