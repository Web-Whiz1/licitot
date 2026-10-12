import { describe, expect, it } from "vitest"
import { calcPlatformFee, calcSellerPayout, formatRON, parseRONToBani } from "./money"

// Intl output uses non-breaking spaces; normalize for readable assertions.
const plain = (s: string) => s.replace(/[  ]/g, " ")

describe("formatRON", () => {
  it("formats bani in ro-RO style", () => {
    expect(plain(formatRON(123456))).toBe("1.234,56 RON")
    expect(plain(formatRON(5))).toBe("0,05 RON")
    expect(plain(formatRON(0))).toBe("0,00 RON")
  })
  it("drops decimals for whole amounts in compact mode", () => {
    expect(plain(formatRON(150000, { compact: true }))).toBe("1.500 RON")
    expect(plain(formatRON(150050, { compact: true }))).toBe("1.500,50 RON")
  })
  it("rejects non-integer amounts", () => {
    expect(() => formatRON(10.5)).toThrow(RangeError)
  })
})

describe("parseRONToBani", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12.50", 1250],
    ["1.234", 123400],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["1.234.567", 123456700],
    ["1 234,5 lei", 123450],
    ["99 RON", 9900],
    ["0,01", 1],
    // Three digits after a lone separator can only be thousands (amounts have ≤2 decimals).
    ["12,999", 1299900],
  ])("%s → %i", (input, expected) => {
    expect(parseRONToBani(input)).toBe(expected)
  })

  it.each(["", "abc", "-5", "1,234,5", "12,345,", "1.2.3,4,5", "1,5,0"])("rejects %j", (input) => {
    expect(parseRONToBani(input)).toBeNull()
  })
})

describe("calcPlatformFee (5%)", () => {
  it.each([
    [0, 0],
    [100, 5],
    [10_000, 500],
    [12_345, 617], // 617.25 → 617
    [12_350, 618], // 617.5 → 618 (half-up)
    [9, 0], // 0.45 → 0
    [10, 1], // 0.5 → 1
  ])("fee(%i) = %i", (amount, fee) => {
    expect(calcPlatformFee(amount)).toBe(fee)
  })

  it("payout + fee always equals the hammer price", () => {
    for (const amount of [1, 99, 12_345, 1_000_001, 987_654_321]) {
      expect(calcSellerPayout(amount) + calcPlatformFee(amount)).toBe(amount)
    }
  })

  it("rejects negative or fractional amounts", () => {
    expect(() => calcPlatformFee(-1)).toThrow(RangeError)
    expect(() => calcPlatformFee(1.5)).toThrow(RangeError)
  })
})
