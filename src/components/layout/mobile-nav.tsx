"use client"

import { Heart, Home, PlusCircle, Search, UserRound, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

type Item = {
  href: string
  label: "home" | "search" | "sell" | "favorites" | "account"
  icon: LucideIcon
}

const ITEMS: Item[] = [
  { href: "/", label: "home", icon: Home },
  { href: "/cauta", label: "search", icon: Search },
  { href: "/vinde", label: "sell", icon: PlusCircle },
  { href: "/cont/favorite", label: "favorites", icon: Heart },
  { href: "/cont", label: "account", icon: UserRound },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  if (href === "/cont")
    return (
      pathname === "/cont" ||
      (pathname.startsWith("/cont/") && !pathname.startsWith("/cont/favorite"))
    )
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Fixed bottom bar on small screens. The pathname is request data on dynamic routes, so the
 * site layout renders <MobileNavBar pathname={null} /> as the prerendered Suspense fallback.
 */
export function MobileNav() {
  return <MobileNavBar pathname={usePathname()} />
}

export function MobileNavBar({ pathname }: { pathname: string | null }) {
  const t = useTranslations()

  return (
    <nav
      aria-label={t("a11y.mobileNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && isActive(pathname, href)
          const isSell = label === "sell"
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-6", isSell && "text-primary")}
                  strokeWidth={active || isSell ? 2.25 : 1.75}
                />
                {t(`nav.${label}`)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
