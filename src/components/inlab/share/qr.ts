/**
 * QR de marca para los enlaces del informe InLab, generado 100 % en el navegador
 * (librería `qrcode` con import dinámico: no entra en el bundle inicial).
 *
 * Diseño: módulos redondeados en tinta, ojos con anillo teal oscuro y una insignia
 * central "P" (corrección de errores H: soporta ~30 % de módulos tapados; la
 * insignia ocupa ~5 %). Contraste ≥ 4,5:1 sobre blanco en todo lo que el lector
 * necesita (ojos y módulos) — el teal de marca (#00A99D, 2,9:1) solo decora.
 */

export const QR_TINTA = "#0B2036"
export const QR_OJO = "#007F75"
export const QR_ACENTO = "#F7941D"
const TEAL = "#00A99D"

export interface QrMatriz { n: number; get: (fila: number, col: number) => boolean }

export async function crearMatriz(texto: string): Promise<QrMatriz> {
  const QR = (await import("qrcode")).default
  const qr = QR.create(texto, { errorCorrectionLevel: "H" })
  const n = qr.modules.size
  const data = qr.modules.data
  return { n, get: (f, c) => data[f * n + c] === 1 }
}

export interface QrGeometria {
  n: number
  /** módulos de datos a pintar (x, y en unidades de módulo) + distancia normalizada al centro (0..1) */
  puntos: { x: number; y: number; dist: number }[]
  /** esquina superior izquierda de cada ojo */
  ojos: { x: number; y: number }[]
  /** hueco central para la insignia (en módulos) */
  hueco: { x: number; y: number; lado: number }
}

export function geometria(m: QrMatriz): QrGeometria {
  const { n } = m
  const ojos = [{ x: 0, y: 0 }, { x: n - 7, y: 0 }, { x: 0, y: n - 7 }]
  const enOjo = (x: number, y: number) => ojos.some(o => x >= o.x && x < o.x + 7 && y >= o.y && y < o.y + 7)
  let lado = Math.round(n * 0.22)
  if (lado % 2 !== n % 2) lado += 1
  const h = { x: (n - lado) / 2, y: (n - lado) / 2, lado }
  const enHueco = (x: number, y: number) => x >= h.x && x < h.x + lado && y >= h.y && y < h.y + lado
  const c = (n - 1) / 2
  const maxD = Math.hypot(c, c)
  const puntos: QrGeometria["puntos"] = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!m.get(y, x) || enOjo(x, y) || enHueco(x, y)) continue
      puntos.push({ x, y, dist: Math.hypot(x - c, y - c) / maxD })
    }
  }
  return { n, puntos, ojos, hueco: h }
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Marcado SVG interior (sin <svg>), en coordenadas de módulo con margen `margen`. */
export function svgInterior(g: QrGeometria, margen = 2): string {
  const o = margen
  const partes: string[] = []
  // Módulos: un único path (descarga ligera y nítida a cualquier tamaño)
  const d = g.puntos.map(p => `M${r2(o + p.x + 0.5)} ${r2(o + p.y + 0.06)}a.44 .44 0 0 1 0 .88a.44 .44 0 0 1 0-.88z`).join("")
  partes.push(`<path d="${d}" fill="${QR_TINTA}"/>`)
  for (const e of g.ojos) {
    partes.push(`<rect x="${o + e.x + 0.5}" y="${o + e.y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${QR_OJO}" stroke-width="1"/>`)
    partes.push(`<rect x="${o + e.x + 2}" y="${o + e.y + 2}" width="3" height="3" rx="0.9" fill="${QR_TINTA}"/>`)
  }
  partes.push(insignia(g, o))
  return partes.join("")
}

function insignia(g: QrGeometria, o: number): string {
  const { x, y, lado } = g.hueco
  const pad = 0.55
  const cx = o + x + lado / 2, cy = o + y + lado / 2
  const s = lado - pad * 2
  return [
    `<rect x="${r2(o + x + pad)}" y="${r2(o + y + pad)}" width="${r2(s)}" height="${r2(s)}" rx="${r2(s * 0.28)}" fill="${TEAL}"/>`,
    `<text x="${r2(cx - s * 0.04)}" y="${r2(cy + s * 0.25)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${r2(s * 0.72)}" fill="#ffffff">P</text>`,
    `<circle cx="${r2(cx + s * 0.3)}" cy="${r2(cy - s * 0.28)}" r="${r2(s * 0.09)}" fill="${QR_ACENTO}"/>`,
  ].join("")
}

/** SVG completo autónomo (descarga vectorial, ideal para imprimir). */
export function svgCompleto(g: QrGeometria, margen = 2): string {
  const t = g.n + margen * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${t * 16}" height="${t * 16}" shape-rendering="geometricPrecision"><rect width="${t}" height="${t}" fill="#ffffff"/>${svgInterior(g, margen)}</svg>`
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => ko(new Error("No se pudo rasterizar el QR"))
    img.src = src
  })
}

function textoAjustado(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string {
  if (ctx.measureText(texto).width <= maxW) return texto
  let t = texto
  while (t.length > 4 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/**
 * Tarjeta PNG 1080×1350 (formato vertical, se ve bien en móvil, correo o una diapositiva):
 * cabecera de marca, hospital, periodo, QR y pie con la caducidad.
 */
export async function pngTarjeta(g: QrGeometria, info: { hospital: string; periodo: string; alcance: string; pie: string }): Promise<Blob> {
  const W = 1080, H = 1350
  const canvas = document.createElement("canvas")
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas no disponible")
  const fuente = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H)
  // Cabecera en tinta con filo teal → naranja
  const cab = ctx.createLinearGradient(0, 0, W, 260)
  cab.addColorStop(0, "#071626"); cab.addColorStop(1, "#12304d")
  ctx.fillStyle = cab; ctx.fillRect(0, 0, W, 260)
  const filo = ctx.createLinearGradient(0, 0, W, 0)
  filo.addColorStop(0, TEAL); filo.addColorStop(1, QR_ACENTO)
  ctx.fillStyle = filo; ctx.fillRect(0, 254, W, 6)

  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "#5ff2e4"; ctx.font = `700 26px ${fuente}`
  ctx.fillText("PALEX MEDICAL  ·  INTELIGENCIA INLAB", 80, 92)
  ctx.fillStyle = "#ffffff"; ctx.font = `800 54px ${fuente}`
  ctx.fillText(textoAjustado(ctx, info.hospital, W - 160), 80, 168)
  ctx.fillStyle = "#cbd5e1"; ctx.font = `500 30px ${fuente}`
  ctx.fillText(textoAjustado(ctx, info.periodo, W - 160), 80, 218)

  // QR
  const lado = 760, qx = (W - lado) / 2, qy = 330
  const svg = svgCompleto(g, 2)
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  try {
    const img = await cargarImagen(url)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, qx, qy, lado, lado)
  } finally { URL.revokeObjectURL(url) }

  ctx.textAlign = "center"
  ctx.fillStyle = QR_TINTA; ctx.font = `700 34px ${fuente}`
  ctx.fillText("Escanea para abrir el informe", W / 2, qy + lado + 70)
  ctx.fillStyle = "#64748b"; ctx.font = `500 26px ${fuente}`
  ctx.fillText(textoAjustado(ctx, info.alcance, W - 160), W / 2, qy + lado + 114)
  ctx.fillStyle = "#94a3b8"; ctx.font = `500 22px ${fuente}`
  ctx.fillText(textoAjustado(ctx, info.pie, W - 160), W / 2, H - 50)

  return await new Promise<Blob>((ok, ko) => canvas.toBlob(b => (b ? ok(b) : ko(new Error("No se pudo generar el PNG"))), "image/png"))
}

/** Descarga un Blob con un nombre de fichero (enlace temporal blob:). */
export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = nombre; a.rel = "noopener"
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const nombreFichero = (hospital: string, ext: string) =>
  `informe-inlab-${hospital.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "hospital"}.${ext}`
