import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Anonymous client without cookies, for public data inside `"use cache"` functions
 * (cookies can't be read there). RLS applies as the `anon` role.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
