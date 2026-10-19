import { cacheLife } from "next/cache"
import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Logo } from "@/components/brand/logo"

// Consumer-protection pictograms (ANPC): SAL → ANPC's page on alternative dispute resolution,
// SOL → the EU online dispute resolution page. Official artwork, pre-rendered to 500px WebP
// (2× for sharp screens) because the source SAL SVG embeds a 285 KB bitmap.
const DISPUTE_BADGES = [
  { href: "https://anpc.ro/ce-este-sal/", src: "/legal/anpc-sal.webp", key: "sal" },
  { href: "https://ec.europa.eu/consumers/odr", src: "/legal/anpc-sol.webp", key: "sol" },
] as const

async function currentYear() {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}

/** Ink band that closes every page: logo, links, legal badges. */
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
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-12 md:grid-cols-[1.6fr_repeat(3,1fr)] md:px-6">
        <div className="space-y-5">
          <Logo variant="inverse" markClassName="size-10" wordmarkClassName="text-[1.875rem]" />
          <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{t("about")}</p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-4 text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
              {col.title}
            </h2>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  {/* Rarely used: no background prefetch on every page (fewer server calls). */}
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="text-ink-foreground/90 underline-offset-4 transition-colors hover:text-sky hover:underline focus-visible:outline-ink-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {DISPUTE_BADGES.map((b) => (
              <a
                key={b.key}
                href={b.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="rounded-lg focus-visible:outline-ink-accent"
              >
                <Image
                  src={b.src}
                  alt={t(b.key)}
                  width={250}
                  height={62}
                  unoptimized
                  className="h-auto w-[220px] max-w-full"
                />
              </a>
            ))}
          </div>
          <p className="text-sm text-ink-muted">
            {t("rights", { year })} · {t("madeIn")}
          </p>
        </div>
      </div>
    </footer>
  )
}
