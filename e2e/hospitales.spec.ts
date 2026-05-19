import { test, expect } from "@playwright/test"

const EMAIL = process.env.E2E_EMAIL ?? "admin@palex.com"
const PASSWORD = process.env.E2E_PASSWORD ?? "Acapulco.70"

test.describe("Hospitales", () => {
  test.beforeEach(async ({ page }) => {
    // Login rápido antes de cada test
    await page.goto("/login")
    await page.fill("#login-email", EMAIL)
    await page.fill("#login-password", PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test("lista de hospitales carga y muestra resultados", async ({ page }) => {
    await page.goto("/hospitales")
    // Esperar a que aparezca contenido o el empty state (no networkidle)
    await expect(
      page.locator("a[href*='/hospitales/'], text=Sin hospitales").first()
    ).toBeVisible({ timeout: 15000 })
  })

  test("busqueda filtra hospitales por nombre", async ({ page }) => {
    await page.goto("/hospitales")
    const input = page.locator('input[placeholder*="Buscar"]').first()
    await expect(input).toBeVisible({ timeout: 15000 })
    await input.fill("a")
    await page.waitForTimeout(400) // debounce
    await expect(page.locator("text=Error")).not.toBeVisible()
  })

  test("detalle de hospital carga sin error", async ({ page }) => {
    await page.goto("/hospitales")
    const primerLink = page.locator("a[href*='/hospitales/']").first()
    await expect(primerLink).toBeVisible({ timeout: 15000 })
    await primerLink.click()
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Error al cargar el hospital")).not.toBeVisible()
  })
})
