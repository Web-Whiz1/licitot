import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { admin, anon, createTestUser, deleteTestUsers, type TestUser } from "./helpers"

// Romanian full-text search: diacritics-insensitive, stemmed, weighted, live auctions only.

let seller: TestUser
const marker = `zq${crypto.randomUUID().slice(0, 6)}`

beforeAll(async () => {
  seller = await createTestUser("Căutare Test")
  const { data: cat } = await anon().from("categories").select("id").eq("slug", "mobila").single()
  const base = {
    seller_id: seller.id,
    category_id: cat!.id,
    condition: "folosit" as const,
    starting_price: 10_000,
    min_increment: 500,
    duration_days: 7,
    county_code: "IS",
    city: "Iași",
  }
  const { data, error } = await admin()
    .from("auctions")
    .insert([
      {
        ...base,
        title: `Mașină de cusut Singer ${marker}`,
        description: "Funcționează perfect, cu pedală.",
      },
      {
        ...base,
        title: `Dulap din lemn ${marker}`,
        description: "Ușile se închid greu, dar mașina de spălat încape alături.",
      },
      {
        ...base,
        title: `Ciornă ascunsă ${marker}`,
        description: "Această ciornă nu trebuie să apară în căutări.",
      },
    ])
    .select("id, title")
  if (error) throw error
  const ends = new Date(Date.now() + 86_400_000).toISOString()
  for (const row of data.filter((r) => !r.title.startsWith("Ciornă"))) {
    await admin()
      .from("auctions")
      .update({ status: "active", starts_at: new Date().toISOString(), ends_at: ends })
      .eq("id", row.id)
  }
})

afterAll(async () => {
  if (seller) await deleteTestUsers([seller])
})

const search = (q: string) =>
  anon()
    .from("auctions")
    .select("title")
    .textSearch("search_tsv", `${q} ${marker}`, { config: "ro_unaccent", type: "websearch" })
    .eq("status", "active")

describe("search (ro_unaccent)", () => {
  it("matches without diacritics", async () => {
    const { data } = await search("masina")
    expect(data?.map((d) => d.title)).toEqual(
      expect.arrayContaining([`Mașină de cusut Singer ${marker}`, `Dulap din lemn ${marker}`]),
    )
  })

  it("matches Romanian inflections via stemming", async () => {
    const { data } = await search("masini")
    expect(data?.length).toBeGreaterThanOrEqual(1)
  })

  it("matches the city field", async () => {
    const { data } = await search("iasi")
    expect(data).toHaveLength(2)
  })

  it("never returns drafts", async () => {
    const { data } = await search("ciorna")
    expect(data).toHaveLength(0)
  })
})
