import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { uploadFolder } from "@/lib/imagekit"
import { createUploadAuth } from "@/lib/imagekit.server"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

const bodySchema = z.object({ purpose: z.enum(["auction", "avatar"]) })

/**
 * Issues signed ImageKit upload parameters to signed-in users. The folder is decided here,
 * per user; files outside it are rejected when an auction or avatar is saved.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 })

  const allowed = await rateLimit({ key: `upload:user:${userId}`, limit: 120, windowSeconds: 3600 })
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 })

  return NextResponse.json(
    { ...createUploadAuth(), folder: uploadFolder(parsed.data.purpose, userId) },
    { headers: { "Cache-Control": "no-store" } },
  )
}
