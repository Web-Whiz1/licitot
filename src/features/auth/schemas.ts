import { z } from "zod"
import { msg } from "@/i18n/keys"

// Messages are dictionary keys (see src/i18n/keys.ts); <FieldError/> translates them.

// Normalize first, then validate (z.email() alone would reject " Ana@Example.ro ").
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email(msg("validation.email")).max(254, msg("validation.email")))

// Mirrors supabase/config.toml: minimum_password_length = 8, password_requirements = letters_digits.
export const passwordSchema = z
  .string()
  .min(8, msg("validation.passwordMin"))
  .max(72, msg("validation.passwordMax"))
  .regex(/[A-Za-z]/, msg("validation.passwordWeak"))
  .regex(/\d/, msg("validation.passwordWeak"))

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, msg("validation.displayName"))
  .max(50, msg("validation.displayName"))

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, msg("validation.required")),
})

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.boolean().refine((v) => v, msg("validation.terms")),
})

export const emailOnlySchema = z.object({ email: emailSchema })

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: msg("validation.passwordMismatch"),
  })

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.input<typeof signUpSchema>
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>
export type NewPasswordInput = z.infer<typeof newPasswordSchema>
