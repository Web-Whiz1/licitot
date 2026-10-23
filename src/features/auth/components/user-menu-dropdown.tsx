"use client"

import { ChevronRight, Gavel, Hand, LogOut, Scale, Settings, Wallet } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "../actions"

/**
 * Avatar menu. The header is the way into "Contul meu" (which also holds the public profile);
 * below it, shortcuts to the sections people use most.
 */
export function UserMenuDropdown({
  displayName,
  username,
  avatarPath,
  isAdmin = false,
}: {
  displayName: string
  username: string
  avatarPath: string | null
  isAdmin?: boolean
}) {
  const t = useTranslations()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.account")}>
          <UserAvatar name={displayName} avatarPath={avatarPath} size={36} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem asChild className="py-2.5">
          <Link href="/cont">
            <UserAvatar name={displayName} avatarPath={avatarPath} size={40} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {t("account.menu.account")} · @{username}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/cont/oferte">
            <Hand /> {t("account.tabs.bids")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cont/licitatii">
            <Gavel /> {t("account.tabs.listings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cont/incasari">
            <Wallet /> {t("account.tabs.payouts")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cont/setari">
            <Settings /> {t("account.tabs.settings")}
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Scale /> {t("account.menu.admin")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut /> {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
