"use server"

import type { AuthError } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import type { MessageKey } from "@/i18n/keys"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { safeNextPath, SITE_URL } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"
import {
  emailOnlySchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  type EmailOnlyInput,
  type NewPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "./schemas"

const MIN = 60
const HOUR = 3600

function authErrorKey(error: AuthError): MessageKey {
  switch (error.code) {
    case "invalid_credentials":
      return "auth.errors.invalidCredentials"
    case "email_not_confirmed":
      return "auth.errors.emailNotConfirmed"
    case "weak_password":
      return "auth.errors.weakPassword"
    case "same_password":
      return "auth.errors.samePassword"
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "auth.errors.rateLimited"
    case "provider_disabled":
      return "auth.errors.googleDisabled"
    default:
      console.error("[auth]", error.code, error.message)
      return "auth.errors.generic"
  }
}

const callbackUrl = (next: string) =>
  `${SITE_URL}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`

const checkEmail = (mode: "signup" | "magic" | "reset", email: string) =>
  `/verifica-emailul?mod=${mode}&email=${encodeURIComponent(email)}`

export async function signInWithPassword(input: SignInInput, next?: string): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))
  const { email, password } = parsed.data

  const ip = await clientIp()
  const allowed = await rateLimit(
    { key: `signin:ip:${ip}`, limit: 20, windowSeconds: 5 * MIN },
    { key: `signin:email:${email}`, limit: 8, windowSeconds: 5 * MIN },
  )
  if (!allowed) return fail("auth.errors.rateLimited")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return fail(authErrorKey(error))

  redirect(safeNextPath(next))
}

export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))
  const { email, password, displayName } = parsed.data

  const ip = await clientIp()
  if (!(await rateLimit({ key: `signup:ip:${ip}`, limit: 5, windowSeconds: HOUR }))) {
    return fail("auth.errors.rateLimited")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: callbackUrl("/cont"),
    },
  })
  if (error) return fail(authErrorKey(error))

  // Supabase answers the same way for already-registered emails (no enumeration), so do we.
  redirect(checkEmail("signup", email))
}

export async function sendMagicLink(input: EmailOnlyInput, next?: string): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))
  const { email } = parsed.data

  const ip = await clientIp()
  const allowed = await rateLimit(
    { key: `otp:ip:${ip}`, limit: 10, windowSeconds: HOUR },
    { key: `otp:email:${email}`, limit: 3, windowSeconds: 15 * MIN },
  )
  if (!allowed) return fail("auth.errors.rateLimited")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(next ?? "/cont"), shouldCreateUser: true },
  })
  if (error) return fail(authErrorKey(error))

  redirect(checkEmail("magic", email))
}

export async function signInWithGoogle(next?: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next ?? "/cont") },
  })
  if (error || !data.url) return fail(error ? authErrorKey(error) : "auth.errors.generic")

  // The provider check only happens on Supabase's side after the redirect; probe it so a
  // disabled provider shows a friendly message instead of a raw JSON error page.
  const probe = await fetch(data.url, { redirect: "manual" })
  if (probe.status >= 400) return fail("auth.errors.googleDisabled")

  redirect(data.url)
}

export async function requestPasswordReset(input: EmailOnlyInput): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))
  const { email } = parsed.data

  const ip = await clientIp()
  const allowed = await rateLimit(
    { key: `reset:ip:${ip}`, limit: 5, windowSeconds: HOUR },
    { key: `reset:email:${email}`, limit: 3, windowSeconds: HOUR },
  )
  if (!allowed) return fail("auth.errors.rateLimited")

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl("/parola-noua"),
  })
  // Don't reveal whether the account exists; only surface rate limiting.
  if (error && authErrorKey(error) === "auth.errors.rateLimited") {
    return fail("auth.errors.rateLimited")
  }

  redirect(checkEmail("reset", email))
}

export async function updatePassword(input: NewPasswordInput): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect("/autentificare?next=/parola-noua")

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return fail(authErrorKey(error))

  redirect("/cont/setari?parola=ok")
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
