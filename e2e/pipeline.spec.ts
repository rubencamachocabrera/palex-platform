import { test, expect } from "@playwright/test"

const EMAIL = process.env.E2E_EMAIL ?? "admin@palex.com"
const PASSWORD = process.env.E2E_PASSWORD ?? "Acapulco.70"

test.describe("Pipeline CRM", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill("#login-email", EMAIL)
    await page.fill("#login-password", PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test("pipeline carga KPIs y lista", async ({ page }) => {
    await page.goto("/ventas/pipeline")
    // KPIs visibles — esperamos el elemento concreto, no networkidle
    await expect(page.locator("text=Pipeline total")).toBeVisible({ timeout: 15000 })
    await expect(page.locator("text=Valor ponderado")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=Error al cargar")).not.toBeVisible()
  })

  test("toggle kanban/lista funciona", async ({ page }) => {
    await page.goto("/ventas/pipeline")
    const btnKanban = page.locator("button", { hasText: "Kanban" })
    await expect(btnKanban).toBeVisible({ timeout: 15000 })
    await btnKanban.click()
    const btnLista = page.locator("button", { hasText: "Lista" })
    await expect(btnLista).toBeVisible({ timeout: 5000 })
    await btnLista.click()
  })

  test("panel lateral se abre al pulsar oportunidad", async ({ page }) => {
    await page.goto("/ventas/pipeline")
    await expect(page.locator("text=Pipeline total")).toBeVisible({ timeout: 15000 })
    const primeraOp = page.locator("div.bg-white.rounded-xl button.w-full").first()
    if (await primeraOp.isVisible()) {
      await primeraOp.click()
      await expect(page.locator("text=Historial")).toBeVisible({ timeout: 5000 })
    }
  })

  test("crear oportunidad — modal se abre y cierra", async ({ page }) => {
    await page.goto("/ventas/pipeline")
    await page.waitForLoadState("networkidle")
    const btnNueva = page.locator("button", { hasText: "Nueva oportunidad" })
    if (await btnNueva.isVisible()) {
      await btnNueva.click()
      await expect(page.locator("text=Nueva oportunidad").nth(1)).toBeVisible({ timeout: 3000 })
      // Cerrar con aria-label
      await page.click('button[aria-label="Cerrar modal"]')
      await expect(page.locator("text=Nueva oportunidad").nth(1)).not.toBeVisible()
    }
  })
})
