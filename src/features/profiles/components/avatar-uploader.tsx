"use client"

import { Camera, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { uploadImage, UploadError } from "@/features/media/upload-image"
import { updateAvatar } from "../actions"

export function AvatarUploader({ name, avatarPath }: { name: string; avatarPath: string | null }) {
  const t = useTranslations("avatar")
  const tAll = useTranslations()
  const router = useRouter()
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [pending, startTransition] = useTransition()

  const save = (value: Parameters<typeof updateAvatar>[0]) =>
    startTransition(async () => {
      const result = await updateAvatar(value)
      if (result.ok) {
        if (result.message) toast.success(tAll(result.message))
        router.refresh()
      } else {
        toast.error(tAll(result.error))
      }
    })

  const onFile = async (file: File) => {
    setBusy(true)
    try {
      const uploaded = await uploadImage(file, "avatar")
      save({ fileId: uploaded.fileId, path: uploaded.path })
    } catch (err) {
      toast.error(
        tAll(
          err instanceof UploadError && err.code === "rate_limited"
            ? "sell.errors.rate_limited"
            : "sell.photoFailed",
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const working = busy || pending

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name} avatarPath={avatarPath} size={80} className="size-20 text-xl" />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" aria-disabled={working}>
          <label htmlFor={inputId} className="cursor-pointer">
            {working ? <Loader2 className="animate-spin" /> : <Camera />}
            {working ? t("uploading") : t("change")}
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={working}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) void onFile(file)
              }}
            />
          </label>
        </Button>
        {avatarPath ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={working}
            onClick={() => save(null)}
          >
            <Trash2 />
            {t("remove")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
