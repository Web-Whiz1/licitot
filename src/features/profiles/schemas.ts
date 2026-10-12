import { z } from "zod"
import { displayNameSchema } from "@/features/auth/schemas"
import { msg } from "@/i18n/keys"
import { COUNTY_CODES } from "@/lib/counties"
import { normalizeRoPhone } from "@/lib/phone"

// Same rule as the `profiles.username` CHECK constraint.
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,28})[a-z0-9]$/

const optionalText = (max: number, key: Parameters<typeof msg>[0]) =>
  z
    .string()
    .trim()
    .max(max, msg(key))
    .transform((v) => (v === "" ? null : v))

export const profileSchema = z.object({
  username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN, msg("validation.username")),
  displayName: displayNameSchema,
  countyCode: z
    .union([z.enum(COUNTY_CODES, msg("validation.county")), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  city: optionalText(80, "validation.city"),
  bio: optionalText(500, "validation.bio"),
  // Optional phone: empty → null; otherwise must be a valid Romanian number (stored as E.164).
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null
      const normalized = normalizeRoPhone(v)
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: msg("validation.phone") })
        return z.NEVER
      }
      return normalized
    }),
})

export type ProfileFormInput = z.input<typeof profileSchema>
export type ProfileFormOutput = z.output<typeof profileSchema>
