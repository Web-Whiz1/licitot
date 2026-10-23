"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { ACCOUNT_NAV } from "../account-nav"

const isActive = (pathname: string | null, href: string) =>
  pathname !== null &&
  (href === "/cont" ? pathname === "/cont" : pathname === href || pathname.startsWith(`${href}/`))

/** On phones the tab row scrolls sideways: keep the current tab in view. */
function centerInNav(el: HTMLAnchorElement | null) {
  const nav = el?.closest("[data-scroll-row]")
  if (!el || !nav || nav.scrollWidth <= nav.clientWidth) return
  nav.scrollLeft = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2
}

/** Route-based navigation: each section is its own URL (shareable, back-button friendly). */
export function AccountTabs() {
  return <AccountTabsNav pathname={usePathname()} />
}

/**
 * Sidebar on large screens, a scrolling row of pills on phones. Rendered without a pathname
 * as the <Suspense> fallback: on dynamic routes (e.g. /cont/comanda/[id]) the URL is only
 * known at request time.
 */
export function AccountTabsNav({ pathname }: { pathname: string | null }) {
  const t = useTranslations("account")

  return (
    <nav aria-label={t("title")} className="lg:sticky lg:top-24 lg:self-start">
      {/* Phones and tablets: one scrolling row. */}
      <div data-scroll-row className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 lg:hidden">
        <ul className="flex min-w-max gap-1.5 py-1">
          {ACCOUNT_NAV.flatMap(({ tabs }) => tabs).map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  ref={active ? centerInNav : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-md px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {t(`tabs.${key}`)}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Desktop: grouped sidebar. */}
      <div className="hidden space-y-6 lg:block">
        {ACCOUNT_NAV.map(({ group, tabs }) => (
          <div key={group ?? "main"} className="space-y-1.5">
            {group ? (
              <p className="px-3 text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                {t(`groups.${group}`)}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {tabs.map(({ href, key, icon: Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150 ease-out",
                        active
                          ? "bg-tint font-semibold text-tint-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      {t(`tabs.${key}`)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
