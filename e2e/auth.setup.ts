import { test as setup, expect } from "@playwright/test"

const EMAIL = process.env.E2E_EMAIL ?? "admin@palex.com"
const PASSWORD = process.env.E2E_PASSWORD ?? "Acapulco.70"

setup("authenticate", async ({ page }) => {
  await page.goto("/login")
  await page.fill("#login-email", EMAIL)
  await page.fill("#login-password", PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  await page.context().storageState({ path: "e2e/.auth/state.json" })
})
