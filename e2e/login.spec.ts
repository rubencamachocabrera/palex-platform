import { test, expect } from "@playwright/test"

const EMAIL = process.env.E2E_EMAIL ?? "admin@palex.com"
const PASSWORD = process.env.E2E_PASSWORD ?? "Acapulco.70"

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("muestra el formulario de login", async ({ page }) => {
    await expect(page.locator("#login-email")).toBeVisible()
    await expect(page.locator("#login-password")).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test("credenciales incorrectas muestran error y shake", async ({ page }) => {
    await page.fill("#login-email", "noexiste@palex.com")
    await page.fill("#login-password", "wrongpassword")
    await page.click('button[type="submit"]')
    // Debe mostrar mensaje de error (no redirige)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator("text=Email o contraseña incorrectos")).toBeVisible({ timeout: 8000 })
  })

  test("login correcto redirige al dashboard", async ({ page }) => {
    await page.fill("#login-email", EMAIL)
    await page.fill("#login-password", PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    // La página cargó sin error
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })
})
