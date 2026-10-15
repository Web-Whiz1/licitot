import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Integration helpers: run against the real (dev) Supabase project from .env.local.
// Every user created here is deleted in afterAll.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const secret = process.env.SUPABASE_SECRET_KEY!

const opts = { auth: { persistSession: false, autoRefreshToken: false } }

export const admin = () => createClient<Database>(url, secret, opts)
export const anon = () => createClient<Database>(url, publishable, opts)

export type TestUser = {
  id: string
  email: string
  password: string
  client: SupabaseClient<Database>
}

export async function createTestUser(displayName: string): Promise<TestUser> {
  const email = `test+${crypto.randomUUID().slice(0, 8)}@licitot.test`
  const password = "parola-test-123"
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  const client = anon()
  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) throw signIn.error
  return { id: data.user.id, email, password, client }
}

export async function deleteTestUsers(users: TestUser[]) {
  await Promise.all(users.map((u) => admin().auth.admin.deleteUser(u.id)))
}

/** Marks the user as having finished Stripe Connect onboarding (normally the webhook does it). */
export async function connectPayouts(
  user: TestUser,
  accountId = `acct_test_${user.id.slice(0, 8)}`,
) {
  const { error } = await admin()
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

/** Random 64-bit perceptual hash (16 hex chars), as ImageKit would report for a photo. */
export const randomPhash = () =>
  [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

/** Stores photo hashes for a draft, as the server does at publish time. */
export async function hashImages(auctionId: string, hashes: { file_id: string; phash: string }[]) {
  const { error } = await admin().rpc("set_auction_image_hashes", {
    p_auction_id: auctionId,
    p_hashes: hashes,
  })
  if (error) throw error
}
