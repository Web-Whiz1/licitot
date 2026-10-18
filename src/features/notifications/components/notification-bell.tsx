"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from "@/lib/dates"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { markAllNotificationsRead, markNotificationRead } from "../actions"
import { notificationMessage, type NotificationRow } from "../format"

/** Header bell: unread count, latest notifications, live updates (Realtime, own rows only). */
export function NotificationBell({
  userId,
  initialItems,
  initialUnread,
}: {
  userId: string
  initialItems: NotificationRow[]
  initialUnread: number
}) {
  const t = useTranslations("notifications")
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [unread, setUnread] = useState(initialUnread)
  const text = (n: NotificationRow) => {
    const { key, values } = notificationMessage(n)
    return t(`types.${key}`, values)
  }

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    void (async () => {
      // Realtime applies RLS with the token it holds: set the signed-in token before
      // subscribing, otherwise the connection is anonymous and private rows never arrive.
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const n = payload.new as NotificationRow
            setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 8))
            setUnread((c) => c + 1)
            const { key, values } = notificationMessage(n)
            toast(t(`types.${key}`, values), {
              action: n.link
                ? { label: t("open"), onClick: () => router.push(n.link!) }
                : undefined,
            })
          },
        )
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [userId, router, t])

  const open = (n: NotificationRow) => {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)),
      )
      setUnread((c) => Math.max(0, c - 1))
      void markNotificationRead(n.id)
    }
  }

  const label = unread > 0 ? t("bellUnread", { count: unread }) : t("bellLabel")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label} title={label}>
          <Bell aria-hidden className="size-5" />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-4.5 font-bold text-primary-foreground tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">{t("title")}</DropdownMenuLabel>
          {unread > 0 ? (
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0"
              onClick={() => {
                setUnread(0)
                setItems((prev) =>
                  prev.map((p) => ({ ...p, read_at: p.read_at ?? new Date().toISOString() })),
                )
                void markAllNotificationsRead()
              }}
            >
              {t("markAllRead")}
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                asChild
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-none px-3 py-2.5 whitespace-normal",
                  !n.read_at && "bg-sky-soft/60",
                )}
              >
                <Link href={n.link ?? "/cont/notificari"} onClick={() => open(n)}>
                  <span className="text-sm leading-snug">
                    {!n.read_at ? (
                      <span className="mr-1.5 inline-block size-2 rounded-full bg-primary align-middle" />
                    ) : null}
                    {text(n)}
                  </span>
                  <time dateTime={n.created_at} className="text-xs text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </time>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          asChild
          className="justify-center rounded-none py-2.5 font-medium text-primary"
        >
          <Link href="/cont/notificari">{t("seeAll")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
