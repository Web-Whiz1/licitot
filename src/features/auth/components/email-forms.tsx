"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError, FormAlert } from "@/components/forms/field-error"
import { PasswordInput } from "@/components/forms/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MessageKey } from "@/i18n/keys"
import { requestPasswordReset, updatePassword } from "../actions"
import {
  emailOnlySchema,
  newPasswordSchema,
  type EmailOnlyInput,
  type NewPasswordInput,
} from "../schemas"

export function ResetPasswordForm() {
  const t = useTranslations("auth")
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<MessageKey>()
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined)
    startTransition(async () => {
      setFormError(applyActionResult(form, await requestPasswordReset(values)))
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">{t("email")}</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "reset-email-error" : undefined}
          {...form.register("email")}
        />
        <FieldError id="reset-email-error" message={errors.email?.message} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("resetButton")}
      </Button>
    </form>
  )
}

export function NewPasswordForm() {
  const t = useTranslations("auth")
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<MessageKey>()
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined)
    startTransition(async () => {
      setFormError(applyActionResult(form, await updatePassword(values)))
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <div className="space-y-1.5">
        <Label htmlFor="new-password">{t("newPassword")}</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby="new-password-hint new-password-error"
          {...form.register("password")}
        />
        <p id="new-password-hint" className="text-xs text-muted-foreground">
          {t("passwordHint")}
        </p>
        <FieldError id="new-password-error" message={errors.password?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
          {...form.register("confirm")}
        />
        <FieldError id="confirm-password-error" message={errors.confirm?.message} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("newPasswordButton")}
      </Button>
    </form>
  )
}
