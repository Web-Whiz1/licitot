"use server"

import { updateTag } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import { isOwnPath } from "@/lib/imagekit"
import { deleteFileByPath, verifyUploadedImage } from "@/lib/imagekit.server"
import { createClient } from "@/lib/supabase/server"
import { profileTag } from "./queries"
import { profileSchema, type ProfileFormInput } from "./schemas"

export async function updateProfile(input: ProfileFormInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic", zodFieldErrors(parsed.error))
  const { username, displayName, countyCode, city, bio, phone } = parsed.data

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return fail("auth.errors.generic")

  const { data: before } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single()

  // RLS + column grants guarantee only these fields of the user's own row can change.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ username, display_name: displayName, county_code: countyCode, city, bio })
    .eq("id", userId)

  if (profileError) {
    if (profileError.code === "23505") {
      return fail("validation.usernameTaken", { username: "validation.usernameTaken" })
    }
    console.error("[profiles.update]", profileError.code, profileError.message)
    return fail("auth.errors.generic")
  }

  const { error: privateError } = await supabase
    .from("profiles_private")
    .update({ phone })
    .eq("id", userId)
  if (privateError) {
    console.error("[profiles_private.update]", privateError.code, privateError.message)
    return fail("auth.errors.generic")
  }

  // Refresh the cached public profile under both the old and the new username.
  updateTag(profileTag(username))
  if (before?.username && before.username !== username) updateTag(profileTag(before.username))

  return { ok: true, message: "settings.saved" }
}

const avatarSchema = z
  .object({ fileId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), path: z.string().max(300) })
  .nullable()

/** Sets (or clears, with null) the profile photo. The old ImageKit file is deleted afterwards. */
export async function updateAvatar(input: z.input<typeof avatarSchema>): Promise<ActionResult> {
  const parsed = avatarSchema.safeParse(input)
  if (!parsed.success) return fail("auth.errors.generic")

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return fail("auth.errors.generic")

  const next = parsed.data
  if (next) {
    const ok =
      isOwnPath(next.path, "avatar", userId) && (await verifyUploadedImage(next.fileId, next.path))
    if (!ok) return fail("sell.errors.images_invalid")
  }

  const { data: before } = await supabase
    .from("profiles")
    .select("username, avatar_path")
    .eq("id", userId)
    .single()

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: next?.path ?? null })
    .eq("id", userId)
  if (error) {
    console.error("[profiles.avatar]", error.code, error.message)
    return fail("auth.errors.generic")
  }

  if (before?.username) updateTag(profileTag(before.username))
  const old = before?.avatar_path
  if (old && old !== next?.path) after(() => deleteFileByPath(old))

  return { ok: true, message: next ? "avatar.saved" : "avatar.removed" }
}
