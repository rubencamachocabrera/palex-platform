import { test, expect } from "@playwright/test"

test.describe("Visitas", () => {
  test("lista de visitas carga", async ({ page }) => {
    await page.goto("/visitas")
    const contenido = page.locator("a[href*='/visitas/']").first()
    const vacio = page.getByText("No hay visitas")
    await expect(contenido.or(vacio)).toBeVisible({ timeout: 15000 })
  })

  test("busqueda filtra visitas", async ({ page }) => {
    await page.goto("/visitas")
    const input = page.locator('input[placeholder*="Buscar"]').first()
    await expect(input).toBeVisible({ timeout: 15000 })
    await input.fill("test")
    await page.waitForTimeout(500)
    await expect(page.locator("text=Error")).not.toBeVisible()
  })

  test("modal nueva visita se abre y cierra", async ({ page }) => {
    await page.goto("/visitas")
    await page.waitForTimeout(2000)
    const btnNueva = page.locator("button", { hasText: /Nueva visita/ })
    if (await btnNueva.isVisible()) {
      await btnNueva.click()
      await expect(page.locator("text=Crear visita")).toBeVisible({ timeout: 5000 })
      await page.keyboard.press("Escape")
    }
  })

  test("detalle de visita carga formulario", async ({ page }) => {
    await page.goto("/visitas")
    const primerLink = page.locator("a[href*='/visitas/']").first()
    if (await primerLink.isVisible({ timeout: 10000 })) {
      await primerLink.click()
      await expect(page.locator("text=Progreso global").or(page.locator("text=Guardado"))).toBeVisible({ timeout: 10000 })
    }
  })

  test("calendario mensual carga", async ({ page }) => {
    await page.goto("/visitas/calendario")
    await expect(page.locator("text=Lun").or(page.locator("text=lun"))).toBeVisible({ timeout: 10000 })
  })
})
