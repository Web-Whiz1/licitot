import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { calcPlatformFee } from "@/lib/money"
import {
  admin,
  anon,
  connectPayouts,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers"

// Phase 6: orders created by sales, delivery choice, payment (service role), shipping,
// receipt, cancelling unpaid orders, contact details and webhook idempotency.

let seller: TestUser
let buyer: TestUser
let other: TestUser
let categoryId: number

async function soldAuction(opts: { pickup?: boolean; courier?: boolean; price?: number } = {}) {
  const now = Date.now()
  const price = opts.price ?? 123_450
  const { data, error } = await admin()
    .from("auctions")
    .insert({
      seller_id: seller.id,
      category_id: categoryId,
      title: "Ceas de mână Casio pentru test",
      description: "Ceas folosit pentru testele automate de comenzi.",
      condition: "folosit",
      starting_price: 50_000,
      current_price: 50_000,
      min_increment: 1_000,
      buy_now_price: price,
      duration_days: 3,
      county_code: "CJ",
      city: "Cluj-Napoca",
      ship_pickup: opts.pickup ?? true,
      ship_courier: opts.courier ?? true,
      courier_cost: (opts.courier ?? true) ? 2_000 : null,
      status: "active",
      published_at: new Date(now).toISOString(),
      starts_at: new Date(now).toISOString(),
      ends_at: new Date(now + 3_600_000).toISOString(),
    })
    .select("id")
    .single()
  if (error) throw error
  const bought = await buyer.client.rpc("buy_now", { p_auction_id: data.id })
  if (bought.error) throw bought.error
  const { data: order } = await admin()
    .from("orders")
    .select("*")
    .eq("auction_id", data.id)
    .single()
  return order!
}

beforeAll(async () => {
  ;[seller, buyer, other] = await Promise.all([
    createTestUser("Vânzător Comenzi"),
    createTestUser("Cumpărător Comenzi"),
    createTestUser("Alt Utilizator"),
  ])
  await connectPayouts(seller)
  await admin().from("profiles_private").update({ phone: "+40721234567" }).eq("id", seller.id)
  const { data } = await anon().from("categories").select("id").eq("slug", "biciclete").single()
  categoryId = data!.id
})

afterAll(async () => {
  await deleteTestUsers([seller, buyer, other].filter(Boolean))
})

describe("orders", () => {
  it("are created when an auction sells, with the 5% fee", async () => {
    const order = await soldAuction()
    expect(order).toMatchObject({
      buyer_id: buyer.id,
      seller_id: seller.id,
      item_price: 123_450,
      platform_fee: calcPlatformFee(123_450),
      status: "pending_payment",
      delivery_method: null,
      shipping_cost: 0,
    })
    const due = (Date.parse(order.payment_due_at) - Date.now()) / 86_400_000
    expect(due).toBeCloseTo(3, 1)
  })

  it("preselect delivery when the auction offers only one option", async () => {
    const pickup = await soldAuction({ courier: false })
    expect(pickup).toMatchObject({ delivery_method: "pickup", shipping_cost: 0 })
    const courier = await soldAuction({ pickup: false })
    expect(courier).toMatchObject({ delivery_method: "courier", shipping_cost: 2_000 })
  })

  it("are visible only to the buyer and the seller, and never writable by them", async () => {
    const order = await soldAuction()
    expect((await buyer.client.from("orders").select("id").eq("id", order.id)).data).toHaveLength(1)
    expect((await seller.client.from("orders").select("id").eq("id", order.id)).data).toHaveLength(
      1,
    )
    expect((await other.client.from("orders").select("id").eq("id", order.id)).data).toHaveLength(0)
    expect((await anon().from("orders").select("id").eq("id", order.id)).data ?? []).toHaveLength(0)
    const forged = await buyer.client.from("orders").update({ status: "paid" }).eq("id", order.id)
    expect(forged.error?.code).toBe("42501")
  })
})

describe("order lifecycle", () => {
  let id: string
  beforeAll(async () => {
    id = (await soldAuction()).id
  })

  it("the buyer chooses delivery; the courier cost is added to the total", async () => {
    expect(
      (await other.client.rpc("choose_delivery", { p_order_id: id, p_method: "courier" })).error
        ?.message,
    ).toBe("order_not_found")
    const { data, error } = await buyer.client.rpc("choose_delivery", {
      p_order_id: id,
      p_method: "courier",
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({ shipping_cost: 2_000, total: 125_450 })
  })

  it("hides contact details and blocks shipping before payment", async () => {
    expect((await buyer.client.rpc("get_order_contact", { p_order_id: id })).data).toHaveLength(0)
    expect((await seller.client.rpc("mark_order_shipped", { p_order_id: id })).error?.message).toBe(
      "order_not_paid",
    )
  })

  it("can't be marked paid before the delivery is chosen", async () => {
    const { id: undecided } = await soldAuction()
    const r = await admin().rpc("order_mark_paid", {
      p_order_id: undecided,
      p_session_id: "cs_test_undecided",
      p_payment_intent_id: "pi_test_undecided",
      p_amount: 123_450,
    })
    expect(r.error?.code).toBe("23514")
  })

  it("only the service role marks it paid, for the exact amount, once", async () => {
    const args = {
      p_order_id: id,
      p_session_id: "cs_test_lifecycle",
      p_payment_intent_id: "pi_test_lifecycle",
      p_amount: 125_450,
    }
    expect((await buyer.client.rpc("order_mark_paid", args)).error).not.toBeNull()
    expect((await admin().rpc("order_mark_paid", { ...args, p_amount: 1 })).error?.message).toBe(
      "amount_mismatch",
    )
    expect((await admin().rpc("order_mark_paid", args)).data).toBe(true)
    expect((await admin().rpc("order_mark_paid", args)).data).toBe(false)
  })

  it("after payment each party sees the other's contact details", async () => {
    const forBuyer = (await buyer.client.rpc("get_order_contact", { p_order_id: id })).data?.[0]
    expect(forBuyer).toMatchObject({ email: seller.email, phone: "+40721234567" })
    const forSeller = (await seller.client.rpc("get_order_contact", { p_order_id: id })).data?.[0]
    expect(forSeller).toMatchObject({ email: buyer.email, phone: null })
    expect((await other.client.rpc("get_order_contact", { p_order_id: id })).data).toHaveLength(0)
  })

  it("the seller ships, the buyer confirms receipt", async () => {
    expect((await buyer.client.rpc("mark_order_shipped", { p_order_id: id })).error?.message).toBe(
      "order_not_found",
    )
    expect((await seller.client.rpc("mark_order_shipped", { p_order_id: id })).error).toBeNull()
    expect((await buyer.client.rpc("confirm_order_received", { p_order_id: id })).error).toBeNull()
    const { data } = await buyer.client.from("orders").select("status").eq("id", id).single()
    expect(data?.status).toBe("completed")
  })
})

describe("unpaid orders", () => {
  it("can be cancelled by the seller only after the payment deadline", async () => {
    const { id } = await soldAuction()
    expect(
      (await seller.client.rpc("cancel_unpaid_order", { p_order_id: id })).error?.message,
    ).toBe("payment_not_overdue")
    await admin()
      .from("orders")
      .update({ payment_due_at: new Date(Date.now() - 1_000).toISOString() })
      .eq("id", id)
    expect((await buyer.client.rpc("cancel_unpaid_order", { p_order_id: id })).error?.message).toBe(
      "order_not_found",
    )
    expect((await seller.client.rpc("cancel_unpaid_order", { p_order_id: id })).error).toBeNull()
    // A late payment can no longer be applied.
    const late = await admin().rpc("order_mark_paid", {
      p_order_id: id,
      p_session_id: "cs_test_late",
      p_payment_intent_id: "pi_test_late",
      p_amount: 123_450,
    })
    expect(late.error?.message).toBe("order_not_pending")
  })
})

describe("Stripe helpers", () => {
  it("webhook events are processed once and only by the service role", async () => {
    const id = `evt_test_${crypto.randomUUID()}`
    expect(
      (await buyer.client.rpc("stripe_event_once", { p_event_id: id, p_type: "x" })).error,
    ).not.toBeNull()
    expect((await admin().rpc("stripe_event_once", { p_event_id: id, p_type: "x" })).data).toBe(
      true,
    )
    expect((await admin().rpc("stripe_event_once", { p_event_id: id, p_type: "x" })).data).toBe(
      false,
    )
    await admin().rpc("stripe_event_release", { p_event_id: id })
    expect((await admin().rpc("stripe_event_once", { p_event_id: id, p_type: "x" })).data).toBe(
      true,
    )
    await admin().rpc("stripe_event_release", { p_event_id: id })
  })

  it("connected-account status changes only server-side", async () => {
    const forged = await other.client
      .from("profiles_private")
      .update({ stripe_charges_enabled: true })
      .eq("id", other.id)
    expect(forged.error?.code).toBe("42501")
    await admin().rpc("set_stripe_account", { p_user_id: other.id, p_account_id: "acct_test_x1" })
    // The first account id sticks.
    const again = await admin().rpc("set_stripe_account", {
      p_user_id: other.id,
      p_account_id: "acct_test_x2",
    })
    expect(again.data).toBe("acct_test_x1")
    await admin().rpc("sync_stripe_account", {
      p_account_id: "acct_test_x1",
      p_details_submitted: true,
      p_charges_enabled: true,
      p_payouts_enabled: false,
    })
    const { data } = await other.client
      .from("profiles_private")
      .select("stripe_charges_enabled, stripe_payouts_enabled")
      .single()
    expect(data).toEqual({ stripe_charges_enabled: true, stripe_payouts_enabled: false })
  })
})
