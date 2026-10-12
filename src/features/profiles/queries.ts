import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { createPublicClient } from "@/lib/supabase/public"
import { createClient } from "@/lib/supabase/server"

export const profileTag = (username: string) => `profile:${username}`

/** Public profile by username. Cached; invalidated by updateProfile() via updateTag. */
export async function getPublicProfile(username: string) {
  "use cache"
  cacheTag(profileTag(username))
  cacheLife("hours")

  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_path, city, bio, rating_avg, rating_count, created_at, county:counties(name)",
    )
    .eq("username", username)
    .maybeSingle()
  if (error) throw error
  return data
}

/** The signed-in user's editable profile + private data (RLS: owner only). */
export async function getMySettings(userId: string) {
  const supabase = await createClient()
  const [profile, priv] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_path, county_code, city, bio")
      .eq("id", userId)
      .single(),
    supabase.from("profiles_private").select("phone, phone_verified_at").eq("id", userId).single(),
  ])
  if (profile.error) throw profile.error
  if (priv.error) throw priv.error
  return { ...profile.data, ...priv.data }
}
