import { Check, Clock, Heart, X } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Logo, LogoMark } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AA_TEXT, AA_UI, contrastRatio } from "@/lib/brand/contrast"
import { brandSwatches, colorTokens, contrastPairs } from "@/lib/brand/tokens"
import { calcSellerPayout, formatRON } from "@/lib/money"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brand")
  return { title: t("title"), description: t("intro") }
}

const SECTIONS = [
  "colors",
  "typography",
  "logo",
  "spacing",
  "radius",
  "shadows",
  "components",
  "voice",
] as const

const TYPE_SCALE = [
  { name: "Display", className: "text-display font-extrabold", spec: "40/46 · 800" },
  { name: "H1", className: "text-4xl font-extrabold tracking-tight", spec: "36/40 · 800" },
  { name: "H2", className: "text-2xl font-bold tracking-tight", spec: "24/32 · 700" },
  { name: "H3", className: "text-xl font-semibold", spec: "20/28 · 600" },
  { name: "Body", className: "text-base", spec: "16/24 · 400" },
  { name: "Small", className: "text-sm", spec: "14/20 · 400" },
  { name: "Caption", className: "text-xs font-medium", spec: "12/16 · 500" },
] as const

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16] as const

const RADII = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "full", className: "rounded-full" },
] as const

const SHADOWS = [
  { name: "card", className: "shadow-card" },
  { name: "raised", className: "shadow-raised" },
  { name: "overlay", className: "shadow-overlay" },
] as const

export default async function BrandPage() {
  const t = await getTranslations("brand")
  const tNav = await getTranslations("nav")
  const examplePrice = 100_000

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
      <header className="mb-10 space-y-4">
        <Logo markClassName="size-12" className="[&>span:last-child]:text-3xl" />
        <h1 className="text-4xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("intro")}</p>
        <nav aria-label={t("toc")} className="flex flex-wrap gap-2 pt-2">
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:underline"
            >
              {t(id)}
            </a>
          ))}
        </nav>
      </header>

      {/* Colors */}
      <Section id="colors" title={t("colors")} intro={t("colorsIntro")}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {brandSwatches.map((token) => {
            const light = colorTokens.light[token]
            const dark = colorTokens.dark[token]
            const ratio = contrastRatio(light, colorTokens.light.background)
            return (
              <li key={token} className="overflow-hidden rounded-xl border bg-card shadow-card">
                <div className="flex h-20">
                  <div className="flex-1" style={{ background: light }} />
                  <div className="w-1/3" style={{ background: dark }} title={t("darkTheme")} />
                </div>
                <div className="space-y-1 p-3 text-sm">
                  <p className="font-semibold">{t(`swatches.${token}.name`)}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {light} · {dark}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(`swatches.${token}.usage`)}</p>
                  {token !== "background" ? (
                    <p className="text-xs font-medium">
                      {t("contrastOnWhite")}: {ratio.toFixed(2)}:1
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <h3 className="mt-10 mb-1 text-xl font-semibold">{t("contrastPairs")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{t("contrastPairsIntro")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {(["light", "dark"] as const).map((theme) => (
            <div key={theme} className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <caption className="border-b bg-muted px-3 py-2 text-left font-semibold">
                  {theme === "light" ? t("lightTheme") : t("darkTheme")}
                </caption>
                <tbody>
                  {contrastPairs.map(({ fg, bg, kind }) => {
                    const tokens = colorTokens[theme]
                    const ratio = contrastRatio(tokens[fg], tokens[bg])
                    const min = kind === "text" ? AA_TEXT : AA_UI
                    return (
                      <tr key={`${fg}-${bg}`} className="border-b last:border-0">
                        <td className="px-3 py-1.5">
                          <span
                            className="inline-block rounded px-2 py-0.5 font-medium"
                            style={{ color: tokens[fg], background: tokens[bg] }}
                          >
                            Aa
                          </span>
                        </td>
                        <td className="px-1 py-1.5 font-mono text-xs">
                          {fg} / {bg}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs whitespace-nowrap">
                          {ratio.toFixed(2)} ≥ {min}
                          {ratio >= min ? (
                            <Check
                              aria-label={t("pass")}
                              className="ml-1 inline size-3.5 text-success"
                            />
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section id="typography" title={t("typography")} intro={t("typographyIntro")}>
        <ul className="divide-y rounded-xl border">
          {TYPE_SCALE.map((s) => (
            <li
              key={s.name}
              className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                {s.name} · {s.spec}
              </span>
              <span className={cn("min-w-0 break-words", s.className)}>{t("typeSample")}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Logo */}
      <Section id="logo" title={t("logo")} intro={t("logoIntro")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LogoTile label={t("logoFull")}>
            <Logo markClassName="size-12" className="[&>span:last-child]:text-3xl" />
          </LogoTile>
          <LogoTile label={t("logoMark")}>
            <LogoMark className="size-16" />
          </LogoTile>
          <LogoTile label={t("logoMono")}>
            <Logo
              mono
              markClassName="size-12"
              className="text-foreground [&>span:last-child]:text-3xl"
            />
          </LogoTile>
          <LogoTile label={t("logoReversed")} dark>
            <span className="inline-flex items-center gap-2">
              <LogoMark className="size-12" />
              <span className="text-3xl leading-none font-extrabold tracking-tight">
                <span className="text-white">Lici</span>
                <span className="text-sky">Tot</span>
              </span>
            </span>
          </LogoTile>
        </div>
        <ul className="mt-6 space-y-2 text-sm">
          {t.raw("logoRules").map((rule: string) => (
            <li key={rule} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              {rule}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          SVG:{" "}
          {[
            "logo",
            "logo-reversed",
            "logo-mono",
            "logo-mono-white",
            "logo-mark",
            "logo-mark-mono",
          ].map((f, i) => (
            <span key={f}>
              {i > 0 ? ", " : null}
              <a
                href={`/brand/${f}.svg`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {f}.svg
              </a>
            </span>
          ))}
        </p>
      </Section>

      {/* Spacing */}
      <Section id="spacing" title={t("spacing")} intro={t("spacingIntro")}>
        <ul className="space-y-2">
          {SPACING.map((step) => (
            <li key={step} className="flex items-center gap-4 text-sm">
              <span className="w-20 font-mono text-xs text-muted-foreground">
                {step} · {step * 4}px
              </span>
              <span className="h-3 rounded-sm bg-sky" style={{ width: step * 4 * 2 }} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Radius */}
      <Section id="radius" title={t("radius")} intro={t("radiusIntro")}>
        <ul className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <li key={r.name} className="space-y-2 text-center">
              <div className={cn("size-20 border-2 border-primary bg-sky-soft", r.className)} />
              <span className="font-mono text-xs text-muted-foreground">{r.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Shadows */}
      <Section id="shadows" title={t("shadows")} intro={t("shadowsIntro")}>
        <ul className="flex flex-wrap gap-6">
          {SHADOWS.map((s) => (
            <li key={s.name} className="space-y-2 text-center">
              <div className={cn("size-28 rounded-xl bg-card", s.className)} />
              <span className="font-mono text-xs text-muted-foreground">{s.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Components */}
      <Section id="components" title={t("components")}>
        <h3 className="mb-3 text-xl font-semibold">{t("buttons")}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t("bidNow")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="outline">{t("outline")}</Button>
          <Button variant="ghost">{t("ghost")}</Button>
          <Button variant="destructive">{t("destructive")}</Button>
          <Button disabled>{t("disabled")}</Button>
          <Button size="icon" variant="outline" aria-label={tNav("favorites")}>
            <Heart />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">sm</Button>
          <Button>default</Button>
          <Button size="lg">lg</Button>
        </div>

        <h3 className="mt-10 mb-3 text-xl font-semibold">{t("inputs")}</h3>
        <div className="grid max-w-md gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="brand-price">{t("inputLabel")}</Label>
            <Input
              id="brand-price"
              inputMode="decimal"
              defaultValue="1.000"
              aria-describedby="brand-price-hint"
            />
            <p id="brand-price-hint" className="text-sm text-muted-foreground">
              {t("inputHint", {
                payout: formatRON(calcSellerPayout(examplePrice), { compact: true }),
              })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-price-err">{t("inputLabel")}</Label>
            <Input
              id="brand-price-err"
              defaultValue="0"
              aria-invalid
              aria-describedby="brand-price-err-msg"
            />
            <p id="brand-price-err-msg" className="text-sm font-medium text-destructive">
              {t("inputError")}
            </p>
          </div>
        </div>

        <h3 className="mt-10 mb-3 text-xl font-semibold">{t("badges")}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">{t("statusActive")}</Badge>
          <Badge variant="warning">
            <Clock /> {t("statusEndingSoon")}
          </Badge>
          <Badge variant="sky">{t("statusSold")}</Badge>
          <Badge variant="secondary">{t("statusUnsold")}</Badge>
          <Badge variant="danger">{t("statusCancelled")}</Badge>
          <Badge variant="outline">{t("statusDraft")}</Badge>
        </div>

        <h3 className="mt-10 mb-3 text-xl font-semibold">{t("cards")}</h3>
        <Card className="max-w-xs gap-0 overflow-hidden p-0 shadow-card">
          <div className="grid aspect-[4/3] place-items-center bg-sky-soft">
            <LogoMark className="size-16 opacity-60" />
          </div>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{t("sampleCardTitle")}</p>
              <Badge variant="warning">
                <Clock /> 2h 15m
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t("sampleCardMeta")}</p>
            <div className="flex items-end justify-between pt-1">
              <div>
                <p className="text-xs text-muted-foreground">{t("currentBid")}</p>
                <p className="text-xl font-extrabold text-primary">
                  {formatRON(examplePrice, { compact: true })}
                </p>
              </div>
              <Button size="sm">{t("bidNow")}</Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Voice */}
      <Section id="voice" title={t("voice")} intro={t("voiceIntro")}>
        <ul className="space-y-3">
          {t.raw("voiceExamples").map((ex: { do: string; dont: string }) => (
            <li key={ex.do} className="grid gap-3 sm:grid-cols-2">
              <p className="flex gap-2 rounded-lg bg-success-soft p-3 text-sm">
                <Check aria-label={t("voiceDo")} className="mt-0.5 size-4 shrink-0 text-success" />
                {ex.do}
              </p>
              <p className="flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm">
                <X
                  aria-label={t("voiceDont")}
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                />
                {ex.dont}
              </p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t py-10">
      <h2 id={`${id}-title`} className="mb-2 text-2xl font-bold tracking-tight">
        {title}
      </h2>
      {intro ? (
        <p className="mb-6 max-w-2xl text-muted-foreground">{intro}</p>
      ) : (
        <div className="mb-6" />
      )}
      {children}
    </section>
  )
}

function LogoTile({
  label,
  dark = false,
  children,
}: {
  label: string
  dark?: boolean
  children: React.ReactNode
}) {
  return (
    <figure className="overflow-hidden rounded-xl border">
      <div
        className={cn("grid h-36 place-items-center p-6", dark ? "bg-[#0B1320]" : "bg-background")}
      >
        {children}
      </div>
      <figcaption className="border-t bg-muted px-4 py-2 text-sm font-medium">{label}</figcaption>
    </figure>
  )
}
