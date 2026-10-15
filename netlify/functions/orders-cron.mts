// Netlify Scheduled Function: every 10 minutes, ask the app to settle orders (pay sellers,
// refund buyers, apply deadlines). The work happens in /api/cron/orders.
export default async function ordersCron() {
  const site = process.env.URL
  const secret = process.env.CRON_SECRET
  if (!site || !secret) {
    console.error("[orders-cron] URL or CRON_SECRET is not set")
    return
  }
  const res = await fetch(`${site}/api/cron/orders`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  })
  console.log("[orders-cron]", res.status, await res.text())
}

export const config = { schedule: "*/10 * * * *" }
