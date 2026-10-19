import { getTranslations } from "next-intl/server"
import { formatDate } from "@/lib/dates"
import { LEGAL_UPDATED_AT, OPERATOR } from "@/lib/legal"
import { PLATFORM_FEE_PERCENT } from "@/lib/money"

type Doc = {
  title: string
  intro: string
  sections: Record<string, { title: string; body: string }>
}

/** Fills {operator}, {email} and {percent} in the long legal texts (read raw from ro.json). */
const fill = (s: string) =>
  s
    .replaceAll("{operator}", OPERATOR.name)
    .replaceAll("{email}", OPERATOR.email)
    .replaceAll("{percent}", String(PLATFORM_FEE_PERCENT))

/** The long texts are nested objects; next-intl types raw() for leaf keys only. */
async function rawDoc(doc: "terms" | "privacy" | "cookies"): Promise<Doc> {
  const t = await getTranslations("legal")
  return (t.raw as (key: string) => unknown)(doc) as Doc
}

export async function legalTitle(doc: "terms" | "privacy" | "cookies") {
  const content = await rawDoc(doc)
  return { title: content.title, description: fill(content.intro) }
}

/** Terms, privacy and cookie pages: title, date, sections, then the operator's details. */
export async function LegalDocument({ doc }: { doc: "terms" | "privacy" | "cookies" }) {
  const t = await getTranslations("legal")
  const content = await rawDoc(doc)
  const operatorRows = [
    [t("operatorName"), OPERATOR.legalName || OPERATOR.name],
    [t("operatorTaxId"), OPERATOR.taxId],
    [t("operatorRegister"), OPERATOR.tradeRegister],
    [t("operatorAddress"), OPERATOR.address],
    [t("operatorEmail"), OPERATOR.email],
  ].filter(([, v]) => v)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{content.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t("updated", { date: formatDate(LEGAL_UPDATED_AT) })}
        </p>
        <p className="text-lg text-muted-foreground">{fill(content.intro)}</p>
      </header>

      <div className="mt-10 space-y-8">
        {Object.entries(content.sections).map(([key, s]) => (
          <section key={key} aria-labelledby={`legal-${key}`} className="space-y-3">
            <h2 id={`legal-${key}`} className="font-display text-xl font-semibold tracking-tight">
              {fill(s.title)}
            </h2>
            {fill(s.body)
              .split("\n\n")
              .map((p, i) => (
                <p key={i} className="leading-relaxed">
                  {p}
                </p>
              ))}
          </section>
        ))}
      </div>

      <section aria-labelledby="legal-operator" className="mt-12 rounded-2xl border bg-card p-5">
        <h2 id="legal-operator" className="mb-3 font-semibold">
          {t("operatorTitle")}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          {operatorRows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                {label === t("operatorEmail") ? (
                  <a href={`mailto:${value}`} className="text-primary hover:underline">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  )
}
