import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { AuthCard } from "@/features/auth/components/auth-card"
import { NewPasswordForm } from "@/features/auth/components/email-forms"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("newPasswordTitle"), robots: { index: false } }
}

// Protected by the proxy (requires a session, e.g. from the recovery link).
// updatePassword() re-checks the session server-side.
export default async function NewPasswordPage() {
  const t = await getTranslations("auth")
  return (
    <AuthCard title={t("newPasswordTitle")}>
      <NewPasswordForm />
    </AuthCard>
  )
}
