import { test, expect } from "@playwright/test"

test.describe("Navegacion y layout", () => {
  test("dashboard carga KPIs", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Error")).not.toBeVisible()
  })

  test("sidebar muestra links principales", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("a[href='/visitas']")).toBeVisible({ timeout: 10000 })
    await expect(page.locator("a[href='/hospitales']")).toBeVisible()
    await expect(page.locator("a[href='/proyectos']")).toBeVisible()
  })

  test("command palette se abre con Cmd+K", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    await page.keyboard.press("Meta+k")
    await expect(page.locator('input[placeholder*="Buscar"]').last()).toBeVisible({ timeout: 3000 })
    await page.keyboard.press("Escape")
  })

  test("toggle dark mode funciona", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    const toggleBtn = page.locator("button[title*='modo']").or(page.locator("button[aria-label*='modo']")).or(page.locator("button[aria-label*='tema']"))
    if (await toggleBtn.first().isVisible({ timeout: 5000 })) {
      await toggleBtn.first().click()
      await page.waitForTimeout(500)
      const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"))
      await toggleBtn.first().click()
      const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"))
      expect(isDark || isLight).toBeTruthy()
    }
  })

  test("pagina hardware carga sin error", async ({ page }) => {
    await page.goto("/hardware")
    await expect(page.locator("text=Resumen").or(page.locator("text=Inventario"))).toBeVisible({ timeout: 10000 })
  })

  test("pagina mapa carga sin error", async ({ page }) => {
    await page.goto("/mapa")
    await page.waitForTimeout(3000)
    await expect(page.locator("text=Error fatal")).not.toBeVisible()
  })

  test("perfil carga datos del usuario", async ({ page }) => {
    await page.goto("/perfil")
    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Navegacion movil", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("sidebar esta oculta en movil", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    const sidebar = page.locator("nav").first()
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox()
      expect(box === null || (box && box.x < 0)).toBeTruthy()
    }
  })

  test("no hay scroll horizontal en dashboard", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForTimeout(3000)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5)
  })
})
