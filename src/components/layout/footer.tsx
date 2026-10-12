import { Scale } from "lucide-react"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Logo } from "@/components/brand/logo"

// Official consumer-protection links required for Romanian online commerce.
// Since ANPC Order 270/2026 the SOL (EU ODR) pictogram is no longer required: the EU platform
// was discontinued. The SAL pictogram must link to ANPC's integrated SAL complaints platform.
// TODO(legal): replace the styled SAL badge with the official 250×50 pictogram from anpc.ro
// and have a lawyer confirm the current requirements before launch.
const ANPC_URL = "https://anpc.ro/"
const ANPC_SAL_URL = "https://reclamatiisal.anpc.ro/"

async function currentYear() {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}

export async function Footer() {
  const t = await getTranslations("footer")
  const year = await currentYear()

  const columns = [
    {
      title: t("marketplace"),
      links: [
        { href: "/cum-functioneaza", label: t("howItWorks") },
        { href: "/comisioane", label: t("fees") },
        { href: "/brand", label: t("brand") },
      ],
    },
    {
      title: t("help"),
      links: [{ href: "/contact", label: t("contact") }],
    },
    {
      title: t("legal"),
      links: [
        { href: "/termeni", label: t("terms") },
        { href: "/confidentialitate", label: t("privacy") },
        { href: "/cookies", label: t("cookies") },
      ],
    },
  ]

  return (
    <footer className="mt-16 border-t bg-muted/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t("about")}</p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={ANPC_SAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[50px] w-[250px] items-center gap-3 rounded-md border-2 border-foreground/80 bg-background px-3 text-left"
            >
              <Scale aria-hidden className="size-6 shrink-0 text-primary" />
              <span className="text-[0.6875rem] leading-tight font-semibold">
                <span className="block text-xs font-extrabold tracking-wide">ANPC</span>
                {t("sal")}
              </span>
            </a>
            <a
              href={ANPC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              <abbr title={t("anpcFull")} className="no-underline">
                {t("anpc")}
              </abbr>
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("rights", { year })} · {t("madeIn")}
          </p>
        </div>
      </div>
    </footer>
  )
}
