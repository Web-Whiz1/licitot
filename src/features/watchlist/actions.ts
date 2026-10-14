"use server"

import { getCurrentUser } from "@/features/auth/session"
import { auctionIdSchema } from "@/features/bids/schemas"
import { fail, type ActionResult } from "@/lib/action-result"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

/** Follow (`watch = true`) or unfollow an auction. Idempotent. */
export async function setWatched(auctionId: string, watch: boolean): Promise<ActionResult> {
  if (!auctionIdSchema.safeParse(auctionId).success) return fail("watchlist.error")
  const user = await getCurrentUser()
  if (!user) return fail("bid.errors.not_authenticated")
  if (!(await rateLimit({ key: `watch:${user.id}`, limit: 60, windowSeconds: 60 }))) {
    return fail("watchlist.error")
  }

  const supabase = await createClient()
  const { error } = watch
    ? await supabase
        .from("watchlist")
        .upsert(
          { auction_id: auctionId },
          { onConflict: "user_id,auction_id", ignoreDuplicates: true },
        )
    : await supabase.from("watchlist").delete().eq("auction_id", auctionId).eq("user_id", user.id)
  if (error) {
    if (error.message !== "watchlist_full") console.error("[watchlist]", error.code, error.message)
    return fail(error.message === "watchlist_full" ? "watchlist.full" : "watchlist.error")
  }
  return { ok: true, message: watch ? "watchlist.added" : "watchlist.removed" }
}
