import { z } from "zod"
import { msg } from "@/i18n/keys"

export const REPORT_REASONS = ["fake", "prohibited", "scam", "offensive", "other"] as const

/** A report targets exactly one listing or one profile. */
export const reportSchema = z
  .object({
    auctionId: z.uuid().optional(),
    userId: z.uuid().optional(),
    reason: z.enum(REPORT_REASONS, { error: msg("reports.errors.reason") }),
    details: z.string().trim().max(1000, msg("reports.errors.details")),
  })
  .refine((v) => Boolean(v.auctionId) !== Boolean(v.userId), {
    message: msg("reports.errors.report_invalid"),
  })
