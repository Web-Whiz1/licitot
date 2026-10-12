import { CalendarDays, Gavel, MapPin, Star } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { AuctionGrid } from "@/features/auctions/components/auction-card"
import { getSellerAuctions } from "@/features/auctions/listing"
import { EmptyState } from "@/features/profiles/components/empty-state"
import { getPublicProfile } from "@/features/profiles/queries"
import { USERNAME_PATTERN } from "@/features/profiles/schemas"
import { APP_LOCALE, APP_TIME_ZONE } from "@/lib/dates"

const memberSinceFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
})

async function load(username: string) {
  const normalized = decodeURIComponent(username).toLowerCase()
  if (!USERNAME_PATTERN.test(normalized)) return null
  return getPublicProfile(normalized)
}

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params
  const profile = await load(username)
  if (!profile) return { title: (await getTranslations("profile"))("notFoundTitle") }
  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio ?? undefined,
    alternates: { canonical: `/u/${profile.username}` },
  }
}

export default function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </div>
  )
}

async function Profile({ params }: Pick<PageProps<"/u/[username]">, "params">) {
  const { username } = await params
  const profile = await load(username)
  if (!profile) notFound()
  const t = await getTranslations("profile")

  const location = [profile.city, profile.county?.name].filter(Boolean).join(", ")

  return (
    <>
      <header className="flex flex-col gap-5 rounded-2xl bg-sky-soft p-6 sm:flex-row sm:items-center md:p-8">
        <UserAvatar
          name={profile.display_name}
          avatarPath={profile.avatar_path}
          size={80}
          className="size-20 text-2xl"
        />
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight break-words">
            {profile.display_name}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {location ? (
              <li className="flex items-center gap-1.5">
                <MapPin aria-hidden className="size-4 text-primary" /> {location}
              </li>
            ) : null}
            <li className="flex items-center gap-1.5">
              <CalendarDays aria-hidden className="size-4 text-primary" />
              {t("memberSince", {
                date: memberSinceFormatter.format(new Date(profile.created_at)),
              })}
            </li>
            <li className="flex items-center gap-1.5">
              <Star aria-hidden className="size-4 text-primary" />
              {profile.rating_count > 0 && profile.rating_avg !== null
                ? t("rating", {
                    avg: profile.rating_avg.toLocaleString(APP_LOCALE, {
                      maximumFractionDigits: 1,
                    }),
                    count: profile.rating_count,
                  })
                : t("noRating")}
            </li>
          </ul>
        </div>
      </header>

      {profile.bio ? <p className="mt-6 max-w-2xl whitespace-pre-line">{profile.bio}</p> : null}

      <section aria-labelledby="active-title" className="mt-10">
        <h2 id="active-title" className="mb-4 text-2xl font-bold tracking-tight">
          {t("activeListings")}
        </h2>
        <SellerListings sellerId={profile.id} emptyLabel={t("noListings")} />
      </section>

      <section aria-labelledby="reviews-title" className="mt-10">
        <h2 id="reviews-title" className="mb-4 text-2xl font-bold tracking-tight">
          {t("reviews")}
        </h2>
        <EmptyState icon={Star} title={t("noReviews")} />
      </section>
    </>
  )
}

async function SellerListings({ sellerId, emptyLabel }: { sellerId: string; emptyLabel: string }) {
  const items = await getSellerAuctions(sellerId)
  return items.length ? (
    <AuctionGrid auctions={items} />
  ) : (
    <EmptyState icon={Gavel} title={emptyLabel} />
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-sky-soft p-6 md:p-8" aria-hidden>
      <Skeleton className="size-20 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  )
}
