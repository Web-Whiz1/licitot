import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { anon, createTestUser, deleteTestUsers, type TestUser } from "./helpers"

let seller: TestUser
let other: TestUser
let categoryId: number

const draft = () => ({
  category_id: categoryId,
  title: "Bicicletă de oraș Pegas",
  description: "Bicicletă în stare foarte bună, folosită un sezon.",
  condition: "ca_nou" as const,
  starting_price: 45_000,
  min_increment: 1_000,
  duration_days: 3,
  county_code: "CJ",
  city: "Cluj-Napoca",
})

const image = (owner: TestUser, n = 1) => ({
  file_id: `file${n}`,
  path: `/licitot/auctions/${owner.id}/${n}.webp`,
  width: 800,
  height: 600,
  blur_data_url: null,
})

async function createDraft(user: TestUser) {
  const { data, error } = await user.client.from("auctions").insert(draft()).select("*").single()
  if (error) throw error
  return data
}

beforeAll(async () => {
  seller = await createTestUser("Vânzător Test")
  other = await createTestUser("Alt Utilizator")
  const { data } = await anon().from("categories").select("id").eq("slug", "biciclete").single()
  categoryId = data!.id
})

afterAll(async () => {
  await deleteTestUsers([seller, other].filter(Boolean))
})

describe("drafts", () => {
  it("are created for the signed-in seller with derived fields", async () => {
    const a = await createDraft(seller)
    expect(a).toMatchObject({
      seller_id: seller.id,
      status: "draft",
      slug: "bicicleta-de-oras-pegas",
      current_price: 45_000,
    })
  })

  it("cannot be created on someone else's behalf (seller_id is not writable)", async () => {
    const { error } = await other.client
      .from("auctions")
      .insert({ ...draft(), seller_id: seller.id })
    expect(error?.code).toBe("42501")
  })

  it("cannot be created as already active", async () => {
    const { error } = await seller.client.from("auctions").insert({ ...draft(), status: "active" })
    expect(error?.code).toBe("42501")
  })

  it("are invisible to visitors and other users", async () => {
    const a = await createDraft(seller)
    expect((await anon().from("auctions").select("id").eq("id", a.id)).data).toHaveLength(0)
    expect((await other.client.from("auctions").select("id").eq("id", a.id)).data).toHaveLength(0)
  })

  it("enforce price rules in the database", async () => {
    const { error } = await seller.client
      .from("auctions")
      .insert({ ...draft(), reserve_price: 10_000 })
    expect(error?.code).toBe("23514")
  })

  it("can't have status or price-in-play changed by the seller", async () => {
    const a = await createDraft(seller)
    const r1 = await seller.client.from("auctions").update({ status: "active" }).eq("id", a.id)
    expect(r1.error?.code).toBe("42501")
    const r2 = await seller.client.from("auctions").update({ current_price: 1 }).eq("id", a.id)
    expect(r2.error?.code).toBe("42501")
  })

  it("can't be edited or deleted by other users", async () => {
    const a = await createDraft(seller)
    const upd = await other.client
      .from("auctions")
      .update({ title: "Furat" })
      .eq("id", a.id)
      .select()
    expect(upd.data ?? []).toHaveLength(0)
    const del = await other.client.from("auctions").delete().eq("id", a.id).select()
    expect(del.data ?? []).toHaveLength(0)
  })
})

describe("images", () => {
  it("only accepts files from the seller's own upload folder", async () => {
    const a = await createDraft(seller)
    const { error } = await seller.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: [image(other)],
    })
    expect(error).not.toBeNull()
  })

  it("replaces images atomically in the given order", async () => {
    const a = await createDraft(seller)
    await seller.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: [image(seller, 1), image(seller, 2)],
    })
    const { error } = await seller.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: [image(seller, 2), image(seller, 1), image(seller, 3)],
    })
    expect(error).toBeNull()
    const { data } = await seller.client
      .from("auction_images")
      .select("file_id, position")
      .eq("auction_id", a.id)
      .order("position")
    expect(data?.map((d) => d.file_id)).toEqual(["file2", "file1", "file3"])
  })

  it("rejects more than 10 photos", async () => {
    const a = await createDraft(seller)
    const { error } = await seller.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: Array.from({ length: 11 }, (_, i) => image(seller, i + 1)),
    })
    expect(error?.message).toBe("too_many_images")
  })

  it("can't be attached to another seller's draft", async () => {
    const a = await createDraft(seller)
    const { error } = await other.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: [image(other)],
    })
    expect(error?.message).toBe("auction_not_editable")
  })
})

describe("publish_auction", () => {
  it("requires at least one photo", async () => {
    const a = await createDraft(seller)
    const { error } = await seller.client.rpc("publish_auction", { p_auction_id: a.id })
    expect(error?.message).toBe("images_required")
  })

  it("only the seller can publish", async () => {
    const a = await createDraft(seller)
    const { error } = await other.client.rpc("publish_auction", { p_auction_id: a.id })
    expect(error?.message).toBe("auction_not_found")
  })

  it("starts the auction, makes it public and locks it", async () => {
    const a = await createDraft(seller)
    await seller.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: [image(seller)],
    })
    const { data, error } = await seller.client.rpc("publish_auction", { p_auction_id: a.id })
    expect(error).toBeNull()
    expect(data).toMatchObject({ status: "active", current_price: 45_000, bid_count: 0 })
    const hours = (Date.parse(data!.ends_at!) - Date.parse(data!.starts_at!)) / 3_600_000
    expect(hours).toBeCloseTo(72, 1)

    // Public now, including its images.
    expect((await anon().from("auctions").select("id").eq("id", a.id)).data).toHaveLength(1)
    expect(
      (await anon().from("auction_images").select("id").eq("auction_id", a.id)).data,
    ).toHaveLength(1)

    // No more edits, deletes, image changes or re-publishing.
    const upd = await seller.client
      .from("auctions")
      .update({ title: "Alt titlu aici" })
      .eq("id", a.id)
      .select()
    expect(upd.data ?? []).toHaveLength(0)
    const del = await seller.client.from("auctions").delete().eq("id", a.id).select()
    expect(del.data ?? []).toHaveLength(0)
    const imgs = await seller.client.rpc("replace_auction_images", {
      p_auction_id: a.id,
      p_images: [],
    })
    expect(imgs.error?.message).toBe("auction_not_editable")
    const again = await seller.client.rpc("publish_auction", { p_auction_id: a.id })
    expect(again.error?.message).toBe("auction_not_draft")
  })

  it("is not callable by anonymous visitors", async () => {
    const a = await createDraft(seller)
    const { error } = await anon().rpc("publish_auction", { p_auction_id: a.id })
    expect(error).not.toBeNull()
  })
})

describe("avatars", () => {
  it("must live in the user's own folder", async () => {
    const bad = await seller.client
      .from("profiles")
      .update({ avatar_path: `/licitot/avatars/${other.id}/a.webp` })
      .eq("id", seller.id)
    expect(bad.error?.code).toBe("23514")
    const ok = await seller.client
      .from("profiles")
      .update({ avatar_path: `/licitot/avatars/${seller.id}/a.webp` })
      .eq("id", seller.id)
    expect(ok.error).toBeNull()
  })
})
