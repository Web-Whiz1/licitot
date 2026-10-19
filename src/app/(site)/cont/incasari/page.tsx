import { CircleCheck, CircleDashed, ExternalLink, Hourglass, Wallet } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ActionButton } from "@/components/action-button"
import { QueryToast } from "@/components/query-toast"
import { requireUser } from "@/features/auth/session"
import { openStripeDashboard, startStripeOnboarding } from "@/features/payments/actions"
import { getPayoutStatus } from "@/features/payments/queries"
import { syncConnectedAccount } from "@/features/payments/server"
import { isPaymentsTestMode } from "@/lib/env"
import { PLATFORM_FEE_PERCENT } from "@/lib/money"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("payouts"), robots: { index: false } }
}

export default async function PayoutsPage({ searchParams }: PageProps<"/cont/incasari">) {
  const t = await getTranslations("payouts")
  const user = await requireUser("/cont/incasari")
  const { stripe: back } = await searchParams
  let status = await getPayoutStatus(user.id)

  // Back from Stripe onboarding: read the fresh state now instead of waiting for the webhook.
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
    <div className="max-w-2xl space-y-6">
      <QueryToast param="stripe" value="gata" message="payouts.returned" />
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-xl tracking-tight">
          <Wallet aria-hidden className="size-5 text-primary" />
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{t("intro")}</p>
        <p className="text-sm text-muted-foreground">
          {t("feeNote", { percent: PLATFORM_FEE_PERCENT })}
        </p>
      </div>

      <div className={cn("flex items-start gap-3 rounded-2xl p-4", view.tone)} role="status">
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

      <div className="flex flex-wrap gap-2">
        {state === "active" ? (
          <ActionButton action={openStripeDashboard} variant="outline">
            {t("dashboard")}
            <ExternalLink data-icon="inline-end" />
          </ActionButton>
        ) : (
          <ActionButton action={startStripeOnboarding} size="lg">
            {state === "none" ? t("start") : t("continue")}
          </ActionButton>
        )}
        {state === "pending" ? (
          <ActionButton action={openStripeDashboard} variant="outline" size="lg">
            {t("dashboard")}
            <ExternalLink data-icon="inline-end" />
          </ActionButton>
        ) : null}
      </div>

      {isPaymentsTestMode && state !== "active" ? (
        <p className="text-sm text-muted-foreground">{t("testNote")}</p>
      ) : null}
    </div>
  )
}
