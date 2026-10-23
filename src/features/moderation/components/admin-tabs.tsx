"use client"

import { BarChart3, Flag, Scale, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const TABS: { href: string; key: "stats" | "reports" | "disputes"; icon: LucideIcon }[] = [
  { href: "/admin", key: "stats", icon: BarChart3 },
  { href: "/admin/rapoarte", key: "reports", icon: Flag },
  { href: "/admin/dispute", key: "disputes", icon: Scale },
]

export function AdminTabs() {
  const t = useTranslations("admin")
  const pathname = usePathname()
  return (
    <nav aria-label={t("title")} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1.5 py-1">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
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
    </nav>
  )
}
