"use client"

import { Gavel, Hand, Heart, PackageCheck, Settings, Trophy, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const TABS: {
  href: string
  key: "listings" | "bids" | "won" | "sold" | "favorites" | "settings"
  icon: LucideIcon
}[] = [
  { href: "/cont/licitatii", key: "listings", icon: Gavel },
  { href: "/cont/oferte", key: "bids", icon: Hand },
  { href: "/cont/castigate", key: "won", icon: Trophy },
  { href: "/cont/vandute", key: "sold", icon: PackageCheck },
  { href: "/cont/favorite", key: "favorites", icon: Heart },
  { href: "/cont/setari", key: "settings", icon: Settings },
]

/** Route-based tabs: each tab is its own URL (shareable, back-button friendly). */
export function AccountTabs() {
  const t = useTranslations("account")
  const pathname = usePathname()

  return (
    <nav aria-label={t("title")} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {t(`tabs.${key}`)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
