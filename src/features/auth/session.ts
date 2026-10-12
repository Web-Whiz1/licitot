import "server-only"
import { redirect } from "next/navigation"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type SessionUser = { id: string; email: string | null }

/**
 * Current user from the verified JWT claims (deduplicated per request).
 * Never use getSession() on the server: it doesn't validate the token.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null }
})

/** Use in protected pages/actions. Redirects to sign-in, preserving where to come back. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/autentificare?next=${encodeURIComponent(nextPath)}`)
  return user
}

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_path, county_code, city, bio, role, is_banned, created_at",
    )
    .eq("id", user.id)
    .single()
  return data
})
