"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useId, useTransition } from "react"
import { NativeSelect } from "@/components/ui/native-select"
import { SORTS, type Sort } from "../params"

/** Changes ?ordine= and resets to page 1. */
export function SortSelect({ value }: { value: Sort }) {
  const t = useTranslations("browse")
  const id = useId()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm whitespace-nowrap text-muted-foreground">
        {t("sort")}
      </label>
      <NativeSelect
        id={id}
        value={value}
        disabled={pending}
        className="h-9 w-48"
        onChange={(e) => {
          const next = new URLSearchParams(params)
          if (e.target.value === "curand") next.delete("ordine")
          else next.set("ordine", e.target.value)
          next.delete("pagina")
          const qs = next.toString()
          startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
        }}
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {t(`sorts.${s}`)}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
