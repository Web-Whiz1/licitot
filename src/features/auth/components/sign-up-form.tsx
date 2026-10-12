"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError, FormAlert } from "@/components/forms/field-error"
import { PasswordInput } from "@/components/forms/password-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MessageKey } from "@/i18n/keys"
import { signUp } from "../actions"
import { signUpSchema, type SignUpInput } from "../schemas"
import { OrDivider } from "./auth-card"
import { GoogleButton } from "./google-button"

// Rich-text renderer for t.rich(): a plain function returning JSX, not a component.
function termsLink(href: string) {
  return function renderTermsLink(chunks: React.ReactNode) {
    return (
      <Link
        href={href}
        target="_blank"
        className="font-medium text-primary underline underline-offset-4"
      >
        {chunks}
      </Link>
    )
  }
}

export function SignUpForm() {
  const t = useTranslations("auth")
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<MessageKey>()
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "", acceptTerms: false },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined)
    startTransition(async () => {
      setFormError(applyActionResult(form, await signUp(values)))
    })
  })

  return (
    <div className="space-y-5">
      <GoogleButton />
      <OrDivider label={t("or")} />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">{t("displayName")}</Label>
          <Input
            id="signup-name"
            autoComplete="name"
            aria-invalid={!!errors.displayName}
            aria-describedby="signup-name-hint signup-name-error"
            {...form.register("displayName")}
          />
          <p id="signup-name-hint" className="text-xs text-muted-foreground">
            {t("displayNameHint")}
          </p>
          <FieldError id="signup-name-error" message={errors.displayName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-email">{t("email")}</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="signup-email-error" message={errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password">{t("password")}</Label>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby="signup-password-hint signup-password-error"
            {...form.register("password")}
          />
          <p id="signup-password-hint" className="text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
          <FieldError id="signup-password-error" message={errors.password?.message} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-start gap-3">
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="signup-terms"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.acceptTerms}
                  aria-describedby={errors.acceptTerms ? "signup-terms-error" : undefined}
                />
              )}
            />
            <Label htmlFor="signup-terms" className="block text-sm leading-snug font-normal">
              {t.rich("acceptTerms", {
                terms: termsLink("/termeni"),
                privacy: termsLink("/confidentialitate"),
              })}
            </Label>
          </div>
          <FieldError id="signup-terms-error" message={errors.acceptTerms?.message} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {t("signUpButton")}
        </Button>
      </form>
    </div>
  )
}
