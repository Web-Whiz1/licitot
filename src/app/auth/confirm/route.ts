import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { safeNextPath } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]

/**
 * token_hash verification used by the custom LiciTot email templates (supabase/templates).
 * Unlike the PKCE `code` flow, it works when the link is opened on a different device.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNextPath(searchParams.get("next"))

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, origin))
    console.error("[auth/confirm]", error.code, error.message)
  }

  return NextResponse.redirect(new URL("/autentificare?eroare=link", origin))
}
