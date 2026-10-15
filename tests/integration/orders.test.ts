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

// Orders: created by sales, delivery choice, payment (service role) and the escrow flow —
// handover codes (pickup), AWB (courier), receipt, disputes, deadlines and refunds.

let seller: TestUser
let buyer: TestUser
let other: TestUser
let staff: TestUser
let categoryId: number

const DAY = 86_400_000

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

/** A sold auction, delivery chosen and paid (as the webhook would do). */
async function paidOrder(delivery: "pickup" | "courier") {
  const order = await soldAuction(delivery === "pickup" ? { courier: false } : { pickup: false })
  const amount = order.item_price + order.shipping_cost
  const { error } = await admin().rpc("order_mark_paid", {
    p_order_id: order.id,
    p_session_id: `cs_test_${order.id}`,
    p_payment_intent_id: `pi_test_${order.id}`,
    p_charge_id: `ch_test_${order.id}`,
    p_amount: amount,
  })
  if (error) throw error
  return order.id
}

async function orderRow(id: string) {
  const { data } = await admin().from("orders").select("*").eq("id", id).single()
  return data!
}

beforeAll(async () => {
  ;[seller, buyer, other, staff] = await Promise.all([
    createTestUser("Vânzător Comenzi"),
    createTestUser("Cumpărător Comenzi"),
    createTestUser("Alt Utilizator"),
    createTestUser("Admin Comenzi"),
  ])
  await connectPayouts(seller)
  await admin().from("profiles_private").update({ phone: "+40721234567" }).eq("id", seller.id)
  await admin().from("profiles").update({ role: "admin" }).eq("id", staff.id)
  const { data } = await anon().from("categories").select("id").eq("slug", "biciclete").single()
  categoryId = data!.id
})

afterAll(async () => {
  await deleteTestUsers([seller, buyer, other, staff].filter(Boolean))
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
      funds_model: "escrow",
    })
    const due = (Date.parse(order.payment_due_at) - Date.now()) / DAY
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

describe("payment", () => {
  it("can't be marked paid before the delivery is chosen", async () => {
    const { id } = await soldAuction()
    const r = await admin().rpc("order_mark_paid", {
      p_order_id: id,
      p_session_id: "cs_test_undecided",
      p_payment_intent_id: "pi_test_undecided",
      p_charge_id: "ch_test_undecided",
      p_amount: 123_450,
    })
    expect(r.error?.code).toBe("23514")
  })

  it("only the service role marks it paid, for the exact amount, once; then escrow starts", async () => {
    const { id } = await soldAuction({ pickup: false })
    const args = {
      p_order_id: id,
      p_session_id: `cs_test_${id}`,
      p_payment_intent_id: `pi_test_${id}`,
      p_charge_id: `ch_test_${id}`,
      p_amount: 125_450,
    }
    expect((await buyer.client.rpc("order_mark_paid", args)).error).not.toBeNull()
    expect((await admin().rpc("order_mark_paid", { ...args, p_amount: 1 })).error?.message).toBe(
      "amount_mismatch",
    )
    expect((await admin().rpc("order_mark_paid", args)).data).toBe(true)
    expect((await admin().rpc("order_mark_paid", args)).data).toBe(false)
    const row = await orderRow(id)
    expect(row).toMatchObject({
      status: "paid",
      stripe_charge_id: `ch_test_${id}`,
      released_at: null,
    })
    expect((Date.parse(row.ship_by!) - Date.now()) / DAY).toBeCloseTo(5, 1)
  })

  it("after payment each party sees the other's contact details", async () => {
    const id = await paidOrder("courier")
    const forBuyer = (await buyer.client.rpc("get_order_contact", { p_order_id: id })).data?.[0]
    expect(forBuyer).toMatchObject({ email: seller.email, phone: "+40721234567" })
    const forSeller = (await seller.client.rpc("get_order_contact", { p_order_id: id })).data?.[0]
    expect(forSeller).toMatchObject({ email: buyer.email, phone: null })
    expect((await other.client.rpc("get_order_contact", { p_order_id: id })).data).toHaveLength(0)
  })
})

describe("pickup with a handover code", () => {
  it("only the buyer sees the code; the right code completes the order and releases the money", async () => {
    const id = await paidOrder("pickup")
    const code = (await buyer.client.rpc("get_handover_code", { p_order_id: id })).data
    expect(code).toMatch(/^\d{6}$/)
    expect((await seller.client.rpc("get_handover_code", { p_order_id: id })).data).toBeNull()

    const wrong = code === "000000" ? "111111" : "000000"
    expect(
      (await seller.client.rpc("confirm_handover", { p_order_id: id, p_code: wrong })).data,
    ).toBe("invalid")
    expect(
      (await buyer.client.rpc("confirm_handover", { p_order_id: id, p_code: code! })).error
        ?.message,
    ).toBe("order_not_found")
    expect(
      (await seller.client.rpc("confirm_handover", { p_order_id: id, p_code: code! })).data,
    ).toBe("ok")
    const row = await orderRow(id)
    expect(row.status).toBe("completed")
    expect(row.handed_over_at).not.toBeNull()
    expect(Date.parse(row.release_at!)).toBeLessThanOrEqual(Date.now() + 5_000)
  })

  it("locks after 5 wrong codes", async () => {
    const id = await paidOrder("pickup")
    const code = (await buyer.client.rpc("get_handover_code", { p_order_id: id })).data!
    const wrong = code === "000000" ? "111111" : "000000"
    for (let i = 0; i < 5; i++) {
      await seller.client.rpc("confirm_handover", { p_order_id: id, p_code: wrong })
    }
    expect(
      (await seller.client.rpc("confirm_handover", { p_order_id: id, p_code: code })).data,
    ).toBe("locked")
  })
})

describe("courier with an AWB", () => {
  let id: string
  beforeAll(async () => {
    id = await paidOrder("courier")
  })

  it("requires a valid AWB and holds the money for the buyer's check window", async () => {
    expect(
      (
        await seller.client.rpc("mark_order_shipped", {
          p_order_id: id,
          p_carrier: "Sameday",
          p_tracking_number: "x",
        })
      ).error?.message,
    ).toBe("tracking_invalid")
    expect(
      (
        await buyer.client.rpc("mark_order_shipped", {
          p_order_id: id,
          p_carrier: "Sameday",
          p_tracking_number: "AWB123456",
        })
      ).error?.message,
    ).toBe("order_not_found")
    const ok = await seller.client.rpc("mark_order_shipped", {
      p_order_id: id,
      p_carrier: "Sameday",
      p_tracking_number: "awb123456",
    })
    expect(ok.error).toBeNull()
    const row = await orderRow(id)
    expect(row).toMatchObject({
      status: "shipped",
      tracking_carrier: "Sameday",
      tracking_number: "AWB123456",
    })
    // New seller (no paid-out sale yet): 5 days + 4 extra.
    expect((Date.parse(row.release_at!) - Date.now()) / DAY).toBeCloseTo(9, 1)
  })

  it("the buyer's confirmation releases the money at once", async () => {
    expect((await buyer.client.rpc("confirm_order_received", { p_order_id: id })).error).toBeNull()
    const row = await orderRow(id)
    expect(row.status).toBe("completed")
    expect(Date.parse(row.release_at!)).toBeLessThanOrEqual(Date.now() + 5_000)
    await admin().rpc("order_mark_released", { p_order_id: id, p_transfer_id: `tr_test_${id}` })
    expect((await orderRow(id)).released_at).not.toBeNull()
  })

  it("an experienced seller's money is held 5 days", async () => {
    const next = await paidOrder("courier")
    await seller.client.rpc("mark_order_shipped", {
      p_order_id: next,
      p_carrier: "FAN Courier",
      p_tracking_number: "2345678901",
    })
    expect((Date.parse((await orderRow(next)).release_at!) - Date.now()) / DAY).toBeCloseTo(5, 1)
  })
})

describe("disputes", () => {
  it("freeze the money until an admin decides; a refund cancels the order", async () => {
    const id = await paidOrder("courier")
    expect(
      (
        await buyer.client.rpc("open_dispute", {
          p_order_id: id,
          p_reason: "not_received",
          p_details: "scurt",
        })
      ).error?.message,
    ).toBe("dispute_invalid")
    expect(
      (
        await buyer.client.rpc("open_dispute", {
          p_order_id: id,
          p_reason: "not_received",
          p_details: "Nu am primit coletul și vânzătorul nu răspunde.",
        })
      ).error,
    ).toBeNull()
    expect((await orderRow(id)).status).toBe("disputed")

    expect(
      (
        await seller.client.rpc("respond_dispute", {
          p_order_id: id,
          p_response: "L-am trimis ieri.",
        })
      ).error,
    ).toBeNull()
    const visible = await seller.client
      .from("order_disputes")
      .select("seller_response")
      .eq("order_id", id)
    expect(visible.data?.[0]?.seller_response).toBe("L-am trimis ieri.")
    expect(
      (await other.client.from("order_disputes").select("order_id").eq("order_id", id)).data,
    ).toHaveLength(0)

    expect(
      (await buyer.client.rpc("admin_resolve_dispute", { p_order_id: id, p_outcome: "refund" }))
        .error?.message,
    ).toBe("not_admin")
    expect(
      (await staff.client.rpc("admin_resolve_dispute", { p_order_id: id, p_outcome: "refund" }))
        .error,
    ).toBeNull()
    expect((await orderRow(id)).status).toBe("cancelled")
    await admin().rpc("order_mark_refunded", { p_order_id: id, p_refund_id: `re_test_${id}` })
    expect((await orderRow(id)).refunded_at).not.toBeNull()
  })

  it("can't be opened after the money was released", async () => {
    const id = await paidOrder("courier")
    await buyer.client.rpc("confirm_order_received", { p_order_id: id })
    const r = await buyer.client.rpc("open_dispute", {
      p_order_id: id,
      p_reason: "other",
      p_details: "M-am răzgândit după ce am confirmat.",
    })
    expect(r.error?.message).toBe("dispute_not_allowed")
  })
})

describe("deadlines", () => {
  it("the buyer cancels for a refund only after the seller missed the 5-day deadline", async () => {
    const id = await paidOrder("pickup")
    expect((await buyer.client.rpc("cancel_late_order", { p_order_id: id })).error?.message).toBe(
      "deadline_not_passed",
    )
    await admin()
      .from("orders")
      .update({ ship_by: new Date(Date.now() - 1_000).toISOString() })
      .eq("id", id)
    expect((await buyer.client.rpc("cancel_late_order", { p_order_id: id })).error).toBeNull()
    expect((await orderRow(id)).status).toBe("cancelled")
  })

  it("advance_orders completes expired shipping windows and cancels abandoned orders", async () => {
    const shipped = await paidOrder("courier")
    await seller.client.rpc("mark_order_shipped", {
      p_order_id: shipped,
      p_carrier: "Cargus",
      p_tracking_number: "9876543210",
    })
    const abandoned = await paidOrder("pickup")
    await admin()
      .from("orders")
      .update({ release_at: new Date(Date.now() - 1_000).toISOString() })
      .eq("id", shipped)
    await admin()
      .from("orders")
      .update({ ship_by: new Date(Date.now() - 6 * DAY).toISOString() })
      .eq("id", abandoned)
    expect((await buyer.client.rpc("advance_orders")).error).not.toBeNull()
    expect((await admin().rpc("advance_orders")).error).toBeNull()
    expect((await orderRow(shipped)).status).toBe("completed")
    expect((await orderRow(abandoned)).status).toBe("cancelled")
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
  })

  it("connected-account status changes only server-side", async () => {
    const forged = await other.client
      .from("profiles_private")
      .update({ stripe_charges_enabled: true })
      .eq("id", other.id)
    expect(forged.error?.code).toBe("42501")
    await admin().rpc("set_stripe_account", { p_user_id: other.id, p_account_id: "acct_test_x1" })
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
