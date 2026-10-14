import { createClient } from "@supabase/supabase-js"
import { expect, type Page } from "@playwright/test"

// Shared E2E helpers. Tests run against the dev Supabase project + ImageKit account from
// .env.local; everything a test creates is removed in cleanupUser().

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
)

export type E2EUser = { id: string; email: string; password: string }

export async function createConfirmedUser(displayName: string): Promise<E2EUser> {
  const email = `e2e+${crypto.randomUUID().slice(0, 8)}@licitot.test`
  const password = "parola-e2e-123"
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  return { id: data.user.id, email, password }
}

export async function signIn(page: Page, user: E2EUser, next = "/cont") {
  await page.goto(`/autentificare?next=${encodeURIComponent(next)}`)
  const form = page.getByRole("tabpanel", { name: "Cu parolă" })
  await form.getByLabel("Email").fill(user.email)
  await form.getByLabel("Parolă", { exact: true }).fill(user.password)
  await form.getByRole("button", { name: "Intră în cont" }).click()
  await expect(page).not.toHaveURL(/autentificare/)
}

/** Deletes the user (auctions cascade) and every ImageKit file they uploaded. */
export async function cleanupUser(user: E2EUser | undefined) {
  if (!user) return
  const auth = `Basic ${Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`
  for (const folder of ["auctions", "avatars"]) {
    const params = new URLSearchParams({ path: `/licitot/${folder}/${user.id}/`, limit: "100" })
    const res = await fetch(`https://api.imagekit.io/v1/files?${params}`, {
      headers: { Authorization: auth },
    })
    if (!res.ok) continue
    const files = (await res.json()) as { fileId: string }[]
    await Promise.all(
      files.map((f) =>
        fetch(`https://api.imagekit.io/v1/files/${f.fileId}`, {
          method: "DELETE",
          headers: { Authorization: auth },
        }),
      ),
    )
  }
  await admin.auth.admin.deleteUser(user.id)
}

const ikAuth = () =>
  `Basic ${Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`

/** Uploads a fixture photo into the seller's ImageKit folder (removed by cleanupUser). */
async function uploadPhoto(sellerId: string, file: string) {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")
  const bytes = await fs.readFile(path.resolve("tests/e2e/fixtures", file))
  const form = new FormData()
  const name = `${crypto.randomUUID()}.jpg`
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), name)
  form.append("fileName", name)
  form.append("folder", `/licitot/auctions/${sellerId}`)
  form.append("useUniqueFileName", "false")
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: ikAuth() },
    body: form,
  })
  if (!res.ok) throw new Error(`ImageKit upload failed: ${res.status}`)
  return (await res.json()) as { fileId: string; filePath: string; width: number; height: number }
}

export type LiveAuctionOptions = {
  title: string
  description?: string
  category?: string
  county?: string
  city?: string
  startingPrice?: number
  minIncrement?: number
  buyNowPrice?: number | null
  reservePrice?: number | null
  endsInMs?: number
  photo?: string
  courierCost?: number | null
}

/** Inserts an active auction with one real photo, as if the seller had published it. */
export async function createLiveAuction(seller: E2EUser, o: LiveAuctionOptions) {
  const { data: cat, error: catError } = await admin
    .from("categories")
    .select("id")
    .eq("slug", o.category ?? "biciclete")
    .single()
  if (catError) throw catError
  const photo = await uploadPhoto(seller.id, o.photo ?? "foto-1.jpg")
  const now = Date.now()
  const start = o.startingPrice ?? 45_000
  const { data, error } = await admin
    .from("auctions")
    .insert({
      seller_id: seller.id,
      category_id: cat.id,
      title: o.title,
      description:
        o.description ?? "Obiect în stare foarte bună, folosit cu grijă. Predare rapidă.",
      condition: "ca_nou",
      starting_price: start,
      current_price: start,
      min_increment: o.minIncrement ?? 1_000,
      buy_now_price: o.buyNowPrice ?? null,
      reserve_price: o.reservePrice ?? null,
      duration_days: 3,
      ship_pickup: true,
      ship_courier: o.courierCost != null,
      courier_cost: o.courierCost ?? null,
      county_code: o.county ?? "CJ",
      city: o.city ?? "Cluj-Napoca",
      status: "active",
      published_at: new Date(now).toISOString(),
      starts_at: new Date(now).toISOString(),
      ends_at: new Date(now + (o.endsInMs ?? 3 * 86_400_000)).toISOString(),
    })
    .select("id, slug")
    .single()
  if (error) throw error
  const { error: imgError } = await admin.from("auction_images").insert({
    auction_id: data.id,
    file_id: photo.fileId,
    path: photo.filePath,
    width: photo.width,
    height: photo.height,
    position: 0,
  })
  if (imgError) throw imgError
  return { ...data, title: o.title, href: `/licitatie/${data.id}-${data.slug}` }
}

/** Marks the user's Stripe payouts as active in the DB (publishing requires it). */
export async function markPayoutsActive(
  user: E2EUser,
  accountId = `acct_e2e_${user.id.slice(0, 8)}`,
) {
  const { error } = await admin
    .from("profiles_private")
    .update({
      stripe_account_id: accountId,
      stripe_details_submitted: true,
      stripe_charges_enabled: true,
      stripe_payouts_enabled: true,
    })
    .eq("id", user.id)
  if (error) throw error
}
