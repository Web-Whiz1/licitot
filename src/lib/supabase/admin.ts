import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/env"
import { serverEnv } from "@/lib/env.server"
import type { Database } from "@/types/database"

/**
 * Service-role client: BYPASSES RLS. Only for trusted server code (rate limiting, Stripe
 * webhook, admin actions, seeding). Never pass user-controlled filters through unchecked.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
