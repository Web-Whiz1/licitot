import {
  ArrowRight,
  Bell,
  CalendarDays,
  CircleCheck,
  CreditCard,
  ExternalLink,
  Gavel,
  PackageCheck,
  Pencil,
  Plus,
  Star,
  TriangleAlert,
  Truck,
  Wallet,
  type IconComponent,
} from "@/components/icons"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { requireUser } from "@/features/auth/session"
import { ACCOUNT_NAV } from "@/features/profiles/account-nav"
import { getAccountOverview } from "@/features/profiles/queries"
import { APP_LOCALE, APP_TIME_ZONE } from "@/lib/dates"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account")
  return { title: t("title"), robots: { index: false } }
}

const memberSince = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
})

type Todo = { href: string; icon: IconComponent; text: string; tone: string }

/** The account hub: who you are, what needs your attention, and every section in one place. */
export default async function AccountOverviewPage() {
  const user = await requireUser("/cont")
  const [t, o] = await Promise.all([getTranslations(), getAccountOverview(user.id)])
  const p = o.profile

  const todos: Todo[] = [
    o.ordersToPay > 0 && {
      href: "/cont/castigate",
      icon: CreditCard,
      text: t("account.overview.toPay", { count: o.ordersToPay }),
      tone: "text-warning",
    },
    o.ordersToShip > 0 && {
      href: "/cont/vandute",
      icon: Truck,
      text: t("account.overview.toShip", { count: o.ordersToShip }),
      tone: "text-primary",
    },
    o.ordersToConfirm > 0 && {
      href: "/cont/castigate",
      icon: PackageCheck,
      text: t("account.overview.toConfirm", { count: o.ordersToConfirm }),
      tone: "text-primary",
    },
    o.outbid > 0 && {
      href: "/cont/oferte",
      icon: TriangleAlert,
      text: t("account.overview.outbid", { count: o.outbid }),
      tone: "text-destructive",
    },
    o.unreadNotifications > 0 && {
      href: "/cont/notificari",
      icon: Bell,
      text: t("account.overview.unread", { count: o.unreadNotifications }),
      tone: "text-muted-foreground",
    },
    !o.payoutsActive && {
      href: "/cont/incasari",
      icon: Wallet,
      text: t("account.overview.payouts"),
      tone: "text-muted-foreground",
    },
  ].filter((x): x is Todo => Boolean(x))

  return (
    <div className="space-y-8">
      {/* ── Profile card: the public profile lives here too, no separate menu entry ── */}
      <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:flex-row sm:items-center md:p-6">
        <UserAvatar
          name={p.display_name}
          avatarPath={p.avatar_path}
          size={80}
          className="size-16 text-xl md:size-20"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate font-display text-2xl md:text-3xl">{p.display_name}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>@{p.username}</span>
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden className="size-3.5" />
              {p.rating_count > 0 && p.rating_avg !== null
                ? t("profile.rating", {
                    avg: p.rating_avg.toLocaleString(APP_LOCALE, { maximumFractionDigits: 1 }),
                    count: p.rating_count,
                  })
                : t("profile.noRating")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden className="size-3.5" />
              {t("detail.memberSince", { date: memberSince.format(new Date(p.created_at)) })}
            </span>
          </p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <Button asChild variant="outline" size="sm">
              <Link href="/cont/setari">
                <Pencil data-icon="inline-start" />
                {t("account.overview.editProfile")}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/u/${p.username}`}>
                {t("account.overview.publicProfile")}
                <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/vinde">
            <Plus data-icon="inline-start" />
            {t("nav.sell")}
          </Link>
        </Button>
      </section>

      {/* ── What needs attention ── */}
      <section aria-labelledby="todo-title" className="space-y-3">
        <h2 id="todo-title" className="text-lg font-semibold tracking-tight">
          {t("account.overview.todoTitle")}
        </h2>
        {todos.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {todos.map((todo) => (
              <li key={todo.text}>
                <Link
                  href={todo.href}
                  className="group flex h-full items-center gap-3 rounded-lg border bg-card p-4 transition-colors duration-150 ease-out hover:border-input"
                >
                  <todo.icon aria-hidden className={cn("size-5 shrink-0", todo.tone)} />
                  <span className="min-w-0 flex-1 text-sm font-medium">{todo.text}</span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-snap group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-success-soft p-4 text-sm font-medium text-success">
            <CircleCheck aria-hidden className="size-5 shrink-0" />
            {t("account.overview.allDone")}
          </p>
        )}
      </section>

      {/* ── Every section, grouped (the sidebar covers this on large screens) ── */}
      <section aria-labelledby="sections-title" className="space-y-4 lg:hidden">
        <h2 id="sections-title" className="text-lg font-semibold tracking-tight">
          {t("account.overview.sectionsTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ACCOUNT_NAV.filter((g) => g.group !== null).map(({ group, tabs }) => (
            <div key={group} className="rounded-lg border bg-card p-2">
              <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                {t(`account.groups.${group!}`)}
              </p>
              <ul>
                {tabs.map(({ href, key, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 ease-out hover:bg-muted"
                    >
                      <Icon aria-hidden className="size-4 text-primary" />
                      {t(`account.tabs.${key}`)}
                      {key === "listings" && o.activeListings > 0 ? (
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Gavel aria-hidden className="size-3" />
                          {o.activeListings}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
