import { expect, test } from "@playwright/test"

// Phase 4: browsing against seeded demo data (`pnpm db:seed`).

test("home shows live auctions and categories", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Se termină curând" })).toBeVisible()
  await expect(
    page.locator("#se-termina ~ ul article, section[aria-labelledby='se-termina'] article").first(),
  ).toBeVisible()
  await page.getByRole("link", { name: "Electronice" }).first().click()
  await expect(page).toHaveURL(/\/categorie\/electronice$/)
  await expect(page.getByRole("heading", { level: 1, name: "Electronice" })).toBeVisible()
})

test("search ignores diacritics and opens the auction", async ({ page }) => {
  await page.goto("/")
  const search = page.getByRole("searchbox").first()
  await search.fill("chitara")
  await search.press("Enter")
  await expect(page).toHaveURL(/\/cauta\?q=chitara/)
  await expect(page.getByRole("heading", { name: "Rezultate pentru „chitara”" })).toBeVisible()
  await page.getByRole("link", { name: /Chitară acustică Yamaha/ }).click()
  await expect(page).toHaveURL(/\/licitatie\/[0-9a-f-]{36}-chitara-acustica-yamaha-f310$/)
  await expect(
    page.getByRole("heading", { level: 1, name: /Chitară acustică Yamaha F310/ }),
  ).toBeVisible()
  await expect(page.getByText("Preț de pornire").first()).toBeVisible()
})

test("filters live in the URL and can be removed", async ({ page }) => {
  await page.goto("/cauta?judet=CJ&ordine=pret_desc")
  await expect(page.getByRole("link", { name: "Elimină filtrul Cluj" })).toBeVisible()
  const prices = await page.locator("article .text-primary").allInnerTexts()
  const values = prices.map((p) => Number(p.replace(/\D/g, "")))
  expect(values).toEqual([...values].sort((a, b) => b - a))
  await page.getByRole("link", { name: "Elimină filtrul Cluj" }).click()
  await expect(page).toHaveURL(/\/cauta\?ordine=pret_desc$/)
})

test("old slugs redirect to the canonical auction URL", async ({ page }) => {
  await page.goto("/cauta?q=pegas")
  const href = await page.getByRole("link", { name: /Pegas/ }).first().getAttribute("href")
  const id = href!.split("/").pop()!.slice(0, 36)
  await page.goto(`/licitatie/${id}-titlu-vechi`)
  await expect(page).toHaveURL(href!)
})

test("unknown auction shows a friendly 404", async ({ page }) => {
  await page.goto("/licitatie/00000000-0000-4000-8000-000000000000-nimic")
  await expect(page.getByText("Licitația nu există").filter({ visible: true })).toBeVisible()
})
