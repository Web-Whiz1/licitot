import { ExternalLink, KeyRound, LogOut } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { QueryToast } from "@/components/query-toast"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { signOut } from "@/features/auth/actions"
import { requireUser } from "@/features/auth/session"
import { AvatarUploader } from "@/features/profiles/components/avatar-uploader"
import { ProfileForm } from "@/features/profiles/components/profile-form"
import { getMySettings } from "@/features/profiles/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.tabs")
  return { title: t("settings"), robots: { index: false } }
}

export default async function SettingsPage() {
  const t = await getTranslations()
  const user = await requireUser("/cont/setari")
  const settings = await getMySettings(user.id)

  return (
    <div className="space-y-10">
      <QueryToast param="parola" value="ok" message="settings.passwordChanged" />
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/u/${settings.username}`}>
            {t("settings.viewProfile")}
            <ExternalLink data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <AvatarUploader name={settings.display_name} avatarPath={settings.avatar_path} />

      <ProfileForm initial={settings} />

      <Separator />

      <section aria-labelledby="security-title" className="space-y-4">
        <h2 id="security-title" className="text-lg font-semibold">
          {t("settings.securityTitle")}
        </h2>
        <dl className="text-sm">
          <dt className="text-muted-foreground">{t("settings.emailLabel")}</dt>
          <dd className="font-medium">{user.email}</dd>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/parola-noua">
              <KeyRound data-icon="inline-start" />
              {t("settings.changePassword")}
            </Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="destructive">
              <LogOut data-icon="inline-start" />
              {t("auth.signOut")}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
