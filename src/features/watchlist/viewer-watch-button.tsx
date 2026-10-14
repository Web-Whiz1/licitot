import { getCurrentUser } from "@/features/auth/session"
import { isWatched } from "./queries"
import { WatchButton } from "./watch-button"

/** Request-time heart; render inside <Suspense> with a `watched={undefined}` fallback. */
export async function ViewerWatchButton({
  auctionId,
  sellerId,
}: {
  auctionId: string
  sellerId: string
}) {
  const user = await getCurrentUser()
  if (!user) return <WatchButton auctionId={auctionId} watched={false} signedIn={false} />
  // Following your own auction makes no sense.
  if (user.id === sellerId) return null
  const watched = await isWatched(user.id, auctionId)
  return <WatchButton auctionId={auctionId} watched={watched} signedIn />
}
