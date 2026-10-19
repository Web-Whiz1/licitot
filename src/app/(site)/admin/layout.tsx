import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentProfile, requireUser } from "@/features/auth/session"
import { AdminTabs } from "@/features/moderation/components/admin-tabs"

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations("admin")
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 font-display text-3xl tracking-tight">{t("title")}</h1>
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
        <AdminOnly>{children}</AdminOnly>
      </Suspense>
    </div>
  )
}

/** Admins only: everyone else gets a 404 (the RPCs re-check the role anyway). */
async function AdminOnly({ children }: { children: React.ReactNode }) {
  await requireUser("/admin")
  const profile = await getCurrentProfile()
  if (profile?.role !== "admin" || profile.is_banned) notFound()
  return (
    <>
      <AdminTabs />
      <div className="pt-8">{children}</div>
    </>
  )
}
