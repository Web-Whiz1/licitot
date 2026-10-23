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
// and typographic punctuation), so one request per file covers every Romanian page.
// Public Sans for text and UI, Newsreader (serif) for headings. Source and license:
// src/assets/fonts/README.md.
const publicSans = localFont({
  src: "../assets/fonts/PublicSans-Variable.woff2",
  weight: "400 800",
  variable: "--font-public-sans",
  display: "swap",
})

const newsreader = localFont({
  src: "../assets/fonts/Newsreader-Variable.woff2",
  weight: "400 700",
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
})

// The italic is rare (an emphasized word in a headline), so it is its own family and is not
// preloaded: the browser fetches it only on pages that show it (`font-serif-italic`).
const newsreaderItalic = localFont({
  src: "../assets/fonts/Newsreader-Italic.woff2",
  weight: "500",
  style: "italic",
  variable: "--font-newsreader-italic",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
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
    <html
      lang="ro"
      className={`${publicSans.variable} ${newsreader.variable} ${newsreaderItalic.variable}`}
      suppressHydrationWarning
    >
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
