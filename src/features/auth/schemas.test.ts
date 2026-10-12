import { describe, expect, it } from "vitest"
import { profileSchema } from "@/features/profiles/schemas"
import { safeNextPath } from "@/lib/site"
import { newPasswordSchema, signUpSchema } from "./schemas"

describe("signUpSchema", () => {
  const valid = {
    displayName: "Ana Pop",
    email: " Ana@Example.RO ",
    password: "parola123",
    acceptTerms: true,
  }

  it("normalizes email and accepts a valid signup", () => {
    expect(signUpSchema.parse(valid).email).toBe("ana@example.ro")
  })

  it.each([
    ["short password", { password: "abc1" }, "validation.passwordMin"],
    ["no digit", { password: "doarlitere" }, "validation.passwordWeak"],
    ["no letter", { password: "12345678" }, "validation.passwordWeak"],
    ["terms not accepted", { acceptTerms: false }, "validation.terms"],
    ["bad email", { email: "nu-e-email" }, "validation.email"],
  ])("rejects %s with a dictionary key", (_, patch, key) => {
    const result = signUpSchema.safeParse({ ...valid, ...patch })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(key)
  })
})

describe("newPasswordSchema", () => {
  it("requires matching confirmation", () => {
    const result = newPasswordSchema.safeParse({ password: "parola123", confirm: "parola124" })
    expect(result.error?.issues[0]?.path).toEqual(["confirm"])
  })
})

describe("profileSchema", () => {
  const base = {
    username: "ana-pop",
    displayName: "Ana",
    countyCode: "",
    city: "",
    bio: "",
    phone: "",
  }

  it("turns empty optional fields into null and normalizes the phone", () => {
    const parsed = profileSchema.parse({ ...base, countyCode: "CJ", phone: "0722 123 456" })
    expect(parsed).toMatchObject({ countyCode: "CJ", city: null, bio: null, phone: "+40722123456" })
  })

  it.each(["ab", "-ana", "ana-", "Ana Pop", "ana.pop", "a".repeat(31)])(
    "rejects username %j",
    (username) => {
      expect(profileSchema.safeParse({ ...base, username }).success).toBe(false)
    },
  )

  it("lowercases usernames", () => {
    expect(profileSchema.parse({ ...base, username: "AnaPop" }).username).toBe("anapop")
  })

  it("rejects unknown counties", () => {
    expect(profileSchema.safeParse({ ...base, countyCode: "XX" }).success).toBe(false)
  })
})

describe("safeNextPath", () => {
  it.each([
    ["/cont/setari", "/cont/setari"],
    ["//evil.com", "/cont"],
    ["/\\evil.com", "/cont"],
    ["https://evil.com", "/cont"],
    [null, "/cont"],
  ])("%j → %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })
})
