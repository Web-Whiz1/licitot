import { useTranslations } from "next-intl"
import { DemoBanner } from "@/components/layout/demo-banner"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { MobileNav, MobileNavBar } from "@/components/layout/mobile-nav"
import { Suspense } from "react"

export default function SiteLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("a11y")

  return (
    <>
      <a
        href="#continut"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      <DemoBanner />
      <Header />
      <main id="continut" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      {/* Spacer keeps the footer clear of the fixed mobile nav. */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />
      <Suspense fallback={<MobileNavBar pathname={null} />}>
        <MobileNav />
      </Suspense>
    </>
  )
}
