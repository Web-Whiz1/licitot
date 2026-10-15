import { z } from "zod"
import { msg } from "@/i18n/keys"

// Shared by the order forms (client) and the Server Actions (server).

export const CARRIERS = [
  "Sameday",
  "FAN Courier",
  "Cargus",
  "DPD",
  "GLS",
  "Poșta Română",
  "Altul",
] as const

export const handoverSchema = z.object({
  orderId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, msg("orders.errors.handover_invalid")),
})

export const shipSchema = z.object({
  orderId: z.uuid(),
  carrier: z.enum(CARRIERS, { error: msg("orders.errors.carrier_required") }),
  trackingNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9-]{4,40}$/, msg("orders.errors.tracking_invalid"))),
})

export const DISPUTE_REASONS = ["not_received", "not_as_described", "other"] as const

export const disputeSchema = z.object({
  orderId: z.uuid(),
  reason: z.enum(DISPUTE_REASONS, { error: msg("orders.errors.dispute_reason") }),
  details: z
    .string()
    .trim()
    .min(10, msg("orders.errors.dispute_details"))
    .max(2000, msg("orders.errors.dispute_details")),
})

export const disputeResponseSchema = z.object({
  orderId: z.uuid(),
  response: z
    .string()
    .trim()
    .min(1, msg("orders.errors.dispute_details"))
    .max(2000, msg("orders.errors.dispute_details")),
})
