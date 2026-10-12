import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { publicEnv } from "@/lib/env"
import { safeNextPath } from "@/lib/site"
import type { Database } from "@/types/database"

/** Routes that require a session. The pages re-check on the server; this is the fast path. */
const PROTECTED_PREFIXES = ["/cont", "/vinde", "/admin", "/parola-noua"]

/** Sign-in pages a signed-in user doesn't need. */
const GUEST_ONLY = ["/autentificare", "/inregistrare"]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Refreshes the Supabase session cookie on every matched request and redirects anonymous
 * visitors away from protected routes. Must return the response that `setAll` built, so
 * refreshed cookies (and the no-cache headers Supabase sends with them) reach the browser.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )

  // Validates the JWT (locally via JWKS with asymmetric keys) and refreshes it if needed.
  // Don't run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims?.sub)

  if (!isSignedIn && isProtected(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/autentificare"
    url.search = ""
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
    const redirect = NextResponse.redirect(url)
    // Keep any refreshed/cleared auth cookies on the redirect.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }

  if (isSignedIn && GUEST_ONLY.includes(request.nextUrl.pathname)) {
    const target = safeNextPath(request.nextUrl.searchParams.get("next"))
    const redirect = NextResponse.redirect(new URL(target, request.url))
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }

  return response
}
