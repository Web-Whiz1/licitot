import "server-only"
import { z } from "zod"

// Server-only secrets. Parsed lazily so builds don't need runtime-only secrets.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
  IMAGEKIT_PRIVATE_KEY: z.string().startsWith("private_"),
  // Optional so a missing Stripe key only disables payments, not the whole server.
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/)
    .optional(),
  // Signing secrets of the two webhook endpoints (platform events, Connect account events).
  // Optional: payments are also confirmed when the buyer returns from Checkout.
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  // Shared secret of the scheduled job that settles orders (POST /api/cron/orders).
  CRON_SECRET: z.string().min(32).optional(),
  // Email notifications (Resend). Both must be set; the sender needs a verified domain.
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().min(3).optional(),
})

let cached: z.infer<typeof serverSchema> | undefined

export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  })
  return cached
}
