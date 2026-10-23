import { Bell } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ActionButton } from "@/components/action-button"
import { requireUser } from "@/features/auth/session"
import { markAllNotificationsRead } from "@/features/notifications/actions"
import { notificationMessage } from "@/features/notifications/format"
import { getNotifications } from "@/features/notifications/queries"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications")
  return { title: t("title"), robots: { index: false } }
}

export default async function NotificationsPage() {
  const t = await getTranslations("notifications")
  const user = await requireUser("/cont/notificari")
  const items = await getNotifications(user.id)

  if (items.length === 0) {
    return <EmptyState icon={Bell} title={t("empty")} hint={t("emptyHint")} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl tracking-tight">{t("title")}</h2>
        {items.some((n) => !n.read_at) ? (
          <ActionButton action={markAllNotificationsRead} variant="outline" size="sm">
            {t("markAllRead")}
          </ActionButton>
        ) : null}
      </div>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {items.map((n) => {
          const { key, values } = notificationMessage(n)
          return (
            <li key={n.id} className={cn(!n.read_at && "bg-tint/60")}>
              <Link
                href={n.link ?? "/cont/notificari"}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted"
              >
                <span className="text-sm">
                  {!n.read_at ? (
                    <span className="mr-2 rounded-sm bg-primary px-1.5 py-0.5 text-[0.625rem] font-bold text-primary-foreground uppercase">
                      {t("new")}
                    </span>
                  ) : null}
                  {t(`types.${key}`, values)}
                </span>
                <time dateTime={n.created_at} className="text-xs text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </time>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
