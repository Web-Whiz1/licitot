"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { applyActionResult } from "@/components/forms/apply-action-result"
import { FieldError, FormAlert } from "@/components/forms/field-error"
import { PasswordInput } from "@/components/forms/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MessageKey } from "@/i18n/keys"
import { sendMagicLink, signInWithPassword } from "../actions"
import { emailOnlySchema, signInSchema, type EmailOnlyInput, type SignInInput } from "../schemas"
import { OrDivider } from "./auth-card"
import { GoogleButton } from "./google-button"

export function SignInForm() {
  const t = useTranslations("auth")
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined
  const linkError = searchParams.get("eroare") === "link"

  return (
    <div className="space-y-5">
      {linkError ? <FormAlert message="auth.errors.linkInvalid" /> : null}
      <GoogleButton next={next} />
      <OrDivider label={t("or")} />
      <Tabs defaultValue="password">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">{t("tabPassword")}</TabsTrigger>
          <TabsTrigger value="magic">{t("tabMagicLink")}</TabsTrigger>
        </TabsList>
        <TabsContent value="password" className="pt-4">
          <PasswordSignIn next={next} />
        </TabsContent>
        <TabsContent value="magic" className="pt-4">
          <MagicLinkSignIn next={next} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PasswordSignIn({ next }: { next?: string }) {
  const t = useTranslations("auth")
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<MessageKey>()
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined)
    startTransition(async () => {
      setFormError(applyActionResult(form, await signInWithPassword(values, next)))
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">{t("email")}</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "signin-email-error" : undefined}
          {...form.register("email")}
        />
        <FieldError id="signin-email-error" message={errors.email?.message} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">{t("password")}</Label>
          <Link
            href="/resetare-parola"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <PasswordInput
          id="signin-password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "signin-password-error" : undefined}
          {...form.register("password")}
        />
        <FieldError id="signin-password-error" message={errors.password?.message} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("signInButton")}
      </Button>
    </form>
  )
}

function MagicLinkSignIn({ next }: { next?: string }) {
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
      setFormError(applyActionResult(form, await sendMagicLink(values, next)))
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <p className="text-sm text-muted-foreground">{t("magicLinkHint")}</p>
      <div className="space-y-1.5">
        <Label htmlFor="magic-email">{t("email")}</Label>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "magic-email-error" : undefined}
          {...form.register("email")}
        />
        <FieldError id="magic-email-error" message={errors.email?.message} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("magicLinkButton")}
      </Button>
    </form>
  )
}
