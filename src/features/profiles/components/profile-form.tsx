"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { BadgeCheck } from "@/components/icons"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError, FormAlert } from "@/components/forms/field-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { MessageKey } from "@/i18n/keys"
import { COUNTIES } from "@/lib/counties"
import { formatRoPhone } from "@/lib/phone"
import { updateProfile } from "../actions"
import { profileSchema, type ProfileFormInput, type ProfileFormOutput } from "../schemas"

type Props = {
  initial: {
    username: string
    display_name: string
    county_code: string | null
    city: string | null
    bio: string | null
    phone: string | null
    phone_verified_at: string | null
  }
}

export function ProfileForm({ initial }: Props) {
  const t = useTranslations("settings")
  const tAll = useTranslations()
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<MessageKey>()
  const form = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initial.username,
      displayName: initial.display_name,
      // DB guarantees a valid code via the counties FK.
      countyCode: (initial.county_code ?? "") as ProfileFormInput["countyCode"],
      city: initial.city ?? "",
      bio: initial.bio ?? "",
      phone: initial.phone ? formatRoPhone(initial.phone) : "",
    },
  })
  const { errors } = form.formState
  const username = useWatch({ control: form.control, name: "username" })

  const onSubmit = form.handleSubmit(() => {
    setFormError(undefined)
    // Send the raw inputs; the action re-validates and normalizes with the same schema.
    const values = form.getValues()
    startTransition(async () => {
      const result = await updateProfile(values)
      const error = applyActionResult(form, result)
      setFormError(error)
      if (result.ok && result.message) {
        toast.success(tAll(result.message))
        form.reset(values)
      }
    })
  })

  const field = (name: keyof ProfileFormInput) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `profile-${name}-error` : undefined,
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <FormAlert message={formError} />

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-semibold">{t("profileTitle")}</legend>
        <p className="-mt-3 text-sm text-muted-foreground">{t("profileSubtitle")}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-displayName">{tAll("auth.displayName")}</Label>
            <Input
              id="profile-displayName"
              autoComplete="name"
              {...field("displayName")}
              {...form.register("displayName")}
            />
            <FieldError id="profile-displayName-error" message={errors.displayName?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-username">{t("username")}</Label>
            <Input
              id="profile-username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              {...field("username")}
              aria-describedby={`profile-username-hint${errors.username ? " profile-username-error" : ""}`}
              {...form.register("username")}
            />
            <p id="profile-username-hint" className="text-xs text-muted-foreground">
              {t("usernameHint", { username: username || "…" })}
            </p>
            <FieldError id="profile-username-error" message={errors.username?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-countyCode">{t("county")}</Label>
            <NativeSelect
              id="profile-countyCode"
              {...field("countyCode")}
              {...form.register("countyCode")}
            >
              <option value="">{t("countyPlaceholder")}</option>
              {COUNTIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="profile-countyCode-error" message={errors.countyCode?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-city">{t("city")}</Label>
            <Input
              id="profile-city"
              autoComplete="address-level2"
              {...field("city")}
              {...form.register("city")}
            />
            <FieldError id="profile-city-error" message={errors.city?.message} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-bio">{t("bio")}</Label>
          <Textarea
            id="profile-bio"
            rows={4}
            maxLength={500}
            placeholder={t("bioPlaceholder")}
            {...field("bio")}
            {...form.register("bio")}
          />
          <FieldError id="profile-bio-error" message={errors.bio?.message} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-semibold">{t("privateTitle")}</legend>
        <p className="-mt-3 text-sm text-muted-foreground">{t("privateSubtitle")}</p>
        <div className="max-w-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="profile-phone">{t("phone")}</Label>
            {initial.phone ? (
              initial.phone_verified_at ? (
                <Badge variant="success">
                  <BadgeCheck /> {t("phoneVerified")}
                </Badge>
              ) : (
                <Badge variant="outline">{t("phoneUnverified")}</Badge>
              )
            ) : null}
          </div>
          <Input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0722 123 456"
            {...field("phone")}
            {...form.register("phone")}
          />
          <FieldError id="profile-phone-error" message={errors.phone?.message} />
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending || !form.formState.isDirty}>
        {t("save")}
      </Button>
    </form>
  )
}
