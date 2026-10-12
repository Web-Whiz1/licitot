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
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:gap-6 md:px-6">
        <Link href="/" aria-label={t("a11y.home")} className="rounded-md">
          <Logo />
        </Link>

        <SearchForm id="search-desktop" className="hidden max-w-xl flex-1 md:block" />

        <nav aria-label={t("a11y.mainNav")} className="ml-auto flex items-center gap-1 md:gap-2">
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
        </nav>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchForm id="search-mobile" />
      </div>
    </header>
  )
}
