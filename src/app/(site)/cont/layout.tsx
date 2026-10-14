import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { AccountTabs, AccountTabsNav } from "@/features/profiles/components/account-tabs"
import { requireUser } from "@/features/auth/session"

export default async function AccountLayout({ children }: LayoutProps<"/cont">) {
  const t = await getTranslations("account")
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<AccountTabsNav pathname={null} />}>
        <AccountTabs />
      </Suspense>
      <div className="pt-8">
        <Suspense fallback={<AccountSkeleton />}>
          <SignedIn>{children}</SignedIn>
        </Suspense>
      </div>
    </div>
  )
}

/** Server-side session check (the proxy redirect is only the fast path). */
async function SignedIn({ children }: { children: React.ReactNode }) {
  await requireUser("/cont")
  return children
}

function AccountSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
