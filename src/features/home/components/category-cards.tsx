import { ArrowRight } from "@/components/icons"
import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { CategoryIcon } from "@/features/auctions/components/category-icon"
import type { CategoryGroup } from "@/features/auctions/queries"
import { cn } from "@/lib/utils"
import { CATEGORY_PHOTO_FOCUS, CATEGORY_PHOTOS } from "../category-photos"

/**
 * Tile sizes in the mosaic, by position. Desktop (4 columns): a 2×2 lead tile, four squares
 * beside it, then a wide tile and two squares, so the block closes as a rectangle. Phones
 * (2 columns): the lead and the wide tile span both columns.
 */
const TILE = [
  "col-span-2 row-span-2 lg:col-span-2 lg:row-span-2",
  "",
  "",
  "",
  "",
  "col-span-2",
  "",
  "",
] as const

/** Home page categories: full-bleed photos with the name set on them, as a magazine mosaic. */
export async function CategoryCards({ tree }: { tree: CategoryGroup[] }) {
  const t = await getTranslations("home")
  return (
    <ul className="grid auto-rows-[10.5rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:gap-4 lg:auto-rows-[14.5rem] lg:grid-cols-4">
      {tree.map((c, i) => {
        const photo = CATEGORY_PHOTOS[c.slug]
        const lead = i === 0
        return (
          <li key={c.slug} className={cn(TILE[i] ?? "")}>
            <Link
              href={`/categorie/${c.slug}`}
              className="group relative isolate block size-full overflow-hidden rounded-lg bg-ink text-ink-foreground"
            >
              {photo ? (
                <Image
                  src={photo}
                  alt=""
                  fill
                  placeholder="blur"
                  style={{ objectPosition: CATEGORY_PHOTO_FOCUS[c.slug] }}
                  sizes={
                    lead
                      ? "(min-width: 1024px) 50vw, 100vw"
                      : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                  }
                  className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
              ) : (
                <CategoryIcon
                  name={c.icon}
                  className="absolute top-1/3 left-1/2 -z-10 size-16 -translate-1/2 text-ink-accent"
                />
              )}
              {/* Shade for the type: deep at the foot, clear at the top. */}
              <span
                aria-hidden
                className="absolute inset-0 -z-10 bg-linear-to-t from-ink/90 via-ink/30 to-ink/0 transition-opacity duration-300 ease-out group-hover:opacity-95"
              />
              {/* A hairline inside the edge, like a print mount. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-2 rounded-md border border-ink-foreground/15 transition-colors duration-300 ease-out group-hover:border-ink-foreground/35 md:inset-2.5"
              />
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 flex flex-col p-4 md:p-6",
                  lead && "md:p-9",
                )}
              >
                <span
                  className={cn(
                    "font-display leading-[1.05] tracking-[-0.01em] text-balance",
                    lead ? "text-[2rem] md:text-5xl" : "text-xl md:text-2xl",
                  )}
                >
                  {c.name}
                </span>
                <span
                  className={cn(
                    "mt-1.5 hidden truncate text-sm text-ink-foreground/75 sm:block",
                    lead && "md:mt-3 md:text-base",
                  )}
                >
                  {c.children
                    .slice(0, lead ? 5 : 3)
                    .map((s) => s.name)
                    .join(" · ")}
                </span>
                <span className="mt-2 hidden items-center gap-1.5 text-sm font-semibold text-ink-foreground sm:flex">
                  <span className="relative after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out group-hover:after:scale-x-100">
                    {t("categoryExplore")}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                  />
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
