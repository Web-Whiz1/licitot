import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  anon,
  connectPayouts,
  createTestUser,
  deleteTestUsers,
  hashImages,
  randomPhash,
  type TestUser,
} from "./helpers"

// Anti-fraud on listings: photos must be fingerprinted, photos reused from another seller's
// listing are refused, and new sellers can have at most 3 active auctions.

let alice: TestUser
let bob: TestUser
let categoryId: number

/** Creates a draft with one photo and the given fingerprint, then tries to publish it. */
async function publishWithPhoto(user: TestUser, phash: string | null) {
  const { data: draft, error } = await user.client
    .from("auctions")
    .insert({
      category_id: categoryId,
      title: "Rucsac de drumeție 40 de litri",
      description: "Rucsac folosit de câteva ori, fără defecte, cu husă de ploaie.",
      condition: "ca_nou",
      starting_price: 20_000,
      min_increment: 1_000,
      duration_days: 3,
      county_code: "CJ",
      city: "Cluj-Napoca",
    })
    .select("id")
    .single()
  if (error) throw error
  const fileId = `file_${crypto.randomUUID().slice(0, 8)}`
  await user.client.rpc("replace_auction_images", {
    p_auction_id: draft.id,
    p_images: [
      {
        file_id: fileId,
        path: `/licitot/auctions/${user.id}/${fileId}.webp`,
        width: 800,
        height: 600,
        blur_data_url: null,
      },
    ],
  })
  if (phash) await hashImages(draft.id, [{ file_id: fileId, phash }])
  return user.client.rpc("publish_auction", { p_auction_id: draft.id })
}

/** Flips a few bits of a hex hash (a re-compressed copy of the same photo). */
const nearby = (hash: string) =>
  hash.slice(0, 15) + ((parseInt(hash.slice(15), 16) ^ 0b11) & 0xf).toString(16)

beforeAll(async () => {
  ;[alice, bob] = await Promise.all([
    createTestUser("Alice Siguranță"),
    createTestUser("Bogdan Siguranță"),
  ])
  await Promise.all([connectPayouts(alice), connectPayouts(bob)])
  const { data } = await anon().from("categories").select("id").eq("slug", "biciclete").single()
  categoryId = data!.id
})

afterAll(async () => {
  await deleteTestUsers([alice, bob].filter(Boolean))
})

describe("photos", () => {
  it("must be fingerprinted by the server before publishing", async () => {
    expect((await publishWithPhoto(alice, null)).error?.message).toBe("photos_unverified")
  })

  it("already used by another seller are refused, even slightly re-compressed", async () => {
    const hash = randomPhash()
    expect((await publishWithPhoto(alice, hash)).error).toBeNull()
    expect((await publishWithPhoto(bob, hash)).error?.message).toBe("duplicate_photo")
    expect((await publishWithPhoto(bob, nearby(hash))).error?.message).toBe("duplicate_photo")
    // The same seller may relist with the same photos.
    expect((await publishWithPhoto(alice, hash)).error).toBeNull()
  })

  it("that are different are accepted", async () => {
    expect((await publishWithPhoto(bob, randomPhash())).error).toBeNull()
  })
})

describe("new sellers", () => {
  it("can have at most 3 active auctions until their first completed sale", async () => {
    // Alice already has 2 active auctions from the photo tests.
    expect((await publishWithPhoto(alice, randomPhash())).error).toBeNull()
    expect((await publishWithPhoto(alice, randomPhash())).error?.message).toBe("new_seller_limit")
  })
})
