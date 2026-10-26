import { ArrowDown, Award, Check, Clock, Heart, Lock, X } from "@/components/icons"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Logo, LogoMark } from "@/components/brand/logo"
import { HammerStamp } from "@/components/hammer-stamp"
import { LiveDot } from "@/components/live-dot"
import { Price } from "@/components/price"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  "motion",
  "components",
  "voice",
] as const

const TYPE_SCALE = [
  { name: "Display", className: "font-display text-display", spec: "40–68 · Newsreader 560" },
  { name: "H1", className: "font-display text-3xl", spec: "30/36 · Newsreader 560" },
  { name: "H2", className: "font-display text-2xl", spec: "24/32 · Newsreader 560" },
  { name: "H3", className: "text-lg font-semibold", spec: "18/28 · Public Sans 600" },
  { name: "Body", className: "text-base", spec: "16/24 · Public Sans 400" },
  { name: "Small", className: "text-sm", spec: "14/20 · Public Sans 400" },
  {
    name: "Eyebrow",
    className: "text-xs font-semibold tracking-[0.07em] uppercase",
    spec: "12 · Public Sans 600",
  },
] as const

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16] as const

const RADII = [
  { name: "sm · 4px", className: "rounded-sm" },
  { name: "md · 6px", className: "rounded-md" },
  { name: "lg · 8px", className: "rounded-lg" },
  { name: "full", className: "rounded-full" },
] as const

export default async function BrandPage() {
  const t = await getTranslations("brand")
  const tNav = await getTranslations("nav")
  const examplePrice = 100_000

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
      <header className="mb-10 space-y-4">
        <Logo markClassName="size-12" wordmarkClassName="text-4xl" />
        <h1 className="font-display text-5xl">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("intro")}</p>
        <nav aria-label={t("toc")} className="flex flex-wrap gap-2 pt-2">
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex h-9 items-center rounded-md border bg-card px-3 text-sm font-medium transition-colors duration-150 ease-out hover:border-input hover:bg-muted"
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
              <li key={token} className="overflow-hidden rounded-lg border bg-card">
                <div className="flex h-20">
                  <div className="flex-1" style={{ background: light }} />
                  <div className="w-1/3" style={{ background: dark }} title={t("darkTheme")} />
                </div>
                <div className="space-y-1 p-3 text-sm">
                  <p className="font-semibold">{t(`swatches.${token}.name`)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
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
            <div key={theme} className="overflow-x-auto rounded-lg border bg-card">
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
                        <td className="px-1 py-1.5 text-xs tabular-nums">
                          {fg} / {bg}
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs whitespace-nowrap tabular-nums">
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
        <ul className="divide-y rounded-lg border bg-card">
          {TYPE_SCALE.map((s) => (
            <li
              key={s.name}
              className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <span className="w-36 shrink-0 text-xs text-muted-foreground tabular-nums">
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
            <Logo markClassName="size-12" wordmarkClassName="text-4xl" />
          </LogoTile>
          <LogoTile label={t("logoMark")}>
            <LogoMark className="size-16" />
          </LogoTile>
          <LogoTile label={t("logoMono")}>
            <Logo
              variant="mono"
              markClassName="size-12"
              wordmarkClassName="text-4xl"
              className="text-foreground"
            />
          </LogoTile>
          <LogoTile label={t("logoReversed")} dark>
            <Logo variant="inverse" markClassName="size-12" wordmarkClassName="text-4xl" />
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
              <span className="w-20 text-xs text-muted-foreground tabular-nums">
                {step} · {step * 4}px
              </span>
              <span className="h-3 rounded-sm bg-primary" style={{ width: step * 4 * 2 }} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Radius */}
      <Section id="radius" title={t("radius")} intro={t("radiusIntro")}>
        <ul className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <li key={r.name} className="space-y-2 text-center">
              <div className={cn("size-20 border-2 border-primary bg-card", r.className)} />
              <span className="text-xs text-muted-foreground tabular-nums">{r.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Shadows */}
      <Section id="shadows" title={t("shadows")} intro={t("shadowsIntro")}>
        <ul className="flex flex-wrap gap-6">
          <li className="space-y-2 text-center">
            <div className="size-28 rounded-lg border bg-card" />
            <span className="text-xs text-muted-foreground">{t("shadowCard")}</span>
          </li>
          <li className="space-y-2 text-center">
            <div className="size-28 rounded-lg border bg-popover shadow-overlay" />
            <span className="text-xs text-muted-foreground">{t("shadowOverlay")}</span>
          </li>
        </ul>
      </Section>

      {/* Motion */}
      <Section id="motion" title={t("motion")} intro={t("motionIntro")}>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant="live">
            <LiveDot pulse className="size-1.5 text-primary" />
            {t("live")}
          </Badge>
          <span className="inline-flex h-6.5 items-center gap-1.5 rounded-md border bg-card px-2 text-xs font-semibold tabular-nums">
            <Clock aria-hidden className="size-3.5" />
            2h 15m
          </span>
          <span className="inline-flex h-6.5 items-center gap-1.5 rounded-md bg-warning-soft px-2 text-xs font-semibold text-warning tabular-nums">
            <Clock aria-hidden className="size-3.5" />
            4m 08s
          </span>
        </div>
        <ul className="space-y-2 text-sm">
          {t.raw("motionRules").map((rule: string) => (
            <li key={rule} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              {rule}
            </li>
          ))}
        </ul>
      </Section>

      {/* Components */}
      <Section id="components" title={t("components")}>
        <h3 className="mb-3 text-xl font-semibold">{t("buttons")}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t("bidNow")}</Button>
          <Button variant="ink">{t("ink")}</Button>
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
          <Button size="xl">xl</Button>
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
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="success">
            <LogoMark variant="mono" className="size-3.5" />
            {t("statusLeading")}
          </Badge>
          <Badge variant="danger">
            <ArrowDown /> {t("statusOutbid")}
          </Badge>
          <Badge variant="warning">
            <Clock /> {t("statusEndingSoon")}
          </Badge>
          <Badge variant="neutral">
            <Lock /> {t("statusClosed")}
          </Badge>
          <Badge variant="success-solid">
            <Award /> {t("statusWon")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="live">
            <LiveDot className="size-1.5 text-primary" />
            {t("statusActive")}
          </Badge>
          <Badge variant="ink">{t("statusSold")}</Badge>
          <Badge variant="neutral">{t("statusUnsold")}</Badge>
          <Badge variant="danger">{t("statusCancelled")}</Badge>
          <Badge variant="outline">{t("statusDraft")}</Badge>
        </div>

        <h3 className="mt-10 mb-3 text-xl font-semibold">{t("cards")}</h3>
        <div className="grid max-w-xl grid-cols-2 gap-4">
          {[false, true].map((sold) => (
            <div key={String(sold)} className="overflow-hidden rounded-lg border bg-card">
              <div className="relative grid aspect-[4/3] place-items-center border-b bg-muted">
                <LogoMark variant="mono" className="size-14 text-muted-foreground/50" />
                <span
                  className={cn(
                    "absolute top-2 left-2 inline-flex h-6.5 items-center gap-1.5 rounded-md px-2 text-xs font-semibold tabular-nums",
                    sold ? "bg-muted text-muted-foreground" : "bg-card",
                  )}
                >
                  {sold ? (
                    <Lock aria-hidden className="size-3.5" />
                  ) : (
                    <Clock aria-hidden className="size-3.5" />
                  )}
                  {sold ? t("statusClosed") : "2h 15m"}
                </span>
                {sold ? <HammerStamp className="right-2.5 bottom-2.5" /> : null}
              </div>
              <div className="space-y-2 p-3.5">
                <p className="text-sm font-medium">{t("sampleCardTitle")}</p>
                <div>
                  <p className="text-[0.6875rem] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                    {t("currentBid")}
                  </p>
                  <p className="text-xl leading-tight font-bold tracking-tight text-primary">
                    <Price bani={examplePrice} />
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{t("sampleCardMeta")}</p>
              </div>
            </div>
          ))}
        </div>
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
      <h2 id={`${id}-title`} className="mb-2 font-display text-3xl">
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
    <figure className="overflow-hidden rounded-lg border">
      <div className={cn("grid h-40 place-items-center p-6", dark ? "bg-ink" : "bg-background")}>
        {children}
      </div>
      <figcaption className="border-t bg-muted px-4 py-2 text-sm font-medium">{label}</figcaption>
    </figure>
  )
}
