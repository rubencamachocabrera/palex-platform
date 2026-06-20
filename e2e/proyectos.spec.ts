import { test, expect } from "@playwright/test"

test.describe("Proyectos", () => {
  test("lista de proyectos carga", async ({ page }) => {
    await page.goto("/proyectos")
    const contenido = page.locator("a[href*='/proyectos/']").first()
    const vacio = page.getByText("No hay proyectos")
    await expect(contenido.or(vacio)).toBeVisible({ timeout: 15000 })
  })

  test("toggle lista/kanban funciona", async ({ page }) => {
    await page.goto("/proyectos")
    const btnKanban = page.locator("button", { hasText: "Kanban" })
    await expect(btnKanban).toBeVisible({ timeout: 15000 })
    await btnKanban.click()
    await page.waitForTimeout(500)
    const btnLista = page.locator("button", { hasText: "Lista" })
    await expect(btnLista).toBeVisible()
    await btnLista.click()
  })

  test("detalle de proyecto carga tabs", async ({ page }) => {
    await page.goto("/proyectos")
    const primerLink = page.locator("a[href*='/proyectos/']").first()
    if (await primerLink.isVisible({ timeout: 10000 })) {
      await primerLink.click()
      await expect(page.locator("text=Cockpit").or(page.locator("text=Info"))).toBeVisible({ timeout: 10000 })
    }
  })

  test("tabs de proyecto son navegables", async ({ page }) => {
    await page.goto("/proyectos")
    const primerLink = page.locator("a[href*='/proyectos/']").first()
    if (await primerLink.isVisible({ timeout: 10000 })) {
      await primerLink.click()
      await page.waitForTimeout(2000)
      const tabFases = page.locator("button", { hasText: "Fases" })
      if (await tabFases.isVisible()) {
        await tabFases.click()
        await page.waitForTimeout(1000)
        await expect(page.locator("text=Error")).not.toBeVisible()
      }
    }
  })
})
