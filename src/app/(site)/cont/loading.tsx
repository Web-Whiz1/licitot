import { AccountSkeleton } from "@/features/profiles/components/account-skeleton"

/** Instant feedback when switching account tabs (prefetched with the route's static shell). */
export default function AccountLoading() {
  return <AccountSkeleton />
}
