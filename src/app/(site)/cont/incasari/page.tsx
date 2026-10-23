import { CircleCheck, CircleDashed, ExternalLink, Hourglass, Wallet } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ActionButton } from "@/components/action-button"
import { QueryToast } from "@/components/query-toast"
import { requireUser } from "@/features/auth/session"
import { openStripeDashboard, startStripeOnboarding } from "@/features/payments/actions"
import { SellerKindChooser, StripeConnect } from "@/features/payments/components/stripe-connect"
import { getPayoutStatus } from "@/features/payments/queries"
import { syncConnectedAccount } from "@/features/payments/server"
import { isPaymentsTestMode, publicEnv } from "@/lib/env"
import { PLATFORM_FEE_PERCENT } from "@/lib/money"
import { stripe } from "@/lib/stripe.server"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("payouts"), robots: { index: false } }
}

/**
 * Seller payments, all on LiciTot: pick "persoană fizică" or "firmă" once, fill in Stripe's
 * embedded onboarding here, then manage balance, payouts and bank details with Stripe's
 * embedded components. The hosted Stripe pages stay available as a fallback.
 */
export default async function PayoutsPage({ searchParams }: PageProps<"/cont/incasari">) {
  const t = await getTranslations("payouts")
  const user = await requireUser("/cont/incasari")
  const { stripe: back } = await searchParams
  let status = await getPayoutStatus(user.id)

  // Back from the hosted Stripe pages: read the fresh state now instead of waiting for the webhook.
  if (back && status.stripe_account_id) {
    try {
      await syncConnectedAccount(status.stripe_account_id)
      status = await getPayoutStatus(user.id)
    } catch (e) {
      console.error("[payouts.sync]", e)
    }
  }

  const state = !status.stripe_account_id
    ? "none"
    : status.stripe_charges_enabled
      ? "active"
      : status.stripe_details_submitted
        ? "pending"
        : "incomplete"

  // An unfinished account may predate the type choice: ask for it before the onboarding.
  let hasBusinessType = false
  if (state === "incomplete" && status.stripe_account_id) {
    try {
      const account = await stripe().accounts.retrieve(status.stripe_account_id)
      hasBusinessType = Boolean(account.business_type)
    } catch (e) {
      console.error("[payouts.account]", e)
    }
  }

  const publishableKey = publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const view = {
    none: { icon: CircleDashed, text: t("statusNone"), tone: "bg-muted" },
    incomplete: {
      icon: CircleDashed,
      text: t("statusIncomplete"),
      tone: "bg-warning-soft text-warning",
    },
    pending: { icon: Hourglass, text: t("statusPending"), tone: "bg-warning-soft text-warning" },
    active: { icon: CircleCheck, text: t("statusActive"), tone: "bg-success-soft text-success" },
  }[state]

  return (
    <div className="max-w-3xl space-y-6">
      <QueryToast param="stripe" value="gata" message="payouts.returned" />
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Wallet aria-hidden className="size-6 text-primary" />
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{t("intro")}</p>
        <p className="text-sm text-muted-foreground">
          {t("feeNote", { percent: PLATFORM_FEE_PERCENT })}
        </p>
      </div>

      <div className={cn("flex items-start gap-3 rounded-lg p-4", view.tone)} role="status">
        <view.icon aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">{view.text}</p>
          {state === "active" ? (
            <p className="text-sm">
              {status.stripe_payouts_enabled ? t("payoutsActive") : t("payoutsPending")}
            </p>
          ) : null}
        </div>
      </div>

      {state === "none" || (state === "incomplete" && !hasBusinessType) ? (
        <SellerKindChooser />
      ) : null}

      {state === "incomplete" && hasBusinessType && publishableKey ? (
        <section aria-labelledby="onboarding-title" className="space-y-3">
          <div className="space-y-1">
            <h3 id="onboarding-title" className="text-lg font-semibold tracking-tight">
              {t("onboardingTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("onboardingIntro")}</p>
          </div>
          <StripeConnect mode="onboarding" publishableKey={publishableKey} lockBusinessType />
        </section>
      ) : null}

      {(state === "pending" || state === "active") && publishableKey ? (
        <StripeConnect mode="dashboard" publishableKey={publishableKey} lockBusinessType />
      ) : null}

      {state !== "none" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-sm">
          <span className="text-muted-foreground">{t("fallbackIntro")}</span>
          {state === "incomplete" ? (
            <ActionButton action={startStripeOnboarding} variant="link" size="sm">
              {t("continue")}
              <ExternalLink data-icon="inline-end" />
            </ActionButton>
          ) : (
            <ActionButton action={openStripeDashboard} variant="link" size="sm">
              {t("dashboard")}
              <ExternalLink data-icon="inline-end" />
            </ActionButton>
          )}
        </div>
      ) : null}

      {isPaymentsTestMode && state !== "active" ? (
        <p className="text-sm text-muted-foreground">{t("testNote")}</p>
      ) : null}
    </div>
  )
}
