import { z } from "zod"

// Romanian phone numbers, normalized to E.164 (+40XXXXXXXXX).
// Accepts: 0722 123 456, 0722-123-456, +40 722 123 456, 0040722123456, 021 123 4567.
// Valid national numbers have 9 digits after the trunk prefix and start with 2, 3 (fixed) or 7 (mobile).

const NATIONAL = /^[237]\d{8}$/

export function normalizeRoPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "")
  let national: string
  if (digits.startsWith("+40")) national = digits.slice(3)
  else if (digits.startsWith("0040")) national = digits.slice(4)
  else if (digits.startsWith("0")) national = digits.slice(1)
  else return null
  return NATIONAL.test(national) ? `+40${national}` : null
}

export function isRoMobile(e164: string): boolean {
  return /^\+407\d{8}$/.test(e164)
}

/** "+40722123456" → "+40 722 123 456" */
export function formatRoPhone(e164: string): string {
  const m = /^\+40(\d{3})(\d{3})(\d{3})$/.exec(e164)
  return m ? `+40 ${m[1]} ${m[2]} ${m[3]}` : e164
}

/** Zod schema: validates and transforms to E.164. */
export const roPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeRoPhone(value)
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "validation.phone" })
      return z.NEVER
    }
    return normalized
  })
