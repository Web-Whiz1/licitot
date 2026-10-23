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

/**
 * Ink band that closes every page: the brand line in the serif,
 * then the logo and the link columns, then the legal badges.
 */
export async function Footer() {
  const t = await getTranslations()
  const year = await currentYear()

  const columns = [
    {
      title: t("footer.marketplace"),
      links: [
        { href: "/cauta", label: t("nav.explore") },
        { href: "/vinde", label: t("nav.sell") },
        { href: "/cum-functioneaza", label: t("footer.howItWorks") },
        { href: "/comisioane", label: t("footer.fees") },
      ],
    },
    {
      title: t("footer.help"),
      links: [
        { href: "/contact", label: t("footer.contact") },
        { href: "/brand", label: t("footer.brand") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/termeni", label: t("footer.terms") },
        { href: "/confidentialitate", label: t("footer.privacy") },
        { href: "/cookies", label: t("footer.cookies") },
      ],
    },
  ]

  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* ── The brand line, closing the page like the home headline opens it ── */}
        <p className="border-b border-ink-foreground/10 py-12 font-display text-[2.5rem] leading-[1.02] tracking-[-0.02em] text-balance md:py-16 md:text-6xl">
          {t.rich("home.heroTitle", {
            accent: (chunks) => (
              <em className="font-serif-italic font-medium text-ink-accent italic">{chunks}</em>
            ),
          })}
        </p>

        {/* ── Logo and links ── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="col-span-2 space-y-4 md:col-span-1">
            <Logo variant="inverse" markClassName="size-9" wordmarkClassName="text-[1.75rem]" />
            <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{t("footer.about")}</p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-4 text-xs font-semibold tracking-[0.07em] text-ink-muted uppercase">
                {col.title}
              </h2>
              <ul className="space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    {/* Rarely used: no background prefetch on every page (fewer server calls). */}
                    <Link
                      href={link.href}
                      prefetch={false}
                      className="text-ink-foreground/85 decoration-ink-accent underline-offset-4 transition-colors duration-150 ease-out hover:text-ink-foreground hover:underline focus-visible:outline-ink-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ── Legal badges and copyright ── */}
        <div className="flex flex-col gap-6 border-t border-ink-foreground/10 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {DISPUTE_BADGES.map((b) => (
              <a
                key={b.key}
                href={b.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="rounded-md focus-visible:outline-ink-accent"
              >
                <Image
                  src={b.src}
                  alt={t(`footer.${b.key}`)}
                  width={250}
                  height={62}
                  unoptimized
                  className="h-auto w-[200px] max-w-full"
                />
              </a>
            ))}
          </div>
          <p className="text-sm text-ink-muted">
            {t("footer.rights", { year })} · {t("footer.madeIn")}
          </p>
        </div>
      </div>
    </footer>
  )
}
