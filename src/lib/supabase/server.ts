import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { publicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Supabase client acting as the signed-in user (RLS applies). For Server Components,
 * Server Actions and Route Handlers. Reads cookies, so the calling tree is dynamic —
 * wrap it in <Suspense> under Cache Components.
 */
export async function createClient() {
  // Session code is request-time only: auth-js reads the clock (token expiry) and Partial
  // Prefetching would otherwise try to prerender it with the user's cookies.
  await connection()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component, where cookies are read-only. Safe to ignore:
            // the proxy refreshes the session on every request.
          }
        },
      },
    },
  )
}
