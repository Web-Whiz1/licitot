import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { publicEnv } from "@/lib/env"
import { imagekitUrl } from "@/lib/imagekit"
import { cn } from "@/lib/utils"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? [parts[0]![0], parts.at(-1)![0]] : [parts[0]?.[0], parts[0]?.[1]]
  return letters.filter(Boolean).join("").toUpperCase() || "?"
}

/** Profile photo from ImageKit (square crop), falling back to initials. */
export function UserAvatar({
  name,
  avatarPath,
  size = 64,
  className,
}: {
  name: string
  avatarPath?: string | null
  /** Rendered pixel size used to request the right image width (doubled for retina). */
  size?: number
  className?: string
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      {avatarPath ? (
        <AvatarImage
          src={imagekitUrl(publicEnv.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT, avatarPath, {
            width: size * 2,
            height: size * 2,
          })}
          alt=""
          className="object-cover"
        />
      ) : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
