import { getCurrentUser } from "@/features/auth/session"
import { createClient } from "@/lib/supabase/server"
import { BidBox, type LiveAuction } from "./bid-box"

/**
 * Request-time part of the bid box: who is looking and their saved maximum. Render it inside
 * <Suspense> with `<BidBox viewer={undefined} />` as the fallback, so the cached page shell
 * streams first.
 */
export async function ViewerBidBox({ initial }: { initial: LiveAuction }) {
  const user = await getCurrentUser()
  if (!user) return <BidBox initial={initial} viewer={null} />

  const supabase = await createClient()
  const { data } = await supabase
    .from("auto_bids")
    .select("max_amount")
    .eq("auction_id", initial.id)
    .eq("bidder_id", user.id)
    .maybeSingle()
  return <BidBox initial={initial} viewer={{ userId: user.id, myMax: data?.max_amount ?? null }} />
}
