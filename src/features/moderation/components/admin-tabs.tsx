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
      <ul className="flex min-w-max gap-1 border-b">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href
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
