import { ArrowRight } from "@/components/icons"
import Image from "next/image"
import Link from "next/link"
import { CategoryIcon } from "@/features/auctions/components/category-icon"
import type { CategoryGroup } from "@/features/auctions/queries"
import { CATEGORY_PHOTOS } from "../category-photos"

/** Home page categories: a photo of a typical object, the name in the serif, a few aisles. */
export function CategoryCards({ tree }: { tree: CategoryGroup[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {tree.map((c) => {
        const photo = CATEGORY_PHOTOS[c.slug]
        return (
          <li key={c.slug}>
            <Link
              href={`/categorie/${c.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-150 ease-out hover:border-input"
            >
              <span className="relative block aspect-[4/3] overflow-hidden bg-tint">
                {photo ? (
                  <Image
                    src={photo}
                    alt=""
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1440px) 340px, (min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                ) : (
                  <CategoryIcon
                    name={c.icon}
                    className="absolute top-1/2 left-1/2 size-12 -translate-1/2 text-primary"
                  />
                )}
              </span>
              <span className="flex flex-1 items-center justify-between gap-3 px-3.5 py-3 md:px-5 md:py-4">
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight md:text-xl">
                    {c.name}
                  </span>
                  <span className="mt-0.5 hidden truncate text-sm text-muted-foreground sm:block">
                    {c.children
                      .slice(0, 3)
                      .map((s) => s.name)
                      .join(" · ")}
                  </span>
                </span>
                <span className="hidden size-9 shrink-0 place-items-center rounded-md border text-primary transition-colors duration-150 ease-out group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground sm:grid">
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
