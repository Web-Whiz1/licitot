"use server"

import { z } from "zod"
import { getCurrentUser } from "@/features/auth/session"
import { fail, type ActionResult } from "@/lib/action-result"
import { createClient } from "@/lib/supabase/server"

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("auth.errors.generic")
  const supabase = await createClient()
  const { error } = await supabase.rpc("mark_all_notifications_read")
  if (error) return fail("auth.errors.generic")
  return { ok: true, message: "notifications.markedAllRead" }
}

/** Marks one notification read (RLS + column grant: only the owner, only read_at). */
export async function markNotificationRead(id: number): Promise<ActionResult> {
  if (!z.number().int().positive().safeParse(id).success) return fail("auth.errors.generic")
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null)
  if (error) return fail("auth.errors.generic")
  return { ok: true }
}
