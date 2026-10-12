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
