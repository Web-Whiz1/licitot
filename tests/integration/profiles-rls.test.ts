import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { admin, anon, createTestUser, deleteTestUsers, type TestUser } from "./helpers"

let alice: TestUser
let bob: TestUser

beforeAll(async () => {
  alice = await createTestUser("Alice Ionescu")
  bob = await createTestUser("Bob Ștefănescu")
})

afterAll(async () => {
  await deleteTestUsers([alice, bob].filter(Boolean))
})

describe("signup trigger", () => {
  it("creates a public profile with a unique ASCII username", async () => {
    const { data } = await admin().from("profiles").select("*").eq("id", bob.id).single()
    expect(data?.display_name).toBe("Bob Ștefănescu")
    expect(data?.username).toMatch(/^bobstefanescu(\d{4})?$/)
    expect(data?.role).toBe("user")
  })

  it("creates an empty private profile", async () => {
    const { data } = await admin().from("profiles_private").select("*").eq("id", alice.id).single()
    expect(data).toMatchObject({ phone: null, stripe_charges_enabled: false })
  })
})

describe("profiles RLS", () => {
  it("anyone can read public profiles", async () => {
    const { data, error } = await anon().from("profiles").select("username").eq("id", alice.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it("anonymous visitors cannot update profiles", async () => {
    const { data } = await anon()
      .from("profiles")
      .update({ bio: "hacked" })
      .eq("id", alice.id)
      .select()
    expect(data ?? []).toHaveLength(0)
  })

  it("a user can update their own editable fields", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ bio: "Vând viniluri.", city: "Cluj-Napoca", county_code: "CJ" })
      .eq("id", alice.id)
    expect(error).toBeNull()
  })

  it("a user cannot update someone else's profile", async () => {
    const { data } = await alice.client
      .from("profiles")
      .update({ bio: "hacked" })
      .eq("id", bob.id)
      .select()
    expect(data ?? []).toHaveLength(0)
    const { data: bobRow } = await admin().from("profiles").select("bio").eq("id", bob.id).single()
    expect(bobRow?.bio).toBeNull()
  })

  it.each([
    ["role", { role: "admin" as const }],
    ["is_banned", { is_banned: true }],
    ["rating_avg", { rating_avg: 5 }],
  ])("a user cannot change protected column %s", async (_, patch) => {
    const { error } = await alice.client.from("profiles").update(patch).eq("id", alice.id)
    expect(error?.code).toBe("42501") // insufficient_privilege (column grant)
  })

  it("rejects invalid usernames at the database level", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ username: "Not Valid!" })
      .eq("id", alice.id)
    expect(error?.code).toBe("23514") // check_violation
  })

  it("rejects duplicate usernames", async () => {
    const { data: bobRow } = await admin()
      .from("profiles")
      .select("username")
      .eq("id", bob.id)
      .single()
    const { error } = await alice.client
      .from("profiles")
      .update({ username: bobRow!.username })
      .eq("id", alice.id)
    expect(error?.code).toBe("23505") // unique_violation
  })

  it("users cannot insert or delete profiles directly", async () => {
    const ins = await alice.client
      .from("profiles")
      .insert({ id: crypto.randomUUID(), username: "intrus", display_name: "Intrus" })
    expect(ins.error?.code).toBe("42501")
    const del = await alice.client.from("profiles").delete().eq("id", alice.id).select()
    expect(del.error?.code ?? (del.data?.length === 0 ? "none" : "deleted")).not.toBe("deleted")
  })
})

describe("profiles_private RLS", () => {
  it("is invisible to anonymous visitors", async () => {
    const { data } = await anon().from("profiles_private").select("*")
    expect(data ?? []).toHaveLength(0)
  })

  it("is invisible to other users", async () => {
    const { data } = await bob.client.from("profiles_private").select("*").eq("id", alice.id)
    expect(data ?? []).toHaveLength(0)
  })

  it("owner can set a valid phone, and changing it clears verification", async () => {
    await admin()
      .from("profiles_private")
      .update({ phone: "+40722000001", phone_verified_at: new Date().toISOString() })
      .eq("id", alice.id)
    const { error } = await alice.client
      .from("profiles_private")
      .update({ phone: "+40722000002" })
      .eq("id", alice.id)
    expect(error).toBeNull()
    const { data } = await alice.client
      .from("profiles_private")
      .select("*")
      .eq("id", alice.id)
      .single()
    expect(data).toMatchObject({ phone: "+40722000002", phone_verified_at: null })
  })

  it("rejects non-Romanian phone numbers", async () => {
    const { error } = await alice.client
      .from("profiles_private")
      .update({ phone: "+447700900123" })
      .eq("id", alice.id)
    expect(error?.code).toBe("23514")
  })

  it("owner cannot flip Stripe flags", async () => {
    const { error } = await alice.client
      .from("profiles_private")
      .update({ stripe_charges_enabled: true })
      .eq("id", alice.id)
    expect(error?.code).toBe("42501")
  })
})

describe("reference data and helpers", () => {
  it("exposes 42 counties and the category tree publicly", async () => {
    const counties = await anon().from("counties").select("code")
    expect(counties.data).toHaveLength(42)
    const categories = await anon().from("categories").select("slug, parent_id")
    expect(categories.data?.filter((c) => c.parent_id === null)).toHaveLength(8)
  })

  it("rate_limit_hit is service-role only", async () => {
    const asUser = await alice.client.rpc("rate_limit_hit", {
      p_key: "test",
      p_limit: 1,
      p_window_seconds: 60,
    })
    expect(asUser.error).not.toBeNull()

    const key = `test:${crypto.randomUUID()}`
    const hit = (n: number) =>
      admin().rpc("rate_limit_hit", { p_key: key, p_limit: n, p_window_seconds: 600 })
    expect((await hit(2)).data).toBe(true)
    expect((await hit(2)).data).toBe(true)
    expect((await hit(2)).data).toBe(false)
  })

  it("is_admin() is false for regular users", async () => {
    const { data } = await alice.client.rpc("is_admin")
    expect(data).toBe(false)
  })
})
