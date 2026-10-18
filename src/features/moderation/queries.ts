import "server-only"
import { createClient } from "@/lib/supabase/server"

// Admin pages (RLS lets admins read every report, order, auction and profile).

export async function getAdminStats() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_stats")
  if (error) throw error
  return data as Record<string, number>
}

export async function getOpenReports() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reports")
    .select(
      `id, reason, details, created_at,
       reporter:profiles!reports_reporter_id_fkey(username, display_name),
       auction:auctions(id, slug, title, status, is_hidden, seller_id),
       reported:profiles!reports_reported_user_id_fkey(id, username, display_name, is_banned)`,
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100)
  if (error) throw error
  return data
}

export async function getSuspendedUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, banned_at")
    .eq("is_banned", true)
    .order("banned_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function getHiddenAuctions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("auctions")
    .select("id, slug, title, hidden_reason, updated_at")
    .eq("is_hidden", true)
    .order("updated_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}
