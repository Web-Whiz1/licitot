// Seeds the dev Supabase project with Romanian demo data (`pnpm db:seed`).
// Idempotent: removes previous demo users (auctions cascade) and their ImageKit files first.
// Demo logins: demo.<key>@licitot.test / demo-licitot-1 (e.g. demo.andrei@licitot.test).
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"
import type { Database } from "../src/types/database"
import { SEED_AUCTIONS, SEED_USERS, type SeedAuction } from "./seed-data"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
const ikKey = process.env.IMAGEKIT_PRIVATE_KEY
if (!url || !secret || !ikKey) throw new Error("Missing env: run with `pnpm db:seed` (.env.local)")

const db = createClient<Database>(url, secret, { auth: { persistSession: false } })
const ikAuth = `Basic ${Buffer.from(`${ikKey}:`).toString("base64")}`
const PASSWORD = "demo-licitot-1"
const email = (key: string) => `demo.${key}@licitot.test`
const HOUR = 3_600_000

// ─── ImageKit ────────────────────────────────────────────────────────────
async function ikDeleteFolder(folder: string) {
  const params = new URLSearchParams({ path: folder, limit: "1000" })
  const res = await fetch(`https://api.imagekit.io/v1/files?${params}`, {
    headers: { Authorization: ikAuth },
  })
  if (!res.ok) return
  const files = (await res.json()) as { fileId: string }[]
  for (const f of files) {
    await fetch(`https://api.imagekit.io/v1/files/${f.fileId}`, {
      method: "DELETE",
      headers: { Authorization: ikAuth },
    })
  }
}

async function ikUpload(buffer: Buffer, folder: string, fileName: string) {
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "image/webp" }), fileName)
  form.append("fileName", fileName)
  form.append("folder", folder)
  form.append("useUniqueFileName", "false")
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: ikAuth },
    body: form,
  })
  if (!res.ok) throw new Error(`ImageKit upload failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as { fileId: string; filePath: string; width: number; height: number }
}

// ─── Placeholder photos ──────────────────────────────────────────────────
const PALETTE: Record<string, [string, string]> = {
  electronice: ["#1D6FC2", "#8EC9F5"],
  "auto-moto": ["#0F1B2D", "#52627A"],
  "casa-gradina": ["#157F3D", "#B7E4C7"],
  moda: ["#A15C07", "#FEF4E2"],
  sport: ["#C2281D", "#FDECEA"],
  colectii: ["#6B4E16", "#E9D8A6"],
  copii: ["#7C3AED", "#EDE9FE"],
  carti: ["#0B4A85", "#E8F4FD"],
}

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)

function wrap(text: string, max = 22): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line.trim())
      line = word
    } else line += " " + word
  }
  if (line.trim()) lines.push(line.trim())
  return lines.slice(0, 4)
}

async function photo(title: string, parent: string, variant: number): Promise<Buffer> {
  const [dark, light] = PALETTE[parent] ?? ["#1D6FC2", "#E8F4FD"]
  const [bg, fg, accent] = variant === 0 ? [light, dark, dark] : [dark, "#FFFFFF", light]
  const lines = wrap(title)
  const text = lines
    .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 78}">${escapeXml(l)}</tspan>`)
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <rect width="1200" height="900" fill="${bg}"/>
    <circle cx="1020" cy="170" r="260" fill="${accent}" opacity="0.12"/>
    <circle cx="160" cy="820" r="200" fill="${accent}" opacity="0.10"/>
    <text x="80" y="${430 - (lines.length - 1) * 39}" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="${fg}">${text}</text>
    <text x="80" y="820" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="${fg}" opacity="0.7">LiciTot · fotografie demo ${variant + 1}</text>
  </svg>`
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer()
}

async function blur(buffer: Buffer): Promise<string> {
  const tiny = await sharp(buffer).resize(20).webp({ quality: 40 }).toBuffer()
  return `data:image/webp;base64,${tiny.toString("base64")}`
}

// ─── Seed ────────────────────────────────────────────────────────────────
async function cleanup() {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  const demo = data.users.filter(
    (u) => u.email?.startsWith("demo.") && u.email.endsWith("@licitot.test"),
  )
  for (const u of demo) {
    await ikDeleteFolder(`/licitot/auctions/${u.id}/`)
    await db.auth.admin.deleteUser(u.id)
  }
  console.log(`✓ removed ${demo.length} previous demo users`)
}

async function createUsers() {
  const ids = new Map<string, string>()
  for (const u of SEED_USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: email(u.key),
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: u.name },
    })
    if (error) throw error
    ids.set(u.key, data.user.id)
    await db
      .from("profiles")
      .update({ username: `demo${u.key}`, county_code: u.county, city: u.city, bio: u.bio })
      .eq("id", data.user.id)
  }
  console.log(`✓ created ${ids.size} demo users (password: ${PASSWORD})`)
  return ids
}

async function createAuction(
  a: SeedAuction,
  users: Map<string, string>,
  categories: Map<string, { id: number; parent: string }>,
) {
  const sellerId = users.get(a.seller)!
  const seller = SEED_USERS.find((u) => u.key === a.seller)!
  const category = categories.get(a.category)
  if (!category) throw new Error(`Unknown category ${a.category}`)

  const now = Date.now()
  const status = a.state ?? "active"
  const live = status !== "draft"
  const endsAt = new Date(now + a.endsInHours * HOUR)
  const startsAt = new Date(endsAt.getTime() - a.durationDays * 24 * HOUR)
  const start = a.start * 100

  const { data: auction, error } = await db
    .from("auctions")
    .insert({
      seller_id: sellerId,
      category_id: category.id,
      title: a.title,
      description: a.description,
      condition: a.condition,
      starting_price: start,
      min_increment: a.increment * 100,
      reserve_price: a.reserve ? a.reserve * 100 : null,
      buy_now_price: a.buyNow ? a.buyNow * 100 : null,
      duration_days: a.durationDays,
      county_code: seller.county,
      city: seller.city,
      ship_pickup: true,
      ship_courier: a.courier !== undefined,
      courier_cost: a.courier !== undefined ? a.courier * 100 : null,
    })
    .select("id")
    .single()
  if (error) throw error

  const images = []
  for (const variant of [0, 1]) {
    const buffer = await photo(a.title, category.parent, variant)
    const up = await ikUpload(
      buffer,
      `/licitot/auctions/${sellerId}`,
      `${crypto.randomUUID()}.webp`,
    )
    images.push({
      auction_id: auction.id,
      file_id: up.fileId,
      path: up.filePath,
      width: up.width,
      height: up.height,
      blur_data_url: await blur(buffer),
      position: variant,
    })
  }
  const { error: imgError } = await db.from("auction_images").insert(images)
  if (imgError) throw imgError

  if (live) {
    const sold = a.sold
    const { error: upError } = await db
      .from("auctions")
      .update({
        status,
        published_at: startsAt.toISOString(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        original_ends_at: endsAt.toISOString(),
        current_price: sold ? sold.price * 100 : start,
        final_price: sold ? sold.price * 100 : null,
        winner_id: sold ? users.get(sold.winner)! : null,
      })
      .eq("id", auction.id)
    if (upError) throw upError
  }
}

async function main() {
  await cleanup()
  const users = await createUsers()

  const { data: cats, error } = await db.from("categories").select("id, slug, parent_id")
  if (error) throw error
  const bySlug = new Map(cats.map((c) => [c.id, c.slug]))
  const categories = new Map(
    cats.map((c) => [
      c.slug,
      { id: c.id, parent: c.parent_id ? bySlug.get(c.parent_id)! : c.slug },
    ]),
  )

  // Limited concurrency keeps ImageKit happy.
  const queue = [...SEED_AUCTIONS]
  let done = 0
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let a = queue.shift(); a; a = queue.shift()) {
        await createAuction(a, users, categories)
        done++
        process.stdout.write(`\r✓ auctions ${done}/${SEED_AUCTIONS.length}`)
      }
    }),
  )
  console.log("\nDone. Sign in as e.g. demo.andrei@licitot.test /", PASSWORD)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
