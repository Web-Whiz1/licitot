import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { COUNTIES, countyName } from "./counties"
import { formatDate, formatDateTime, formatTimeLeft, timeLeft } from "./dates"
import { formatRoPhone, isRoMobile, normalizeRoPhone, roPhoneSchema } from "./phone"

describe("dates (Europe/Bucharest)", () => {
  it("formats in Romanian regardless of the process timezone (UTC in tests)", () => {
    // 21:30 UTC on 31 Dec is already 1 Jan in Bucharest (UTC+2 in winter).
    expect(formatDate("2026-12-31T22:30:00Z")).toBe("1 ianuarie 2027")
    expect(formatDateTime("2026-07-15T09:05:00Z")).toBe("15 iul. 2026, 12:05") // UTC+3 in summer
  })

  it("computes and labels remaining time", () => {
    const now = "2026-10-12T10:00:00Z"
    expect(formatTimeLeft(timeLeft("2026-10-14T14:00:00Z", now))).toBe("2z 4h")
    expect(formatTimeLeft(timeLeft("2026-10-12T13:12:00Z", now))).toBe("3h 12m")
    expect(formatTimeLeft(timeLeft("2026-10-12T10:04:05Z", now))).toBe("4m 05s")
    expect(formatTimeLeft(timeLeft("2026-10-12T09:00:00Z", now))).toBe("Încheiată")
  })
})

describe("phone (+40)", () => {
  it.each([
    ["0722 123 456", "+40722123456"],
    ["0722-123-456", "+40722123456"],
    ["+40 722 123 456", "+40722123456"],
    ["0040722123456", "+40722123456"],
    ["021 123 4567", "+40211234567"],
    ["(0264) 123 456", "+40264123456"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeRoPhone(input)).toBe(expected)
  })

  it.each(["0722 123 45", "+44 7700 900123", "0822123456", "722123456", "abc"])(
    "rejects %s",
    (input) => {
      expect(normalizeRoPhone(input)).toBeNull()
    },
  )

  it("detects mobiles and formats for display", () => {
    expect(isRoMobile("+40722123456")).toBe(true)
    expect(isRoMobile("+40211234567")).toBe(false)
    expect(formatRoPhone("+40722123456")).toBe("+40 722 123 456")
  })

  it("zod schema transforms to E.164 and reports a dictionary key", () => {
    expect(roPhoneSchema.parse(" 0722 123 456 ")).toBe("+40722123456")
    const result = roPhoneSchema.safeParse("123")
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("validation.phone")
  })
})

describe("counties", () => {
  it("has 41 counties plus București, with unique codes", () => {
    expect(COUNTIES).toHaveLength(42)
    expect(new Set(COUNTIES.map((c) => c.code)).size).toBe(42)
  })
  it("matches the counties seeded by the foundation migration", () => {
    const sql = readFileSync(
      path.resolve(import.meta.dirname, "../../supabase/migrations/20261012120000_foundation.sql"),
      "utf8",
    )
    const seeded = [...sql.matchAll(/\('([A-Z]{1,2})', '([^']+)'\)/g)].map((m) => ({
      code: m[1],
      name: m[2],
    }))
    expect(seeded).toEqual(COUNTIES.map((c) => ({ code: c.code, name: c.name })))
  })

  it("uses comma-below diacritics (ș, ț), never cedilla (ş, ţ)", () => {
    const names = COUNTIES.map((c) => c.name).join("")
    expect(names).not.toMatch(/[şţŞŢ]/)
    expect(countyName("CT")).toBe("Constanța")
  })
})
