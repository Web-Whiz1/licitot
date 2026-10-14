import { z } from "zod"

// Public env (inlined into the client bundle). Each NEXT_PUBLIC_* var must be referenced
// literally so Next.js can inline it.
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z
    .url()
    .startsWith("https://ik.imagekit.io/")
    .transform((v) => v.replace(/\/$/, "")),
  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: z.string().startsWith("public_"),
  // Optional until payments are configured (Phase 6). pk_test_ → sandbox, shown in the UI.
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/)
    .optional(),
})

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined,
})

/** Stripe runs in sandbox (test) mode: no real money moves, and the UI must say so. */
export const isPaymentsTestMode =
  publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ?? false
