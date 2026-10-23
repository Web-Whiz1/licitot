"use client"

import { Building2, LoaderCircle, UserRound, type LucideIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { MessageKey } from "@/i18n/keys"
import { cn } from "@/lib/utils"
import { createSellerAccount, type SellerKind } from "../actions"

/** Stripe's embedded components, loaded in the browser only (Connect.js needs `window`). */
export const StripeConnect = dynamic(() => import("./stripe-connect-panel"), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" className="space-y-4 rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-2/3" />
    </div>
  ),
})

const KINDS: { kind: SellerKind; icon: LucideIcon; title: MessageKey; hint: MessageKey }[] = [
  {
    kind: "individual",
    icon: UserRound,
    title: "payouts.individual",
    hint: "payouts.individualHint",
  },
  { kind: "company", icon: Building2, title: "payouts.company", hint: "payouts.companyHint" },
]

/**
 * One-time choice before Stripe onboarding: private individual (most sellers) or company.
 * The account is created with that business type, so Stripe doesn't ask again.
 */
export function SellerKindChooser() {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [picked, setPicked] = useState<SellerKind | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)

  function choose(kind: SellerKind) {
    setPicked(kind)
    setError(null)
    startTransition(async () => {
      const result = await createSellerAccount(kind)
      if (result.ok) router.refresh()
      else setError(result.error)
    })
  }

  return (
    <section aria-labelledby="seller-kind" className="space-y-4">
      <div className="space-y-1">
        <h3 id="seller-kind" className="text-lg font-semibold tracking-tight">
          {t("payouts.kindTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("payouts.kindIntro")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map(({ kind, icon: Icon, title, hint }) => (
          <button
            key={kind}
            type="button"
            disabled={pending}
            onClick={() => choose(kind)}
            className={cn(
              "group relative flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left transition-[border-color,box-shadow,transform] duration-200 ease-snap hover:-translate-y-0.5 hover:border-primary/50 disabled:pointer-events-none disabled:opacity-60",
              kind === "individual" && "border-primary/40",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="grid size-11 place-items-center rounded-lg bg-tint text-primary">
                {pending && picked === kind ? (
                  <LoaderCircle aria-hidden className="size-5 animate-spin" />
                ) : (
                  <Icon aria-hidden className="size-5" />
                )}
              </span>
              {kind === "individual" ? (
                <Badge variant="tint">{t("payouts.recommended")}</Badge>
              ) : null}
            </span>
            <span className="space-y-1">
              <span className="block font-semibold">{t(title)}</span>
              <span className="block text-sm text-muted-foreground">{t(hint)}</span>
            </span>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      ) : null}
    </section>
  )
}
