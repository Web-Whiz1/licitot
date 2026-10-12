import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthCard } from "@/features/auth/components/auth-card"
import { SignInForm } from "@/features/auth/components/sign-in-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("signInTitle"), robots: { index: false } }
}

export default async function SignInPage() {
  const t = await getTranslations("auth")
  return (
    <AuthCard
      title={t("signInTitle")}
      subtitle={t("signInSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/inregistrare" className="font-semibold text-primary hover:underline">
            {t("createAccount")}
          </Link>
        </>
      }
    >
      {/* The form reads ?next= and ?eroare= (request-time), so it streams in. */}
      <Suspense fallback={<FormSkeleton />}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
