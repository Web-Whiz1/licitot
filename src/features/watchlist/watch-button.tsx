"use client"

import { Heart } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { setWatched } from "./actions"

/** Heart toggle. `watched` undefined = session still loading; `signedIn` false → sign-in link. */
export function WatchButton({
  auctionId,
  watched,
  signedIn,
}: {
  auctionId: string
  watched: boolean | undefined
  signedIn: boolean
}) {
  const t = useTranslations()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  // Local state, updated optimistically and rolled back if the server refuses.
  const [optimistic, setOptimistic] = useState(watched ?? false)
  const label = optimistic ? t("watchlist.remove") : t("watchlist.add")
  const icon = (
    <Heart
      aria-hidden
      className={cn("size-5", optimistic && "fill-destructive text-destructive")}
    />
  )

  if (!signedIn) {
    return (
      <Button asChild variant="outline" size="icon" aria-label={t("watchlist.add")}>
        <Link href={`/autentificare?next=${encodeURIComponent(pathname)}`}>{icon}</Link>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      aria-pressed={optimistic}
      title={label}
      disabled={watched === undefined}
      onClick={() =>
        startTransition(async () => {
          const next = !optimistic
          setOptimistic(next)
          const result = await setWatched(auctionId, next)
          if (result.ok) {
            toast.success(t(result.message ?? "watchlist.added"))
          } else {
            setOptimistic(!next)
            toast.error(t(result.error))
          }
        })
      }
      data-pending={pending || undefined}
    >
      {icon}
    </Button>
  )
}
