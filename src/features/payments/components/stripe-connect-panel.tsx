"use client"

import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js/pure"
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayouts,
} from "@stripe/react-connect-js"
import { Landmark, Wallet } from "@/components/icons"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { colorTokens } from "@/lib/brand/tokens"
import { createConnectSession, refreshSellerAccount } from "../actions"

/** Stripe's embedded components dressed in LiciTot's tokens (light or dark). */
function appearance(theme: string | undefined) {
  const c = colorTokens[theme === "dark" ? "dark" : "light"]
  return {
    overlays: "dialog" as const,
    variables: {
      fontFamily: "'Public Sans', ui-sans-serif, system-ui, sans-serif",
      fontSizeBase: "15px",
      spacingUnit: "10px",
      borderRadius: "8px",
      buttonBorderRadius: "6px",
      formBorderRadius: "6px",
      badgeBorderRadius: "6px",
      overlayBorderRadius: "8px",
      colorPrimary: c.primary,
      colorBackground: c.card,
      colorText: c.foreground,
      colorSecondaryText: c["muted-foreground"],
      colorBorder: c.border,
      colorDanger: c.destructive,
      actionPrimaryColorText: c.primary,
      buttonPrimaryColorBackground: c.primary,
      buttonPrimaryColorBorder: c.primary,
      buttonPrimaryColorText: c["primary-foreground"],
      buttonSecondaryColorBackground: c.muted,
      buttonSecondaryColorBorder: c.border,
      buttonSecondaryColorText: c.foreground,
      offsetBackgroundColor: c.background,
      formBackgroundColor: c.card,
      formHighlightColorBorder: c.ring,
      formAccentColor: c.primary,
      badgeSuccessColorBackground: c["success-soft"],
      badgeSuccessColorText: c.success,
      badgeWarningColorBackground: c["warning-soft"],
      badgeWarningColorText: c.warning,
      badgeDangerColorBackground: c["destructive-soft"],
      badgeDangerColorText: c.destructive,
      badgeNeutralColorBackground: c.muted,
      badgeNeutralColorText: c["muted-foreground"],
      overlayBackdropColor: "rgba(27, 25, 21, 0.45)",
    },
  }
}

/**
 * Seller payments, built into the site: Stripe's onboarding form while the account is
 * incomplete, then alerts, balance and payouts, and account details (bank account, identity).
 * Client-only (Connect.js runs in the browser); see stripe-connect.tsx for the lazy wrapper.
 */
export default function StripeConnectPanel({
  mode,
  publishableKey,
  lockBusinessType,
}: {
  mode: "onboarding" | "dashboard"
  publishableKey: string
  /** Hide Stripe's business-type step (the seller already chose it on LiciTot). */
  lockBusinessType: boolean
}) {
  const t = useTranslations("payouts")
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [failed, setFailed] = useState(false)
  const [instance] = useState<StripeConnectInstance>(() =>
    loadConnectAndInitialize({
      publishableKey,
      locale: "ro-RO",
      appearance: appearance(resolvedTheme),
      fonts: [
        {
          family: "Public Sans",
          src: `url(${window.location.origin}/fonts/PublicSans-Variable.woff2)`,
          weight: "400 800",
        },
      ],
      fetchClientSecret: async () => {
        const result = await createConnectSession()
        if (!result.ok || !result.data) {
          setFailed(true)
          throw new Error("connect_session_unavailable")
        }
        return result.data.clientSecret
      },
    }),
  )

  // Follow the site's light/dark switch.
  useEffect(() => {
    instance.update({ appearance: appearance(resolvedTheme) })
  }, [instance, resolvedTheme])

  if (failed) {
    return (
      <p role="alert" className="rounded-lg bg-destructive-soft p-4 text-sm text-destructive">
        {t("embeddedError")}
      </p>
    )
  }

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      {mode === "onboarding" ? (
        <div className="rounded-lg border bg-card p-4 md:p-6">
          <ConnectAccountOnboarding
            onExit={async () => {
              await refreshSellerAccount()
              router.refresh()
            }}
            collectionOptions={{
              fields: "eventually_due",
              futureRequirements: "include",
              ...(lockBusinessType ? { requirements: { exclude: ["business_type"] } } : {}),
            }}
            onLoadError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <ConnectNotificationBanner />
          <section aria-labelledby="payouts-balance" className="space-y-3">
            <h3
              id="payouts-balance"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <Wallet aria-hidden className="size-5 text-primary" />
              {t("balanceTitle")}
            </h3>
            <div className="rounded-lg border bg-card p-4 md:p-6">
              <ConnectPayouts onLoadError={() => setFailed(true)} />
            </div>
          </section>
          <section aria-labelledby="payouts-account" className="space-y-3">
            <h3
              id="payouts-account"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <Landmark aria-hidden className="size-5 text-primary" />
              {t("accountTitle")}
            </h3>
            <div className="rounded-lg border bg-card p-4 md:p-6">
              <ConnectAccountManagement
                collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }}
              />
            </div>
          </section>
        </div>
      )}
    </ConnectComponentsProvider>
  )
}
