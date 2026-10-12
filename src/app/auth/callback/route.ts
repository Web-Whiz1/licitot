import { NextResponse, type NextRequest } from "next/server"
import { safeNextPath } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"

/**
 * PKCE callback for OAuth (Google) and the default Supabase email links
 * (confirmation, magic link, recovery): exchanges `?code=` for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeNextPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
    console.error("[auth/callback]", error.code, error.message)
  }

  return NextResponse.redirect(new URL("/autentificare?eroare=link", origin))
}
