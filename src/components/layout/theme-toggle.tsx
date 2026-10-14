"use client"

import { Moon, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

/** One click switches light ↔ dark. The first visit follows the device setting. */
export function ThemeToggle() {
  const t = useTranslations("theme")
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("toggle")}
      title={t("toggle")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Icons swap via CSS so SSR markup never depends on the stored theme. */}
      <Sun aria-hidden className="size-5 dark:hidden" />
      <Moon aria-hidden className="hidden size-5 dark:block" />
    </Button>
  )
}
