import { Mail, Scale } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { OPERATOR } from "@/lib/legal"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.contact")
  return { title: t("title"), description: t("intro") }
}

export default async function ContactPage() {
  const t = await getTranslations("legal.contact")
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("intro")}</p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <section className="space-y-2 rounded-2xl border bg-card p-5 shadow-card">
          <Mail aria-hidden className="size-6 text-primary" />
          <h2 className="font-semibold">{t("emailLabel")}</h2>
          <a
            href={`mailto:${OPERATOR.email}`}
            className="text-lg font-bold break-all text-primary hover:underline"
          >
            {OPERATOR.email}
          </a>
          <p className="text-sm text-muted-foreground">{t("orderHint")}</p>
        </section>
        <section className="space-y-2 rounded-2xl border bg-card p-5 shadow-card">
          <Scale aria-hidden className="size-6 text-primary" />
          <h2 className="font-semibold">{t("disputesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("disputes")}</p>
        </section>
      </div>
    </div>
  )
}
