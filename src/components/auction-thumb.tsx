import { ImageOff } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

/** ImageKit-backed photo with its stored blur placeholder (next/image uses the global loader). */
export function AuctionThumb({
  path,
  blurDataUrl,
  alt,
  sizes,
  className,
  priority,
  noPhotoLabel,
}: {
  path: string | null | undefined
  blurDataUrl?: string | null
  alt: string
  sizes: string
  className?: string
  priority?: boolean
  noPhotoLabel: string
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {path ? (
        <Image
          src={path}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          priority={priority}
          placeholder={blurDataUrl ? "blur" : "empty"}
          blurDataURL={blurDataUrl ?? undefined}
        />
      ) : (
        <div className="grid h-full place-items-center text-muted-foreground">
          <ImageOff aria-hidden className="size-6" />
          <span className="sr-only">{noPhotoLabel}</span>
        </div>
      )}
    </div>
  )
}
