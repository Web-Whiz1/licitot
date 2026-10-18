import { UserRound } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/features/notifications/components/notification-bell"
import { getNotificationSummary } from "@/features/notifications/queries"
import { getCurrentProfile, getCurrentUser } from "../session"
import { UserMenuDropdown } from "./user-menu-dropdown"

/** Header account entry. Reads the session, so it's rendered inside <Suspense> in the header. */
export async function UserMenu() {
  // The user id comes from the verified token (no round trip), so the profile and the
  // notifications load in parallel instead of one after the other.
  const user = await getCurrentUser()
  const [profile, notifications] = user
    ? await Promise.all([getCurrentProfile(), getNotificationSummary(user.id)])
    : [null, null]
  if (profile && notifications) {
    return (
      <>
        <NotificationBell
          userId={profile.id}
          initialItems={notifications.items}
          initialUnread={notifications.unread}
        />
        <UserMenuDropdown
          displayName={profile.display_name}
          username={profile.username}
          avatarPath={profile.avatar_path}
          isAdmin={profile.role === "admin" && !profile.is_banned}
        />
      </>
    )
  }
  return <SignInButton label={(await getTranslations("nav"))("signIn")} />
}

export function SignInButton({ label }: { label: string }) {
  return (
    <Button asChild variant="ghost" className="px-2 sm:px-3">
      <Link href="/autentificare">
        <UserRound className="size-5" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </Link>
    </Button>
  )
}
