import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { NotificationRow } from "./format"

const COLUMNS = "id, type, data, link, read_at, created_at"

/** Unread count + the latest few, for the header bell (fresh on every request). */
export async function getNotificationSummary(userId: string) {
  const supabase = await createClient()
  const [latest, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ])
  return {
    items: (latest.data ?? []) as NotificationRow[],
    unread: unread.count ?? 0,
  }
}

/** The notifications page: the latest 100. */
export async function getNotifications(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data as NotificationRow[]
}
