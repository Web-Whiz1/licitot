import { expect, test } from "@playwright/test"
import Stripe from "stripe"
import {
  admin,
  cleanupUser,
  createConfirmedUser,
  createLiveAuction,
  signIn,
  type E2EUser,
} from "./helpers"

// Buy now → pay with a Stripe test card on the real (sandbox) Checkout page → money held
// (escrow) → seller ships with an AWB → buyer confirms → transfer to the seller minus 5%. Needs Stripe Connect enabled on
// the sandbox account; otherwise the test is skipped with the reason.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
let seller: E2EUser
let buyer: E2EUser
let accountId: string | null = null
let connectError: string | null = null

test.describe.configure({ mode: "serial" })

/** A fully verified connected account using Stripe's test data (charges enabled at once). */
async function createTestConnectedAccount(email: string) {
  return stripe.accounts.create({
    type: "custom",
    country: "RO",
    email,
    business_type: "individual",
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: { mcc: "5999", url: "https://licitot.ro" },
    individual: {
      first_name: "Ion",
      last_name: "Vânzătorul",
      email,
      phone: "+40000000000",
      dob: { day: 1, month: 1, year: 1901 }, // Stripe test DOB: passes verification
      address: { line1: "address_full_match", city: "Cluj-Napoca", postal_code: "400001" },
    },
    external_account: {
      object: "bank_account",
      country: "RO",
      currency: "ron",
      account_number: "RO49AAAA1B31007593840000",
    } as unknown as string,
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "8.8.8.8" },
  })
}

test.beforeAll(async () => {
  test.setTimeout(180_000)
  seller = await createConfirmedUser("Vânzător Plăți")
  buyer = await createConfirmedUser("Cumpărător Plăți")
  try {
    const account = await createTestConnectedAccount(seller.email)
    accountId = account.id
    // Verification of test data takes a moment.
    let a = account
    for (let i = 0; i < 45 && !a.charges_enabled; i++) {
      await new Promise((r) => setTimeout(r, 2_000))
      a = await stripe.accounts.retrieve(account.id)
    }
    await admin.rpc("set_stripe_account", { p_user_id: seller.id, p_account_id: a.id })
    await admin.rpc("sync_stripe_account", {
      p_account_id: a.id,
      p_details_submitted: a.details_submitted ?? false,
      p_charges_enabled: a.charges_enabled ?? false,
      p_payouts_enabled: a.payouts_enabled ?? false,
    })
    if (!a.charges_enabled) connectError = "the test connected account was not enabled in time"
  } catch (e) {
    connectError = e instanceof Error ? e.message : String(e)
  }
})

test.afterAll(async () => {
  if (accountId) await stripe.accounts.del(accountId).catch(() => {})
  await cleanupUser(seller)
  await cleanupUser(buyer)
})

test("buy now, pay on Stripe Checkout, ship", async ({ page, browser }, info) => {
  test.skip(connectError !== null, `Stripe Connect unavailable: ${connectError}`)
  test.setTimeout(180_000)

  const auction = await createLiveAuction(seller, {
    title: `Boxă Bluetooth JBL ${info.project.name}`,
    startingPrice: 20_000,
    buyNowPrice: 30_000,
    courierCost: 2_500,
  })

  await signIn(page, buyer, auction.href)
  await page.goto(auction.href)
  await page.getByRole("button", { name: /Cumpără acum la 300\sRON/ }).click()
  await page.getByRole("button", { name: "Da, cumpăr" }).click()
  await expect(page.getByText("Felicitări, obiectul e al tău!")).toBeVisible()

  await page.goto("/cont/castigate")
  await page.getByRole("link", { name: "Plătește" }).click()
  await expect(page).toHaveURL(/\/cont\/comanda\/[0-9a-f-]{36}$/)
  await page.getByText("Curier: 25 RON").click()
  await page.getByRole("button", { name: /Plătește 325\sRON/ }).click()

  // Stripe-hosted Checkout (test mode).
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
  // With several payment methods enabled (e.g. Klarna), the card form sits in an accordion:
  // click the visible "Card" row first.
  const cardRow = page.getByText("Card", { exact: true })
  const cardNumber = page.locator("#cardNumber")
  await expect(cardRow.or(cardNumber).first()).toBeVisible({ timeout: 30_000 })
  // The overlay button receives the click, as for a real user; force skips the overlap check.
  if (!(await cardNumber.isVisible())) await cardRow.click({ force: true })
  await cardNumber.fill("4242424242424242")
  await page.locator("#cardExpiry").fill("12 / 34")
  await page.locator("#cardCvc").fill("123")
  await page.locator("#billingName").fill("Cumpărător Plăți")
  const postal = page.locator("#billingPostalCode")
  if (await postal.isVisible()) await postal.fill("400001")
  await page.getByTestId("hosted-payment-submit-button").click()

  await page.waitForURL(/\/cont\/comanda\/[0-9a-f-]{36}\?session_id=/, { timeout: 60_000 })
  await expect(page.getByText("Plata a fost confirmată. Mulțumim!")).toBeVisible()
  await expect(page.getByText("Plătită", { exact: true })).toBeVisible()
  await expect(page.getByText(seller.email)).toBeVisible()

  // Escrow: the platform collected the payment; nothing has gone to the seller yet.
  const orderId = page.url().match(/comanda\/([0-9a-f-]{36})/)![1]!
  await expect(page.getByText(/Banii tăi sunt în siguranță/)).toBeVisible()
  const { data: order } = await admin
    .from("orders")
    .select("stripe_payment_intent_id, total, platform_fee")
    .eq("id", orderId)
    .single()
  expect(order).toMatchObject({ total: 32_500, platform_fee: 1_500 })
  const pi = await stripe.paymentIntents.retrieve(order!.stripe_payment_intent_id!)
  expect(pi.amount).toBe(32_500)
  expect(pi.transfer_data).toBeNull()
  expect(pi.transfer_group).toBe(orderId)

  // Seller ships with an AWB.
  const sellerContext = await browser.newContext({ ...info.project.use })
  const sellerPage = await sellerContext.newPage()
  await signIn(sellerPage, seller, `/cont/comanda/${orderId}`)
  await sellerPage.goto(`/cont/comanda/${orderId}`)
  await expect(sellerPage.getByText("Primești", { exact: true })).toBeVisible()
  await sellerPage.getByLabel("Firma de curierat").selectOption("Sameday")
  await sellerPage.getByLabel("Număr AWB").fill("1ONB24123456789")
  await sellerPage.getByRole("button", { name: "Confirmă expedierea" }).click()
  await expect(sellerPage.getByText("Expediată", { exact: true })).toBeVisible()
  await expect(sellerPage.getByText(/Expediat cu Sameday, AWB 1ONB24123456789/)).toBeVisible()

  // Buyer confirms receipt → the seller is paid: 325 RON − 15 RON fee = 310 RON.
  await page.reload()
  await page.getByRole("button", { name: "Am primit produsul" }).click()
  await page.getByRole("button", { name: "Confirm" }).click()
  await expect(page.getByText("Finalizată", { exact: true })).toBeVisible()
  const { data: done } = await admin
    .from("orders")
    .select("status, released_at, stripe_transfer_id")
    .eq("id", orderId)
    .single()
  expect(done).toMatchObject({ status: "completed" })
  expect(done?.stripe_transfer_id).toMatch(/^tr_/)
  const transfer = await stripe.transfers.retrieve(done!.stripe_transfer_id!)
  expect(transfer).toMatchObject({ amount: 31_000, destination: accountId })

  await sellerPage.reload()
  await expect(sellerPage.getByText(/Ai primit 310\sRON în contul tău Stripe/)).toBeVisible()
  await sellerContext.close()

  // The buyer rates the seller; the rating shows on the seller's public profile.
  await page.reload()
  // Stars are visually hidden radios: click the visible star (its label), as a person would.
  await page.getByLabel("5 stele").locator("..").click()
  await page.getByLabel("Comentariu (opțional)").fill("Totul a fost în regulă, recomand.")
  await page.getByRole("button", { name: "Trimite recenzia" }).click()
  await expect(page.getByText("Recenzia ta: 5 stele")).toBeVisible()
  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", seller.id)
    .single()
  await page.goto(`/u/${sellerProfile!.username}`)
  await expect(page.getByText(/5 din 5/)).toBeVisible()
  await expect(page.getByText("Totul a fost în regulă, recomand.")).toBeVisible()
})
