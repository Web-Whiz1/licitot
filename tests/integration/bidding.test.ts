import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { admin, anon, createTestUser, deleteTestUsers, type TestUser } from "./helpers"

// Phase 5: proxy bidding, anti-sniping, reserve, buy now, cancel, closing job, watchlist.
// Amounts are bani: 45_000 = 450 RON.

let seller: TestUser
let alice: TestUser
let bob: TestUser
let carol: TestUser
let categoryId: number

async function createActive(
  extra: Partial<{
    reserve_price: number
    buy_now_price: number
    ends_in_ms: number
  }> = {},
) {
  const now = Date.now()
  const { data, error } = await admin()
    .from("auctions")
    .insert({
      seller_id: seller.id,
      category_id: categoryId,
      title: "Chitară electrică de test",
      description: "Chitară folosită pentru testele automate de licitare.",
      condition: "folosit",
      starting_price: 45_000,
      min_increment: 1_000,
      reserve_price: extra.reserve_price ?? null,
      buy_now_price: extra.buy_now_price ?? null,
      duration_days: 1,
      county_code: "CJ",
      city: "Cluj-Napoca",
      status: "active",
      published_at: new Date(now).toISOString(),
      starts_at: new Date(now).toISOString(),
      ends_at: new Date(now + (extra.ends_in_ms ?? 3_600_000)).toISOString(),
      current_price: 45_000,
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

const bid = (u: TestUser, id: string, max: number) =>
  u.client.rpc("place_bid", { p_auction_id: id, p_max_amount: max })

async function state(id: string) {
  const { data } = await admin()
    .from("auctions")
    .select("current_price, bid_count, high_bidder_id, ends_at, status, winner_id, final_price")
    .eq("id", id)
    .single()
  return data!
}

beforeAll(async () => {
  ;[seller, alice, bob, carol] = await Promise.all([
    createTestUser("Vânzător Licitații"),
    createTestUser("Alice Ionescu"),
    createTestUser("Bogdan Pop"),
    createTestUser("Carmen Dima"),
  ])
  const { data } = await anon().from("categories").select("id").eq("slug", "biciclete").single()
  categoryId = data!.id
})

afterAll(async () => {
  await deleteTestUsers([seller, alice, bob, carol].filter(Boolean))
})

describe("place_bid (proxy bidding)", () => {
  let id: string
  beforeAll(async () => {
    id = await createActive()
  })

  it("rejects the seller and anonymous users", async () => {
    expect((await bid(seller, id, 50_000)).error?.message).toBe("own_auction")
    const { error } = await anon().rpc("place_bid", { p_auction_id: id, p_max_amount: 50_000 })
    expect(error).not.toBeNull()
  })

  it("first bid opens at the starting price, whatever the maximum", async () => {
    const r = await bid(alice, id, 60_000)
    expect(r.error).toBeNull()
    expect(r.data).toMatchObject({ leading: true, current_price: 45_000, bid_count: 1 })
  })

  it("a lower maximum is answered by the leader's proxy", async () => {
    const r = await bid(bob, id, 50_000)
    expect(r.data).toMatchObject({ leading: false, current_price: 51_000, bid_count: 3 })
    expect((await state(id)).high_bidder_id).toBe(alice.id)
  })

  it("a higher maximum takes the lead one increment above the old maximum", async () => {
    const r = await bid(bob, id, 70_000)
    expect(r.data).toMatchObject({ leading: true, current_price: 61_000 })
    expect((await state(id)).high_bidder_id).toBe(bob.id)
  })

  it("rejects bids under the minimum and lower maximums from the leader", async () => {
    expect((await bid(alice, id, 61_500)).error?.message).toBe("bid_too_low")
    expect((await bid(bob, id, 65_000)).error?.message).toBe("max_not_higher")
  })

  it("the leader can raise the maximum without moving the price", async () => {
    const r = await bid(bob, id, 80_000)
    expect(r.data).toMatchObject({ leading: true, current_price: 61_000 })
  })

  it("on equal maximums the earlier bidder keeps the lead", async () => {
    const r = await bid(carol, id, 80_000)
    expect(r.data).toMatchObject({ leading: false, current_price: 80_000 })
    expect((await state(id)).high_bidder_id).toBe(bob.id)
  })

  it("keeps maximums secret and masks names in the public history", async () => {
    const own = await alice.client.from("auto_bids").select("bidder_id, max_amount")
    expect(own.data?.every((r) => r.bidder_id === alice.id)).toBe(true)
    expect((await anon().from("auto_bids").select("*")).data ?? []).toHaveLength(0)
    expect((await anon().from("bids").select("*")).data ?? []).toHaveLength(0)

    const { data: history } = await alice.client.rpc("get_auction_bids", { p_auction_id: id })
    expect(history?.[0]).toMatchObject({ amount: 80_000, bidder: "B***p", is_mine: false })
    expect(history?.some((b) => b.is_mine && b.bidder === "A***u")).toBe(true)
  })
})

describe("reserve price", () => {
  it("is hidden from the public, but they see whether it is met", async () => {
    const id = await createActive({ reserve_price: 100_000 })
    const secret = await anon().from("auctions").select("reserve_price").eq("id", id)
    expect(secret.error?.code).toBe("42501")
    const sellerView = await seller.client.rpc("get_auction_reserve", { p_auction_id: id })
    expect(sellerView.data).toBe(100_000)
    const otherView = await alice.client.rpc("get_auction_reserve", { p_auction_id: id })
    expect(otherView.data).toBeNull()

    // A maximum above the reserve jumps the price straight to the reserve.
    await bid(alice, id, 120_000)
    const { data } = await anon()
      .from("auctions")
      .select("current_price, has_reserve, reserve_met")
      .eq("id", id)
      .single()
    expect(data).toEqual({ current_price: 100_000, has_reserve: true, reserve_met: true })
  })
})

describe("anti-sniping", () => {
  it("a bid in the last 2 minutes extends the end to 2 minutes from now", async () => {
    const id = await createActive({ ends_in_ms: 60_000 })
    const before = Date.now()
    const r = await bid(alice, id, 50_000)
    expect(r.data).toMatchObject({ extended: true })
    const ends = new Date((await state(id)).ends_at!).getTime()
    expect(ends - before).toBeGreaterThan(110_000)
  })
})

describe("buy now and cancel", () => {
  it("buy now ends the auction for the buyer while there are no bids", async () => {
    const id = await createActive({ buy_now_price: 90_000 })
    expect((await seller.client.rpc("buy_now", { p_auction_id: id })).error?.message).toBe(
      "own_auction",
    )
    expect((await alice.client.rpc("buy_now", { p_auction_id: id })).error).toBeNull()
    expect(await state(id)).toMatchObject({
      status: "ended_sold",
      winner_id: alice.id,
      final_price: 90_000,
    })
    expect((await bid(bob, id, 95_000)).error?.message).toBe("auction_ended")
  })

  it("buy now disappears after the first bid", async () => {
    const id = await createActive({ buy_now_price: 90_000 })
    await bid(bob, id, 50_000)
    expect((await alice.client.rpc("buy_now", { p_auction_id: id })).error?.message).toBe(
      "buy_now_unavailable",
    )
  })

  it("sellers cancel only before the first bid, and only their own auctions", async () => {
    const a = await createActive()
    expect((await alice.client.rpc("cancel_auction", { p_auction_id: a })).error?.message).toBe(
      "auction_not_found",
    )
    expect((await seller.client.rpc("cancel_auction", { p_auction_id: a })).error).toBeNull()
    expect((await state(a)).status).toBe("cancelled")

    const b = await createActive()
    await bid(alice, b, 50_000)
    expect((await seller.client.rpc("cancel_auction", { p_auction_id: b })).error?.message).toBe(
      "has_bids",
    )
  })
})

describe("closing job (pg_cron, every minute)", () => {
  it(
    "closes ended auctions: sold to the leader, or unsold below the reserve",
    { timeout: 90_000 },
    async () => {
      const sold = await createActive({ ends_in_ms: 125_000 })
      const unsold = await createActive({ reserve_price: 200_000, ends_in_ms: 125_000 })
      await bid(alice, sold, 50_000)
      await bid(bob, unsold, 50_000)
      // Move both ends into the past (bids just pushed them out by anti-sniping).
      const moved = await admin()
        .from("auctions")
        .update({
          starts_at: new Date(Date.now() - 120_000).toISOString(),
          ends_at: new Date(Date.now() - 60_000).toISOString(),
        })
        .in("id", [sold, unsold])
      expect(moved.error).toBeNull()

      const deadline = Date.now() + 80_000
      while (Date.now() < deadline && (await state(sold)).status === "active") {
        await new Promise((r) => setTimeout(r, 3_000))
      }
      expect(await state(sold)).toMatchObject({
        status: "ended_sold",
        winner_id: alice.id,
        final_price: 45_000,
      })
      expect(await state(unsold)).toMatchObject({
        status: "ended_unsold",
        winner_id: null,
        final_price: null,
      })
    },
  )
})

describe("watchlist", () => {
  it("is private to each user", async () => {
    const id = await createActive()
    expect((await alice.client.from("watchlist").insert({ auction_id: id })).error).toBeNull()
    expect((await alice.client.from("watchlist").select("auction_id")).data).toHaveLength(1)
    expect((await bob.client.from("watchlist").select("auction_id")).data).toHaveLength(0)
    const forged = await bob.client.from("watchlist").insert({ auction_id: id, user_id: alice.id })
    expect(forged.error).not.toBeNull()
  })
})
