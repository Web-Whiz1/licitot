import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { AuthCard } from "@/features/auth/components/auth-card"
import { ResetPasswordForm } from "@/features/auth/components/email-forms"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("resetTitle"), robots: { index: false } }
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth")
  return (
    <AuthCard
      title={t("resetTitle")}
      subtitle={t("resetSubtitle")}
      footer={
        <Link href="/autentificare" className="font-semibold text-primary hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  )
}
