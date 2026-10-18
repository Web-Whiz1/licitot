import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getTranslations } from "next-intl/server"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { colorTokens } from "@/lib/brand/tokens"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import "./globals.css"

// latin-ext carries ă, â, î, ș, ț (comma-below).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
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
    <html lang="ro" className={jakarta.variable} suppressHydrationWarning>
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
