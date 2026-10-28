import Image, { type StaticImageData } from "next/image"
import { cn } from "@/lib/utils"

/**
 * The site's photo tile: a photograph filling a rounded panel, a dark shade where the type sits,
 * and a hairline mount inside the edge (like a print in a passe-partout). Text inside uses the
 * ink tokens. Put it inside a sized box; wrap it in a link and add `group` for the hover zoom.
 */
export function PhotoTile({
  src,
  sizes,
  focus,
  shade = "up",
  priority,
  className,
  children,
}: {
  src: StaticImageData
  sizes: string
  /** CSS object-position, for photos whose subject is off-centre. */
  focus?: string
  /** Where the shade is deepest: under the text at the foot, or on the left. */
  shade?: "up" | "left" | "none"
  priority?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "relative isolate size-full overflow-hidden rounded-lg bg-ink text-ink-foreground",
        className,
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        placeholder="blur"
        priority={priority}
        sizes={sizes}
        style={focus ? { objectPosition: focus } : undefined}
        className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      {shade !== "none" ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10",
            shade === "up"
              ? "bg-linear-to-t from-ink/90 via-ink/30 to-ink/0"
              : "bg-linear-to-r from-ink/90 via-ink/55 to-ink/0",
          )}
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-md border border-ink-foreground/15 transition-colors duration-300 ease-out group-hover:border-ink-foreground/35 md:inset-2.5"
      />
      {children}
    </div>
  )
}
