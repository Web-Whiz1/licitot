import "server-only"
import { z } from "zod"

// Server-only secrets. Parsed lazily so builds don't need runtime-only secrets.
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
  IMAGEKIT_PRIVATE_KEY: z.string().startsWith("private_"),
})

let cached: z.infer<typeof serverSchema> | undefined

export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
  })
  return cached
}
