"use client"

import {
  Gavel,
  Hand,
  Heart,
  PackageCheck,
  Settings,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const TABS: {
  href: string
  key: "listings" | "bids" | "won" | "sold" | "favorites" | "payouts" | "settings"
  icon: LucideIcon
}[] = [
  { href: "/cont/licitatii", key: "listings", icon: Gavel },
  { href: "/cont/oferte", key: "bids", icon: Hand },
  { href: "/cont/castigate", key: "won", icon: Trophy },
  { href: "/cont/vandute", key: "sold", icon: PackageCheck },
  { href: "/cont/favorite", key: "favorites", icon: Heart },
  { href: "/cont/incasari", key: "payouts", icon: Wallet },
  { href: "/cont/setari", key: "settings", icon: Settings },
]

/** On phones the tab row scrolls sideways: keep the current tab in view. */
function centerInNav(el: HTMLAnchorElement | null) {
  const nav = el?.closest("nav")
  if (!el || !nav || nav.scrollWidth <= nav.clientWidth) return
  nav.scrollLeft = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2
}

/** Route-based tabs: each tab is its own URL (shareable, back-button friendly). */
export function AccountTabs() {
  return <AccountTabsNav pathname={usePathname()} />
}

/**
 * The tab list itself. Rendered without a pathname as the <Suspense> fallback: on dynamic
 * routes (e.g. /cont/comanda/[id]) the URL is only known at request time.
 */
export function AccountTabsNav({ pathname }: { pathname: string | null }) {
  const t = useTranslations("account")

  return (
    <nav aria-label={t("title")} className="relative -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`))
          return (
            <li key={href}>
              <Link
                href={href}
                ref={active ? centerInNav : undefined}
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
