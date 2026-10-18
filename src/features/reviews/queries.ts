import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { profileTag } from "@/features/profiles/queries"
import { createPublicClient } from "@/lib/supabase/public"
import { createClient } from "@/lib/supabase/server"

/** The signed-in user's own review on an order, if any (fresh: may have just been written). */
export async function getMyReview(orderId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("order_id", orderId)
    .eq("reviewer_id", userId)
    .abortSignal(new AbortController().signal)
    .maybeSingle()
  return data
}

/** Latest reviews received by a user, for their public profile. */
export async function getProfileReviews(profileId: string, username: string) {
  "use cache"
  cacheTag(profileTag(username))
  cacheLife("hours")

  const { data, error } = await createPublicClient()
    .from("reviews")
    .select(
      "id, rating, comment, reviewer_role, created_at, reviewer:profiles!reviews_reviewer_id_fkey(username, display_name, avatar_path)",
    )
    .eq("reviewee_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}
