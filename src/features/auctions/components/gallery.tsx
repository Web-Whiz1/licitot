"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Photo = {
  path: string
  width: number | null
  height: number | null
  blur_data_url: string | null
}

export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const t = useTranslations("detail")
  const [index, setIndex] = useState(0)
  const total = photos.length
  const current = photos[index]
  const go = (delta: number) => setIndex((i) => (i + delta + total) % total)

  if (!current) return <div className="aspect-[4/3] rounded-2xl bg-muted" />

  return (
    <section aria-label={t("gallery")} className="space-y-3">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1)
          if (e.key === "ArrowLeft") go(-1)
        }}
      >
        <Image
          key={current.path}
          src={current.path}
          alt={total > 1 ? `${title} — ${t("photo", { n: index + 1, total })}` : title}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-contain"
          placeholder={current.blur_data_url ? "blur" : "empty"}
          blurDataURL={current.blur_data_url ?? undefined}
        />
        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("showPhoto", { n: ((index - 1 + total) % total) + 1 })}
              className="absolute top-1/2 left-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-card hover:bg-background"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("showPhoto", { n: ((index + 1) % total) + 1 })}
              className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-card hover:bg-background"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
            <span
              aria-live="polite"
              className="absolute right-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium"
            >
              {index + 1} / {total}
            </span>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p.path} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("showPhoto", { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 sm:size-20",
                  i === index
                    ? "border-primary"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
              >
                <Image
                  src={p.path}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  placeholder={p.blur_data_url ? "blur" : "empty"}
                  blurDataURL={p.blur_data_url ?? undefined}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
