import { describe, expect, it } from "vitest"
import { isOwnPath } from "@/lib/imagekit"
import { draftToForm, emptyAuctionForm } from "./form-defaults"
import { estimatePayout, suggestIncrement } from "./pricing"
import { auctionFormSchema, type AuctionFormInput } from "./schemas"

const valid: AuctionFormInput = {
  ...emptyAuctionForm({ countyCode: "CJ", city: "Cluj-Napoca" }),
  title: "Bicicletă de oraș Pegas",
  description: "Bicicletă în stare foarte bună, folosită un sezon. Cadru 52 cm.",
  categoryId: "17",
  condition: "ca_nou",
  startingPrice: "450",
  minIncrement: "10",
}

const issue = (input: Partial<AuctionFormInput>) => {
  const r = auctionFormSchema.safeParse({ ...valid, ...input })
  return r.success ? null : r.error.issues.map((i) => `${i.path.join(".")}:${i.message}`)
}

describe("auctionFormSchema", () => {
  it("parses a valid form into bani and numbers", () => {
    const out = auctionFormSchema.parse({ ...valid, buyNowPrice: "1.200,50", reservePrice: "500" })
    expect(out).toMatchObject({
      categoryId: 17,
      startingPrice: 45000,
      minIncrement: 1000,
      reservePrice: 50000,
      buyNowPrice: 120050,
      durationDays: 7,
      courierCost: null,
    })
  })

  it.each([
    [{ startingPrice: "0,50" }, "startingPrice:validation.priceMin"],
    [{ startingPrice: "abc" }, "startingPrice:validation.price"],
    [{ minIncrement: "0" }, "minIncrement:validation.priceMin"],
    [{ reservePrice: "100" }, "reservePrice:validation.reserveBelowStart"],
    [{ buyNowPrice: "450" }, "buyNowPrice:validation.buyNowTooLow"],
    [{ reservePrice: "600", buyNowPrice: "500" }, "buyNowPrice:validation.buyNowTooLow"],
    [{ durationDays: "2" }, "durationDays:validation.duration"],
    [{ shipPickup: false, shipCourier: false }, "shipPickup:validation.shipping"],
    [{ shipCourier: true, courierCost: "" }, "courierCost:validation.courierCost"],
    [{ title: "Bic" }, "title:validation.title"],
    [{ categoryId: "" }, "categoryId:validation.category"],
  ])("rejects %j", (input, expected) => {
    expect(issue(input)).toContain(expected)
  })

  it("accepts free courier shipping (0 RON)", () => {
    expect(issue({ shipCourier: true, courierCost: "0" })).toBeNull()
  })

  it("round-trips a saved draft back into the form", () => {
    const out = auctionFormSchema.parse({ ...valid, buyNowPrice: "1.200,50" })
    const form = draftToForm({
      id: "x",
      title: out.title,
      description: out.description,
      category_id: out.categoryId,
      condition: out.condition,
      starting_price: out.startingPrice,
      min_increment: out.minIncrement,
      reserve_price: out.reservePrice,
      buy_now_price: out.buyNowPrice,
      duration_days: out.durationDays,
      county_code: out.countyCode,
      city: out.city,
      ship_pickup: out.shipPickup,
      ship_courier: out.shipCourier,
      courier_cost: out.courierCost,
      auction_images: [],
    } as unknown as Parameters<typeof draftToForm>[0])
    expect(auctionFormSchema.parse(form)).toEqual(out)
  })
})

describe("pricing", () => {
  it.each([
    [50_00, 5_00],
    [99_99, 5_00],
    [100_00, 10_00],
    [750_00, 20_00],
    [4_999_00, 50_00],
    [15_000_00, 100_00],
    [50_000_00, 250_00],
  ])("suggestIncrement(%i) = %i", (start, inc) => {
    expect(suggestIncrement(start)).toBe(inc)
  })

  it("estimates the payout after the 5% fee", () => {
    expect(estimatePayout(100_000)).toBe(95_000)
  })
})

describe("isOwnPath", () => {
  const uid = "6f1c2a3b-1111-4222-8333-944455556666"
  it("accepts files in the user's own folder only", () => {
    expect(isOwnPath(`/licitot/auctions/${uid}/a.webp`, "auction", uid)).toBe(true)
    expect(isOwnPath(`/licitot/avatars/${uid}/a.webp`, "auction", uid)).toBe(false)
    expect(isOwnPath(`/licitot/auctions/${uid.replace("6", "7")}/a.webp`, "auction", uid)).toBe(
      false,
    )
    expect(isOwnPath(`/licitot/auctions/${uid}/../x/a.webp`, "auction", uid)).toBe(false)
  })
})
