import { MailCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { AuthCard } from "@/features/auth/components/auth-card"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth")
  return { title: t("checkEmailTitle"), robots: { index: false } }
}

export default async function CheckEmailPage({ searchParams }: PageProps<"/verifica-emailul">) {
  const t = await getTranslations("auth")
  return (
    <AuthCard
      title={t("checkEmailTitle")}
      footer={
        <Link href="/autentificare" className="font-semibold text-primary hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <div className="space-y-4 text-center">
        <MailCheck aria-hidden className="mx-auto size-9 text-primary" strokeWidth={1.5} />
        <Suspense fallback={<p className="text-sm">{t("checkEmailGeneric")}</p>}>
          <Message searchParams={searchParams} />
        </Suspense>
        <p className="text-sm text-muted-foreground">{t("checkEmailSpam")}</p>
      </div>
    </AuthCard>
  )
}

async function Message({ searchParams }: Pick<PageProps<"/verifica-emailul">, "searchParams">) {
  const t = await getTranslations("auth")
  const { mod, email } = await searchParams
  const address = typeof email === "string" ? email : ""
  const text = !address
    ? t("checkEmailGeneric")
    : mod === "signup"
      ? t("checkEmailSignup", { email: address })
      : mod === "magic"
        ? t("checkEmailMagic", { email: address })
        : mod === "reset"
          ? t("checkEmailReset", { email: address })
          : t("checkEmailGeneric")
  return <p className="text-sm">{text}</p>
}
