import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { AuthCard } from "@/features/auth/components/auth-card"
import { SignUpForm } from "@/features/auth/components/sign-up-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("signUpTitle"), robots: { index: false } }
}

export default async function SignUpPage() {
  const t = await getTranslations("auth")
  return (
    <AuthCard
      title={t("signUpTitle")}
      subtitle={t("signUpSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/autentificare" className="font-semibold text-primary hover:underline">
            {t("signInLink")}
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  )
}
