import { Plus } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Suspense } from "react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserMenu } from "@/features/auth/components/user-menu"
import { SearchForm } from "./search-form"
import { ThemeToggle } from "./theme-toggle"

export function Header() {
  const t = useTranslations()

  return (
    // Solid surface with a hairline: no glass, no shadow.
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-[4.5rem] md:gap-5 md:px-6">
        <Link href="/" aria-label={t("a11y.home")} className="shrink-0 rounded-md">
          <Logo />
        </Link>

        <nav aria-label={t("a11y.mainNav")} className="hidden items-center lg:flex">
          <Link
            href="/cauta"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
          >
            {t("nav.explore")}
          </Link>
          <Link
            href="/cum-functioneaza"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
          >
            {t("nav.howItWorks")}
          </Link>
        </nav>

        <SearchForm id="search-desktop" className="hidden max-w-md flex-1 md:block" />

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

      <div className="px-4 pb-3 md:hidden">
        <SearchForm id="search-mobile" />
      </div>
    </header>
  )
}
