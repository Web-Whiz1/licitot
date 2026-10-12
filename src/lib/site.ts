import { publicEnv } from "@/lib/env"

// Public, non-secret site configuration. Server secrets live in src/lib/env.server.ts.
export const SITE_URL = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
export const SITE_NAME = "LiciTot"

/** Only allow same-site relative redirects ("/cont"), never "//evil.com" or absolute URLs. */
export function safeNextPath(next: string | null | undefined, fallback = "/cont"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback
  }
  return next
}
