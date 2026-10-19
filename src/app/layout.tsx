import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { NextIntlClientProvider } from "next-intl"
import { getTranslations } from "next-intl/server"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { colorTokens } from "@/lib/brand/tokens"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import "./globals.css"

// Self-hosted single-file subsets (Basic Latin, Latin-1, Latin Extended-A, ș ț with comma-below
// and typographic punctuation), so one request per family covers every Romanian page.
// Source and license: src/assets/fonts/README.md.
const geist = localFont({
  src: "../assets/fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta")
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${SITE_NAME} - ${t("tagline")}`, template: `%s · ${SITE_NAME}` },
    description: t("description"),
    applicationName: SITE_NAME,
    openGraph: { type: "website", locale: "ro_RO", siteName: SITE_NAME },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: colorTokens.light.background },
    { media: "(prefers-color-scheme: dark)", color: colorTokens.dark.background },
  ],
  colorScheme: "light dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={geist.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
