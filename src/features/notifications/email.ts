import "server-only"
import { getTranslations } from "next-intl/server"
import { colorTokens } from "@/lib/brand/tokens"
import { serverEnv } from "@/lib/env.server"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import { createAdminClient } from "@/lib/supabase/admin"
import { notificationMessage, type NotificationRow } from "./format"

// Email copies of notifications, sent by the scheduled job (/api/cron/orders) through Resend.
// Off until RESEND_API_KEY and EMAIL_FROM are set (Resend needs a verified sending domain).
// Only notifications from the last 24 hours are sent, so turning email on later doesn't
// flood people with old news.

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Plain, readable email: the notification text and a button to the page it is about. */
export function renderNotificationEmail(
  text: string,
  link: string | null,
  labels: {
    open: string
    footer: string
  },
) {
  const url = `${SITE_URL}${link ?? "/cont/notificari"}`
  // Email clients ignore CSS variables: inline the brand tokens.
  const c = colorTokens.light
  const html = `<!doctype html><html lang="ro"><body style="margin:0;background:${c.muted};font-family:Arial,Helvetica,sans-serif;color:${c.foreground}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:${c.card};border-radius:16px;padding:28px">
<tr><td style="font-size:22px;font-weight:800;color:${c.primary};padding-bottom:16px">${SITE_NAME}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-bottom:24px">${escapeHtml(text)}</td></tr>
<tr><td><a href="${escapeHtml(url)}" style="display:inline-block;background:${c.primary};color:${c["primary-foreground"]};text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(labels.open)}</a></td></tr>
<tr><td style="font-size:12px;color:${c["muted-foreground"]};padding-top:28px">${escapeHtml(labels.footer)}</td></tr>
</table></td></tr></table></body></html>`
  return { html, text: `${text}\n\n${url}\n\n${labels.footer}` }
}

export type EmailResult = { sent: number; failed: number; skipped?: "not_configured" }

export async function sendPendingEmails(): Promise<EmailResult> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv()
  if (!RESEND_API_KEY || !EMAIL_FROM) return { sent: 0, failed: 0, skipped: "not_configured" }

  const db = createAdminClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { data } = await db
    .from("notifications")
    .select("id, user_id, type, data, link, read_at, created_at")
    .is("emailed_at", null)
    .gte("created_at", since)
    .order("created_at")
    .limit(50)
  const rows = (data ?? []) as (NotificationRow & { user_id: string })[]
  if (!rows.length) return { sent: 0, failed: 0 }

  const t = await getTranslations({ locale: "ro", namespace: "notifications" })
  const tEmail = await getTranslations({ locale: "ro", namespace: "email" })
  const emails = new Map<string, string | null>()
  const result: EmailResult = { sent: 0, failed: 0 }
  const sentIds: number[] = []

  for (const n of rows) {
    if (!emails.has(n.user_id)) {
      const { data: u } = await db.auth.admin.getUserById(n.user_id)
      emails.set(n.user_id, u.user?.email ?? null)
    }
    const to = emails.get(n.user_id)
    if (!to) continue
    const { key, values } = notificationMessage(n)
    const text = t(`types.${key}`, values)
    const body = renderNotificationEmail(text, n.link, {
      open: tEmail("open"),
      footer: tEmail("footer"),
    })
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `notification-${n.id}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject: text.length > 90 ? `${text.slice(0, 87)}…` : text,
        html: body.html,
        text: body.text,
      }),
    })
    if (res.ok) {
      sentIds.push(n.id)
      result.sent++
    } else {
      console.error("[email]", n.id, res.status, (await res.text()).slice(0, 200))
      result.failed++
    }
  }

  if (sentIds.length) await db.rpc("mark_notifications_emailed", { p_ids: sentIds })
  return result
}
