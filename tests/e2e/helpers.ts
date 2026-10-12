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
