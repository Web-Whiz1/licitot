import "server-only"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

/** Best-effort client IP. App Hosting / Cloud Run put the client first in X-Forwarded-For. */
export async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || h.get("x-real-ip") || "unknown"
}

type Rule = { key: string; limit: number; windowSeconds: number }

/**
 * Returns true if every rule is within its limit. Counters live in Postgres
 * (private.rate_limits, service-role only). Fails open if the limiter itself errors,
 * so an infrastructure hiccup doesn't lock everyone out; Supabase Auth has its own limits too.
 */
export async function rateLimit(...rules: Rule[]): Promise<boolean> {
  const supabase = createAdminClient()
  const results = await Promise.all(
    rules.map((r) =>
      supabase.rpc("rate_limit_hit", {
        p_key: r.key,
        p_limit: r.limit,
        p_window_seconds: r.windowSeconds,
      }),
    ),
  )
  for (const { data, error } of results) {
    if (error) {
      console.error("[rate-limit]", error.message)
      continue
    }
    if (data === false) return false
  }
  return true
}
