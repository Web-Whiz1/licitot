import {
  Camera,
  Eye,
  Gavel,
  Percent,
  Search,
  SlidersHorizontal,
  Timer,
  Trophy,
} from "@/components/icons"
import findPhoto from "@/assets/home/find.webp"
import sellPhoto from "@/assets/home/sell.webp"
import { PhotoTile } from "@/components/photo-tile"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { PLATFORM_FEE_PERCENT } from "@/lib/money"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("info")
  return { title: t("howTitle"), description: t("howIntro") }
}

export default async function HowItWorksPage() {
  const t = await getTranslations("info")
  const percent = PLATFORM_FEE_PERCENT

  const groups = [
    {
      title: t("buyersTitle"),
      photo: findPhoto,
      steps: [
        { icon: Search, title: t("buyers.s1t"), text: t("buyers.s1") },
        { icon: Gavel, title: t("buyers.s2t"), text: t("buyers.s2") },
        { icon: Timer, title: t("buyers.s3t"), text: t("buyers.s3") },
        { icon: Trophy, title: t("buyers.s4t"), text: t("buyers.s4") },
      ],
    },
    {
      title: t("sellersTitle"),
      photo: sellPhoto,
      steps: [
        { icon: Camera, title: t("sellers.s1t"), text: t("sellers.s1") },
        { icon: SlidersHorizontal, title: t("sellers.s2t"), text: t("sellers.s2") },
        { icon: Eye, title: t("sellers.s3t"), text: t("sellers.s3") },
        { icon: Percent, title: t("sellers.s4t"), text: t("sellers.s4", { percent }) },
      ],
    },
  ]

  return (
    <div className="container-page py-10 md:py-14">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-4xl tracking-tight">{t("howTitle")}</h1>
        <p className="text-lg text-muted-foreground">{t("howIntro")}</p>
      </header>

      {groups.map((g) => (
        <section
          key={g.title}
          className="mt-12 grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        >
          {/* The group as a photo tile, its title set on the picture. */}
          <div className="h-56 md:h-72 lg:h-auto lg:min-h-full">
            <PhotoTile src={g.photo} sizes="(min-width: 1024px) 40vw, 100vw">
              <h2 className="absolute inset-x-0 bottom-0 p-6 font-display text-3xl leading-tight md:p-8 md:text-4xl">
                {g.title}
              </h2>
            </PhotoTile>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 md:gap-4">
            {g.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-lg border bg-card p-5">
                <s.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <h3 className="font-semibold">
                    <span className="text-muted-foreground">{i + 1}. </span>
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/vinde">{t("ctaSell")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/cauta">{t("ctaBrowse")}</Link>
        </Button>
      </div>
    </div>
  )
}
