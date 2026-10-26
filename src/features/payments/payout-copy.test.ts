import { createTranslator } from "next-intl"
import { describe, expect, it } from "vitest"
import messages from "../../../messages/ro.json"
import { formatRON } from "@/lib/money"

const ron = (bani: number) => formatRON(bani, { compact: true })

describe("payout breakdown copy", () => {
  const t = createTranslator({ locale: "ro", messages, namespace: "payouts" })
  const args = (shipping: number) => ({
    title: "Ceas Poljot",
    item: ron(100_000),
    hasShipping: shipping > 0 ? "yes" : "no",
    shipping: ron(shipping),
    percent: 5,
    fee: ron(5_000),
    payout: ron(100_000 + shipping - 5_000),
  })

  it("lists price, fee and payout for pickup (no shipping line)", () => {
    const text = t("transferDescription", args(0))
    expect(text).toContain("preț 1.000")
    expect(text).toContain("comision LiciTot 5%: −50")
    expect(text).toContain("primești 950")
    expect(text).not.toContain("livrare")
  })

  it("adds the shipping line for courier orders", () => {
    const text = t("transferDescription", args(2_500))
    expect(text).toContain("livrare 25")
    expect(text).toContain("primești 975")
  })

  it("formats the sold-list line", () => {
    const ta = createTranslator({ locale: "ro", messages, namespace: "account.sold" })
    const line = ta("paidOut", { payout: ron(95_000), fee: ron(5_000), percent: 5 })
    expect(line).toMatch(/^Ai primit 950\sRON · comision LiciTot 5%: 50\sRON$/)
  })
})
