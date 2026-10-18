"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { AUCTIONS_TAG, auctionTag } from "@/features/auctions/listing"
import { getCurrentUser } from "@/features/auth/session"
import type { MessageKey } from "@/i18n/keys"
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { reportSchema } from "./schemas"

const REPORT_ERRORS = new Set(["not_authenticated", "report_invalid", "report_exists"])
const ADMIN_ERRORS = new Set([
  "not_admin",
  "cannot_ban_admin",
  "user_not_found",
  "auction_not_found",
  "report_invalid",
])

const adminError = (message: string): MessageKey =>
  ADMIN_ERRORS.has(message) ? (`admin.errors.${message}` as MessageKey) : "auth.errors.generic"

/** Anyone signed in can report a listing or a profile; admins are notified. */
export async function reportContent(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input)
  if (!parsed.success) return fail("reports.errors.report_invalid", zodFieldErrors(parsed.error))
  const user = await getCurrentUser()
  if (!user) return fail("reports.errors.not_authenticated")
  if (!(await rateLimit({ key: `report:${user.id}`, limit: 10, windowSeconds: 3600 }))) {
    return fail("reports.errors.rate_limited")
  }
  const supabase = await createClient()
  // Exactly one target is set; the other is SQL NULL (generated arg types omit nullability).
  const none = null as unknown as string
  const { error } = await supabase.rpc("report_content", {
    p_auction_id: parsed.data.auctionId ?? none,
    p_user_id: parsed.data.userId ?? none,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  })
  if (error) {
    return fail(
      REPORT_ERRORS.has(error.message)
        ? (`reports.errors.${error.message}` as MessageKey)
        : "auth.errors.generic",
    )
  }
  return { ok: true, message: "reports.sent" }
}

// ─── Admin (each RPC re-checks is_admin()) ──────────────────────────────

const uuid = z.uuid()

export async function adminHideAuction(auctionId: string): Promise<ActionResult> {
  if (!uuid.safeParse(auctionId).success) return fail("admin.errors.auction_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_hide_auction", {
    p_auction_id: auctionId,
    p_reason: "moderation",
  })
  if (error) return fail(adminError(error.message))
  updateTag(auctionTag(auctionId))
  updateTag(AUCTIONS_TAG)
  return { ok: true, message: "admin.done" }
}

export async function adminUnhideAuction(auctionId: string): Promise<ActionResult> {
  if (!uuid.safeParse(auctionId).success) return fail("admin.errors.auction_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_unhide_auction", { p_auction_id: auctionId })
  if (error) return fail(adminError(error.message))
  updateTag(auctionTag(auctionId))
  updateTag(AUCTIONS_TAG)
  return { ok: true, message: "admin.done" }
}

export async function adminSetBanned(userId: string, banned: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(userId).success) return fail("admin.errors.user_not_found")
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_banned", {
    p_user_id: userId,
    p_banned: banned,
  })
  if (error) return fail(adminError(error.message))
  updateTag(AUCTIONS_TAG)
  return { ok: true, message: "admin.done" }
}

export async function adminResolveReport(
  reportId: number,
  status: "resolved" | "dismissed",
): Promise<ActionResult> {
  if (!z.number().int().positive().safeParse(reportId).success) {
    return fail("admin.errors.report_invalid")
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_status: status,
    p_note: "",
  })
  if (error) return fail(adminError(error.message))
  return { ok: true, message: "admin.done" }
}
