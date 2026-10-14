import { expect, test, type Page } from "@playwright/test"
import { cleanupUser, createConfirmedUser, createLiveAuction, type E2EUser } from "./helpers"

// Phase 4: browsing and search. Creates its own auctions (no seed data) and removes them after.

let seller: E2EUser
let guitarHref = ""

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
  seller = await createConfirmedUser("Vânzător Browse")
  const guitar = await createLiveAuction(seller, {
    title: "Chitară acustică Yamaha F310",
    category: "instrumente-muzicale",
    county: "CJ",
    startingPrice: 32_000,
  })
  guitarHref = guitar.href
  await createLiveAuction(seller, {
    title: "Bicicletă de oraș Pegas Strada",
    category: "biciclete",
    county: "CJ",
    startingPrice: 45_000,
    photo: "foto-2.jpg",
  })
  await createLiveAuction(seller, {
    title: "Bicicletă de munte Merida",
    category: "biciclete",
    county: "B",
    city: "București",
    startingPrice: 120_000,
  })
})

test.afterAll(async () => {
  await cleanupUser(seller)
})

/** Listings are cached for about a minute (stale-while-revalidate): reload until fresh. */
async function gotoFresh(page: Page, url: string, ready: () => Promise<void>) {
  await expect(async () => {
    await page.goto(url)
    await ready()
  }).toPass({ timeout: 150_000, intervals: [5_000, 10_000, 15_000] })
}

test("home shows live auctions and categories", async ({ page }) => {
  test.setTimeout(180_000)
  await gotoFresh(page, "/", () =>
    expect(page.getByRole("link", { name: /Chitară acustică Yamaha/ }).first()).toBeVisible({
      timeout: 2_000,
    }),
  )
  await expect(page.getByRole("heading", { name: "Se termină curând" })).toBeVisible()
  await page.getByRole("link", { name: "Electronice" }).first().click()
  await expect(page).toHaveURL(/\/categorie\/electronice$/)
  await expect(page.getByRole("heading", { level: 1, name: "Electronice" })).toBeVisible()
})

test("search ignores diacritics and opens the auction", async ({ page }) => {
  test.setTimeout(180_000)
  await gotoFresh(page, "/cauta?q=chitara", () =>
    expect(page.getByRole("link", { name: /Chitară acustică Yamaha/ })).toBeVisible({
      timeout: 2_000,
    }),
  )
  await expect(page.getByRole("heading", { name: "Rezultate pentru „chitara”" })).toBeVisible()
  await page.getByRole("link", { name: /Chitară acustică Yamaha/ }).click()
  await expect(page).toHaveURL(/\/licitatie\/[0-9a-f-]{36}-chitara-acustica-yamaha-f310$/)
  await expect(
    page.getByRole("heading", { level: 1, name: /Chitară acustică Yamaha F310/ }),
  ).toBeVisible()
  await expect(page.getByText("Preț de pornire").first()).toBeVisible()
})

test("filters live in the URL and can be removed", async ({ page }) => {
  test.setTimeout(180_000)
  await gotoFresh(page, "/cauta?q=bicicleta&ordine=pret_desc", () =>
    expect(page.locator("article")).toHaveCount(2, { timeout: 2_000 }),
  )
  const prices = await page.locator("article .text-primary").allInnerTexts()
  const values = prices.map((p) => Number(p.replace(/\D/g, "")))
  expect(values).toEqual([...values].sort((a, b) => b - a))

  await page.goto("/cauta?q=bicicleta&judet=CJ")
  await expect(page.locator("article")).toHaveCount(1)
  await page.getByRole("link", { name: "Elimină filtrul Cluj" }).click()
  await expect(page).toHaveURL(/\/cauta\?q=bicicleta$/)
})

test("old slugs redirect to the canonical auction URL", async ({ page }) => {
  const id = guitarHref.split("/").pop()!.slice(0, 36)
  await page.goto(`/licitatie/${id}-titlu-vechi`)
  await expect(page).toHaveURL(guitarHref)
})

test("unknown auction shows a friendly 404", async ({ page }) => {
  await page.goto("/licitatie/00000000-0000-4000-8000-000000000000-nimic")
  await expect(page.getByText("Licitația nu există").filter({ visible: true })).toBeVisible()
})
