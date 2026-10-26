"use client"

import { Heart, Home, Plus, Search, UserRound, type IconComponent } from "@/components/icons"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

type Item = {
  href: string
  label: "home" | "search" | "sell" | "favorites" | "account"
  icon: IconComponent
}

const ITEMS: Item[] = [
  { href: "/", label: "home", icon: Home },
  { href: "/cauta", label: "search", icon: Search },
  { href: "/vinde", label: "sell", icon: Plus },
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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && isActive(pathname, href)
          const isSell = label === "sell"
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-0.5 rounded-md text-[0.6875rem] font-medium transition-colors duration-150 ease-out",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isSell ? (
                  // "Vinde" stands out as the one filled (bordo) button, kept inside the bar so
                  // it never covers the sticky bid bar on auction pages.
                  <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground transition-colors duration-150 ease-out group-hover:bg-primary-hover">
                    <Icon aria-hidden weight="bold" className="size-5" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "grid h-8 w-14 place-items-center rounded-md transition-colors duration-150 ease-out",
                      active && "bg-tint text-primary",
                    )}
                  >
                    <Icon
                      aria-hidden
                      className="size-[1.375rem]"
                      weight={active ? "fill" : "light"}
                    />
                  </span>
                )}
                <span className={cn(active && "font-semibold")}>{t(`nav.${label}`)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
