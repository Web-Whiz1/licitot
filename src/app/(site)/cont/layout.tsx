import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { AccountTabs, AccountTabsNav } from "@/features/profiles/components/account-tabs"
import { requireUser } from "@/features/auth/session"
import { AccountSkeleton } from "@/features/profiles/components/account-skeleton"

export default async function AccountLayout({ children }: LayoutProps<"/cont">) {
  const t = await getTranslations("account")
  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="mb-6 font-display text-3xl md:text-4xl">{t("title")}</h1>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <Suspense fallback={<AccountTabsNav pathname={null} />}>
          <AccountTabs />
        </Suspense>
        <div className="min-w-0 pt-6 lg:pt-0">
          <Suspense fallback={<AccountSkeleton />}>
            <SignedIn>{children}</SignedIn>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

/** Server-side session check (the proxy redirect is only the fast path). */
async function SignedIn({ children }: { children: React.ReactNode }) {
  await requireUser("/cont")
  return children
}
