import { expect, test } from "@playwright/test"
import {
  cleanupUser,
  createConfirmedUser,
  createLiveAuction,
  signIn,
  type E2EUser,
} from "./helpers"

// Phase 5: two bidders on the same auction; prices update live (Supabase Realtime).

let seller: E2EUser
let ana: E2EUser
let bogdan: E2EUser

test.beforeAll(async () => {
  ;[seller, ana, bogdan] = await Promise.all([
    createConfirmedUser("Vânzător Live"),
    createConfirmedUser("Ana Marin"),
    createConfirmedUser("Bogdan Stan"),
  ])
})

test.afterAll(async () => {
  for (const u of [seller, ana, bogdan]) await cleanupUser(u)
})

test("proxy bids, live updates and the outbid notice", async ({ page, browser }, info) => {
  test.slow()
  const auction = await createLiveAuction(seller, {
    title: `Cameră foto Sony ${info.project.name}`,
    startingPrice: 45_000,
    minIncrement: 1_000,
  })

  // Visitors are sent to sign in.
  await page.goto(auction.href)
  await expect(page.getByRole("link", { name: "Intră în cont ca să licitezi" })).toBeVisible()

  // Bogdan watches the page in another browser.
  const other = await browser.newContext({ ...info.project.use })
  const bogdanPage = await other.newPage()
  await signIn(bogdanPage, bogdan, auction.href)
  await bogdanPage.goto(auction.href)
  await expect(
    bogdanPage.getByText("Fii primul care licitează!").filter({ visible: true }),
  ).toBeVisible()

  // Ana bids a maximum of 600 RON: the price opens at the starting price.
  await signIn(page, ana, auction.href)
  await page.goto(auction.href)
  await page.getByLabel("Oferta ta maximă").fill("600")
  await page.getByRole("button", { name: "Licitează" }).first().click()
  await expect(page.getByRole("alertdialog")).toContainText("600 RON")
  await page.getByRole("button", { name: "Confirm oferta" }).click()
  await expect(page.getByText("Ești pe primul loc!").first()).toBeVisible()
  await expect(page.getByText("Oferta ta maximă: 600 RON")).toBeVisible()

  // Bogdan's page updates without a reload.
  await expect(bogdanPage.getByText("1 ofertă").first()).toBeVisible({ timeout: 15_000 })
  await expect(bogdanPage.getByText(/Oferta minimă: 460\sRON/)).toBeVisible()

  // Under the minimum is refused on the client.
  await bogdanPage.getByLabel("Oferta ta maximă").fill("455")
  await bogdanPage.getByRole("button", { name: "Licitează" }).first().click()
  await expect(bogdanPage.getByText(/Oferta minimă acum este 460\sRON/)).toBeVisible()

  // Bogdan outbids Ana's maximum: 610 RON, and Ana sees she was outbid.
  await bogdanPage.getByLabel("Oferta ta maximă").fill("800")
  await bogdanPage.getByRole("button", { name: "Licitează" }).first().click()
  await bogdanPage.getByRole("button", { name: "Confirm oferta" }).click()
  await expect(bogdanPage.getByText("Ești pe primul loc!").first()).toBeVisible()
  await expect(page.getByText(/Ai fost depășit/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/^610\sRON$/).first()).toBeVisible()

  // History masks names and marks the viewer's own bids.
  const history = page.getByRole("region", { name: "Istoric oferte" })
  await expect(history.getByText("B***n")).toBeVisible()
  await expect(history.getByText("Tu").first()).toBeVisible()

  // "Ofertele mele" lists the auction as outbid.
  await page.goto("/cont/oferte")
  const row = page.getByRole("listitem").filter({ hasText: auction.title })
  await expect(row.getByText("Depășit")).toBeVisible()
  await other.close()
})
