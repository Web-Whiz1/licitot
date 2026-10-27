import { Plus } from "@/components/icons"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { useTranslations } from "next-intl"
import { Suspense } from "react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserMenu } from "@/features/auth/components/user-menu"
import { getCategoryTree } from "@/features/auctions/queries"
import { SearchForm } from "./search-form"
import { ThemeToggle } from "./theme-toggle"

export function Header() {
  const t = useTranslations()

  return (
    // Solid surface with a hairline: no glass, no shadow. Desktop: a second row with the
    // categories, like the aisles of an auction house.
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="container-page flex h-16 items-center gap-3 md:h-[4.75rem] md:gap-6">
        <Link href="/" aria-label={t("a11y.home")} className="shrink-0 rounded-md">
          <Logo />
        </Link>

        <SearchForm id="search-desktop" className="hidden max-w-2xl flex-1 md:block" />

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Button asChild className="hidden md:inline-flex">
            <Link href="/vinde">
              <Plus data-icon="inline-start" />
              {t("nav.sell")}
            </Link>
          </Button>
          <ThemeToggle />
          {/* Session-dependent: streams in so the rest of the page stays prerendered. */}
          <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>

      <div className="hidden border-t lg:block">
        <CategoryNav />
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchForm id="search-mobile" />
      </div>
    </header>
  )
}

const navLink =
  "relative inline-flex h-11 items-center px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-out after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 after:ease-out hover:text-foreground hover:after:scale-x-100"

/** Category row (cached data, prerendered with the page). */
async function CategoryNav() {
  const [t, tree] = await Promise.all([getTranslations(), getCategoryTree()])
  return (
    <nav aria-label={t("a11y.mainNav")} className="container-page flex items-center">
      <ul className="-ml-3 flex min-w-0 items-center">
        <li>
          <Link href="/cauta" className={`${navLink} font-semibold text-foreground`}>
            {t("nav.allAuctions")}
          </Link>
        </li>
        {tree.map((c) => (
          <li key={c.slug}>
            <Link href={`/categorie/${c.slug}`} className={navLink}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="-mr-3 ml-auto flex items-center">
        <li>
          <Link href="/cum-functioneaza" className={navLink}>
            {t("nav.howItWorks")}
          </Link>
        </li>
        <li>
          <Link href="/comisioane" className={navLink}>
            {t("nav.fees")}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
