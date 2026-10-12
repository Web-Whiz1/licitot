"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { toast } from "sonner"
import type { MessageKey } from "@/i18n/keys"

/**
 * One-time success toast after a Server Action redirects with a flag in the query string
 * (e.g. ?publicat=1), then removes the flag from the URL.
 */
export function QueryToast({
  param,
  value,
  message,
}: {
  param: string
  value: string
  message: MessageKey
}) {
  const t = useTranslations()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (params.get(param) === value) {
      toast.success(t(message))
      router.replace(pathname, { scroll: false })
    }
  }, [params, router, pathname, t, param, value, message])

  return null
}
