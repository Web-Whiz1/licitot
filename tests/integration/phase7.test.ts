import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  admin,
  anon,
  connectPayouts,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers"

// Phase 7: notifications written by triggers, reviews and ratings, reports and admin tools.

let seller: TestUser
let buyer: TestUser
let rival: TestUser
let staff: TestUser
let categoryId: number

async function activeAuction(opts: { buyNow?: number; endsInMs?: number } = {}) {
  const now = Date.now()
  const { data, error } = await admin()
    .from("auctions")
    .insert({
      seller_id: seller.id,
      category_id: categoryId,
      title: "Lampă de birou vintage",
      description: "Lampă de birou din anii '80, funcțională, cu bec nou.",
      condition: "folosit",
      starting_price: 10_000,
      current_price: 10_000,
      min_increment: 500,
      buy_now_price: opts.buyNow ?? null,
      duration_days: 3,
      county_code: "CJ",
      city: "Cluj-Napoca",
      ship_pickup: true,
      ship_courier: false,
      status: "active",
      published_at: new Date(now).toISOString(),
      starts_at: new Date(now).toISOString(),
      ends_at: new Date(now + (opts.endsInMs ?? 3 * 86_400_000)).toISOString(),
    })
    .select("id, slug")
    .single()
  if (error) throw error
  return data
}

async function notificationsOf(user: TestUser, type?: string) {
  let q = user.client.from("notifications").select("type, data, link, read_at")
  if (type) q = q.eq("type", type)
  const { data } = await q.order("created_at", { ascending: false })
  return data ?? []
}

/** Buy now → paid → seller hands over with the code → completed. */
async function completedOrder() {
  const a = await activeAuction({ buyNow: 20_000 })
  await buyer.client.rpc("buy_now", { p_auction_id: a.id })
  const { data: order } = await admin().from("orders").select("id").eq("auction_id", a.id).single()
  await admin().rpc("order_mark_paid", {
    p_order_id: order!.id,
    p_session_id: `cs_p7_${order!.id}`,
    p_payment_intent_id: `pi_p7_${order!.id}`,
    p_charge_id: `ch_p7_${order!.id}`,
    p_amount: 20_000,
  })
  const code = (await buyer.client.rpc("get_handover_code", { p_order_id: order!.id })).data!
  await seller.client.rpc("confirm_handover", { p_order_id: order!.id, p_code: code })
  return order!.id
}

beforeAll(async () => {
  ;[seller, buyer, rival, staff] = await Promise.all([
    createTestUser("Vânzător Faza 7"),
    createTestUser("Cumpărător Faza 7"),
    createTestUser("Rival Faza 7"),
    createTestUser("Admin Faza 7"),
  ])
  await connectPayouts(seller)
  await admin().from("profiles").update({ role: "admin" }).eq("id", staff.id)
  const { data } = await anon().from("categories").select("id").eq("slug", "biciclete").single()
  categoryId = data!.id
})

afterAll(async () => {
  await deleteTestUsers([seller, buyer, rival, staff].filter(Boolean))
})

describe("notifications", () => {
  it("tell the previous leader they were outbid", async () => {
    const a = await activeAuction()
    await buyer.client.rpc("place_bid", { p_auction_id: a.id, p_max_amount: 12_000 })
    await rival.client.rpc("place_bid", { p_auction_id: a.id, p_max_amount: 20_000 })
    const [n] = await notificationsOf(buyer, "outbid")
    expect(n).toMatchObject({ link: `/licitatie/${a.id}-${a.slug}` })
    expect(n?.data).toMatchObject({ title: "Lampă de birou vintage", price: 12_500 })
    expect(await notificationsOf(rival, "outbid")).toHaveLength(0)
  })

  it("follow a sale through payment, handover and payout", async () => {
    const id = await completedOrder()
    const link = `/cont/comanda/${id}`
    expect((await notificationsOf(buyer, "auction_won"))[0]).toMatchObject({ link })
    expect((await notificationsOf(seller, "auction_sold"))[0]).toMatchObject({ link })
    expect((await notificationsOf(seller, "order_paid"))[0]?.data).toMatchObject({
      delivery: "pickup",
    })
    expect((await notificationsOf(buyer, "order_completed"))[0]?.data).toMatchObject({
      role: "buyer",
    })
    await admin().rpc("order_mark_released", { p_order_id: id, p_transfer_id: `tr_p7_${id}` })
    expect((await notificationsOf(seller, "payout_sent"))[0]?.data).toMatchObject({
      amount: 19_000,
    })
  })

  it("are private, and only read_at can be changed", async () => {
    expect(
      (await rival.client.from("notifications").select("id").eq("user_id", buyer.id)).data,
    ).toHaveLength(0)
    const forged = await buyer.client
      .from("notifications")
      .update({ type: "payout_sent" })
      .eq("user_id", buyer.id)
    expect(forged.error?.code).toBe("42501")
    expect((await buyer.client.rpc("mark_all_notifications_read")).error).toBeNull()
    expect((await notificationsOf(buyer)).every((n) => n.read_at !== null)).toBe(true)
  })

  it("warn watchers once when an auction ends within the hour", async () => {
    const a = await activeAuction({ endsInMs: 30 * 60_000 })
    await rival.client.from("watchlist").insert({ auction_id: a.id })
    expect((await rival.client.rpc("notify_watch_ending")).error).not.toBeNull()
    await admin().rpc("notify_watch_ending")
    await admin().rpc("notify_watch_ending")
    const ending = (await notificationsOf(rival, "watch_ending")).filter(
      (n) => n.link === `/licitatie/${a.id}-${a.slug}`,
    )
    expect(ending).toHaveLength(1)
  })
})

describe("reviews", () => {
  let orderId: string
  beforeAll(async () => {
    orderId = await completedOrder()
  })

  it("each party rates the other once; ratings update the profile", async () => {
    expect(
      (await rival.client.rpc("leave_review", { p_order_id: orderId, p_rating: 1, p_comment: "" }))
        .error?.message,
    ).toBe("order_not_found")
    expect(
      (await buyer.client.rpc("leave_review", { p_order_id: orderId, p_rating: 6, p_comment: "" }))
        .error?.message,
    ).toBe("review_invalid")
    expect(
      (
        await buyer.client.rpc("leave_review", {
          p_order_id: orderId,
          p_rating: 5,
          p_comment: "Predare rapidă, exact ca în descriere.",
        })
      ).error,
    ).toBeNull()
    expect(
      (await buyer.client.rpc("leave_review", { p_order_id: orderId, p_rating: 4, p_comment: "" }))
        .error?.message,
    ).toBe("review_exists")
    expect(
      (await seller.client.rpc("leave_review", { p_order_id: orderId, p_rating: 4, p_comment: "" }))
        .error,
    ).toBeNull()

    const { data: profile } = await anon()
      .from("profiles")
      .select("rating_avg, rating_count")
      .eq("id", seller.id)
      .single()
    expect(profile).toEqual({ rating_avg: 5, rating_count: 1 })
    const { data: reviews } = await anon()
      .from("reviews")
      .select("rating, reviewer_role")
      .eq("reviewee_id", seller.id)
    expect(reviews).toEqual([{ rating: 5, reviewer_role: "buyer" }])
    expect((await notificationsOf(seller, "review_received"))[0]?.data).toMatchObject({ rating: 5 })
  })

  it("are only for completed orders", async () => {
    const a = await activeAuction({ buyNow: 15_000 })
    await buyer.client.rpc("buy_now", { p_auction_id: a.id })
    const { data: order } = await admin()
      .from("orders")
      .select("id")
      .eq("auction_id", a.id)
      .single()
    expect(
      (
        await buyer.client.rpc("leave_review", {
          p_order_id: order!.id,
          p_rating: 5,
          p_comment: "",
        })
      ).error?.message,
    ).toBe("review_not_allowed")
  })
})

describe("reports and admin tools", () => {
  it("users report a listing once; admins are notified and can see it", async () => {
    const a = await activeAuction()
    const args = {
      p_auction_id: a.id,
      p_user_id: null as unknown as string,
      p_reason: "fake",
      p_details: "Poze de pe internet.",
    }
    expect((await rival.client.rpc("report_content", args)).error).toBeNull()
    expect((await rival.client.rpc("report_content", args)).error?.message).toBe("report_exists")
    expect(
      (await seller.client.rpc("report_content", args)).error?.message,
      "sellers can't report their own listing",
    ).toBe("report_invalid")
    expect(
      (await buyer.client.from("reports").select("id").eq("auction_id", a.id)).data,
    ).toHaveLength(0)
    expect(
      (await staff.client.from("reports").select("id").eq("auction_id", a.id)).data,
    ).toHaveLength(1)
    expect((await notificationsOf(staff, "report_new")).length).toBeGreaterThan(0)
  })

  it("admins hide a listing (stopping it) and the seller is told", async () => {
    const a = await activeAuction()
    expect(
      (await rival.client.rpc("admin_hide_auction", { p_auction_id: a.id, p_reason: "x" })).error
        ?.message,
    ).toBe("not_admin")
    expect(
      (await staff.client.rpc("admin_hide_auction", { p_auction_id: a.id, p_reason: "moderation" }))
        .error,
    ).toBeNull()
    const { data } = await admin()
      .from("auctions")
      .select("status, is_hidden")
      .eq("id", a.id)
      .single()
    expect(data).toEqual({ status: "cancelled", is_hidden: true })
    expect((await anon().from("auctions").select("id").eq("id", a.id)).data).toHaveLength(0)
    expect((await notificationsOf(seller, "listing_hidden")).length).toBeGreaterThan(0)
  })

  it("admins suspend accounts (not other admins); suspension stops their listings", async () => {
    const a = await activeAuction()
    expect(
      (await staff.client.rpc("admin_set_banned", { p_user_id: staff.id, p_banned: true })).error
        ?.message,
    ).toBe("cannot_ban_admin")
    expect(
      (await staff.client.rpc("admin_set_banned", { p_user_id: seller.id, p_banned: true })).error,
    ).toBeNull()
    expect(
      (await admin().from("auctions").select("status").eq("id", a.id).single()).data?.status,
    ).toBe("cancelled")
    expect(
      (await buyer.client.rpc("place_bid", { p_auction_id: a.id, p_max_amount: 50_000 })).error,
    ).not.toBeNull()
    await staff.client.rpc("admin_set_banned", { p_user_id: seller.id, p_banned: false })
    expect(
      (await admin().from("profiles").select("is_banned").eq("id", seller.id).single()).data,
    ).toEqual({ is_banned: false })
  })

  it("admin stats are for admins only", async () => {
    expect((await rival.client.rpc("admin_stats")).error?.message).toBe("not_admin")
    const { data, error } = await staff.client.rpc("admin_stats")
    expect(error).toBeNull()
    expect(data).toMatchObject({ users: expect.any(Number), fees: expect.any(Number) })
  })
})
