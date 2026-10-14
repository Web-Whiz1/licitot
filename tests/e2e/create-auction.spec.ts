import path from "node:path"
import { expect, test } from "@playwright/test"
import {
  cleanupUser,
  createConfirmedUser,
  markPayoutsActive,
  signIn,
  type E2EUser,
} from "./helpers"

// Phase 3: create an auction with real ImageKit uploads, publish it, and manage drafts.

const fixtures = path.resolve("tests/e2e/fixtures")
let user: E2EUser | undefined

test.beforeEach(async () => {
  user = await createConfirmedUser("Ion Vânzătorul")
  await markPayoutsActive(user)
})

test.afterEach(async () => {
  await cleanupUser(user)
})

test("publish an auction with photos", async ({ page }) => {
  test.slow() // compression + real uploads
  await signIn(page, user!, "/vinde")
  await expect(page.getByRole("heading", { name: "Pune pe licitație" })).toBeVisible()

  await page
    .getByLabel("alege din dispozitiv")
    .setInputFiles([path.join(fixtures, "foto-1.jpg"), path.join(fixtures, "foto-2.jpg")])
  await expect(page.getByText("2 din 10")).toBeVisible()
  await expect(page.getByText("Se încarcă…")).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByText("Principală", { exact: true })).toBeVisible()

  await page.getByLabel("Titlu").fill("Bicicletă de oraș Pegas, cadru 52")
  await page.getByLabel("Categorie").selectOption({ label: "Biciclete" })
  await page.getByText("Ca nou", { exact: true }).click()
  await page
    .getByLabel("Descriere")
    .fill("Bicicletă în stare foarte bună, folosită un singur sezon.")
  await page.getByLabel("Preț de pornire").fill("450")
  await page.getByRole("button", { name: /Folosește 10\sRON/ }).click()
  await expect(page.getByLabel("Pas minim de licitare")).toHaveValue("10")
  await expect(page.getByText(/Vei primi aproximativ 427,50\sRON/)).toBeVisible()
  await page.getByText("3 zile", { exact: true }).click()
  await page.getByLabel("Județ").selectOption("CJ")
  await page.getByLabel("Oraș / localitate").fill("Cluj-Napoca")

  await page.getByRole("button", { name: "Publică licitația" }).click()

  await expect(page).toHaveURL(/\/cont\/licitatii$/, { timeout: 30_000 })
  await expect(page.getByText("Licitația ta e live!")).toBeVisible()
  const row = page.getByRole("listitem").filter({ hasText: "Bicicletă de oraș Pegas" })
  await expect(row.getByText("Activă")).toBeVisible()
  await expect(row.getByText(/^450\sRON$/)).toBeVisible()
  // Cover photo is served by ImageKit.
  await expect(row.locator("img")).toHaveAttribute(
    "src",
    /ik\.imagekit\.io\/.+\/licitot\/auctions\//,
  )
})

test("validation errors, then save and delete a draft", async ({ page }) => {
  await signIn(page, user!, "/vinde")

  // Publishing an empty form shows Romanian validation messages.
  await page.getByRole("button", { name: "Publică licitația" }).click()
  await expect(page.getByText("Titlul trebuie să aibă între 5 și 80 de caractere.")).toBeVisible()
  await expect(page.getByText("Alege o categorie.")).toBeVisible()

  await page.getByLabel("Titlu").fill("Set de viniluri vechi")
  await page.getByLabel("Categorie").selectOption({ label: "Viniluri & CD-uri" })
  await page.getByLabel("Descriere").fill("Zece discuri de vinil din anii '70, stare bună.")
  await page.getByLabel("Preț de pornire").fill("100")
  await page.getByLabel("Pas minim de licitare").fill("5")
  await page.getByLabel("Preț de rezervă (opțional)").fill("50")
  await page.getByLabel("Județ").selectOption("B")
  await page.getByLabel("Oraș / localitate").fill("București")
  await page.getByRole("button", { name: "Salvează ciorna" }).click()
  await expect(
    page.getByText("Prețul de rezervă nu poate fi mai mic decât prețul de pornire."),
  ).toBeVisible()

  await page.getByLabel("Preț de rezervă (opțional)").fill("")
  await page.getByRole("button", { name: "Salvează ciorna" }).click()
  await expect(page.getByText("Ciorna a fost salvată.")).toBeVisible()
  await expect(page).toHaveURL(/\/vinde\/[0-9a-f-]{36}$/)

  // Publishing a draft without photos is refused.
  await page.getByRole("button", { name: "Publică licitația" }).click()
  await expect(page.getByText("Adaugă cel puțin o fotografie.")).toBeVisible()

  await page.goto("/cont/licitatii")
  const row = page.getByRole("listitem").filter({ hasText: "Set de viniluri vechi" })
  await expect(row.getByText("Ciornă")).toBeVisible()
  await row.getByRole("button", { name: "Șterge" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Șterge" }).click()
  await expect(page.getByText("Ciorna a fost ștearsă.")).toBeVisible()
  await expect(page.getByText("Set de viniluri vechi")).toHaveCount(0)
})
