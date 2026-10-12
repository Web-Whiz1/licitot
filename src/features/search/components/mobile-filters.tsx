"use client"

import { SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/** Mobile filters: the same server-rendered <FiltersForm/>, inside a bottom sheet. */
export function MobileFilters({
  activeCount,
  children,
}: {
  activeCount: number
  children: React.ReactNode
}) {
  const t = useTranslations("browse")
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal data-icon="inline-start" />
          {t("filters")}
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t("filters")}</SheetTitle>
          <SheetDescription className="sr-only">{t("filters")}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
