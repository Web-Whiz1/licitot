import { expect, test } from "@playwright/test"
import { cleanupUser, createConfirmedUser, signIn, type E2EUser } from "./helpers"

// Phase 2: sign in with a pre-confirmed user, edit the profile, view it publicly, sign out.

let user: E2EUser | undefined

test.beforeAll(async () => {
  user = await createConfirmedUser("Maria Popescu")
})

test.afterAll(async () => {
  await cleanupUser(user)
})

test("protected routes redirect anonymous visitors to sign-in", async ({ page }) => {
  await page.goto("/cont/setari")
  await expect(page).toHaveURL(/\/autentificare\?next=%2Fcont%2Fsetari/)
})

test("sign in, edit profile, view public profile, sign out", async ({ page }) => {
  await signIn(page, user!, "/cont/setari")
  await expect(page).toHaveURL(/\/cont\/setari$/)
  await expect(page.getByRole("heading", { name: "Contul meu" })).toBeVisible()
  await expect(page.getByLabel("Numele afișat")).toHaveValue("Maria Popescu")

  const username = `maria${Date.now() % 100000}`
  await page.getByLabel("Nume de utilizator").fill(username)
  await page.getByLabel("Județ").selectOption("CJ")
  await page.getByLabel("Oraș / localitate").fill("Cluj-Napoca")
  await page.getByLabel("Despre tine").fill("Colecționez viniluri și ceasuri vechi.")
  await page.getByLabel("Telefon (opțional)").fill("0722 123 456")
  await page.getByRole("button", { name: "Salvează" }).click()
  await expect(page.getByText("Am salvat modificările.")).toBeVisible()

  // Invalid phone is rejected client-side with the Romanian message.
  await page.getByLabel("Telefon (opțional)").fill("123")
  await page.getByRole("button", { name: "Salvează" }).click()
  await expect(page.getByText(/număr de telefon românesc valid/)).toBeVisible()

  await page.goto(`/u/${username}`)
  await expect(page.getByRole("heading", { name: "Maria Popescu" })).toBeVisible()
  await expect(page.getByText("Cluj-Napoca, Cluj")).toBeVisible()
  await expect(page.getByText("Colecționez viniluri și ceasuri vechi.")).toBeVisible()
  // The phone is private and must never appear on the public page.
  await expect(page.getByText("722")).toHaveCount(0)

  await page.getByRole("button", { name: "Cont" }).click()
  await page.getByRole("menuitem", { name: "Ieși din cont" }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto("/cont")
  await expect(page).toHaveURL(/\/autentificare/)
})

test("wrong password shows a friendly error", async ({ page }) => {
  await page.goto("/autentificare")
  const form = page.getByRole("tabpanel", { name: "Cu parolă" })
  await form.getByLabel("Email").fill(user!.email)
  await form.getByLabel("Parolă", { exact: true }).fill("gresita123")
  await form.getByRole("button", { name: "Intră în cont" }).click()
  await expect(page.getByText("Email sau parolă greșită.")).toBeVisible()
})
