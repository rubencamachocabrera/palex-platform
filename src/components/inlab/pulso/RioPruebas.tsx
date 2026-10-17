"use client"

/**
 * «El río»: de dónde viene el trabajo del laboratorio y adónde va. Diagrama de flujo (Sankey)
 * en tres columnas — work areas → secciones del laboratorio → pruebas más pedidas — con el
 * grosor proporcional a las pruebas solicitadas. Pasar el cursor (o pulsar) por un nodo
 * resalta su recorrido COMPLETO: con el cubo área × sección × prueba de `flujoPruebas`, al
 * elegir un área se ve qué pruebas pide y, al elegir una prueba, qué áreas la piden.
 * SVG propio, sin dependencias.
 */
import { useId, useMemo, useState } from "react"
import { etiquetaArea } from "@/lib/inlab/analytics"
import { OTRAS_AREAS, type FlujoPruebas, type NodoFlujo } from "@/lib/inlab/pulso"
import { fmtCompacto, fmtN } from "../charts"
import { colorSeccion, GRIS } from "../colores"

type Columna = "area" | "seccion" | "prueba"
export type FocoRio = { col: Columna; i: number } | null

const ANCHO = 1000, NODO = 14, PAD = 9
const X: Record<Columna, number> = { area: 176, seccion: 478, prueba: 780 }

interface Caja { y: number; h: number }

function apilar(nodos: NodoFlujo[], k: number, alto: number): Caja[] {
  const total = nodos.reduce((s, n) => s + n.v, 0) * k + PAD * (nodos.length - 1)
  let y = (alto - total) / 2
  return nodos.map(n => { const h = Math.max(1.5, n.v * k); const c = { y, h }; y += h + PAD; return c })
}

/** Banda entre dos columnas: de (x0, y0..y0+w) a (x1, y1..y1+w). */
function banda(x0: number, y0: number, x1: number, y1: number, w: number): string {
  const xm = (x0 + x1) / 2
  return `M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + w}C${xm},${y1 + w} ${xm},${y0 + w} ${x0},${y0 + w}Z`
}

export function RioPruebas({ flujo, colorArea, alto = 470, foco: focoExt, onFoco, oscuro = false }: {
  flujo: FlujoPruebas
  colorArea: (area: string) => string
  alto?: number
  /** foco controlado desde fuera (si no, interno) */
  foco?: FocoRio
  onFoco?: (f: FocoRio) => void
  oscuro?: boolean
}) {
  const uid = useId().replace(/:/g, "")
  const [hover, setHover] = useState<FocoRio>(null)
  const [fijado, setFijado] = useState<FocoRio>(null)
  const elegido = focoExt !== undefined ? focoExt : fijado
  const foco = hover ?? elegido
  const { areas, secciones, pruebas, cubo } = flujo
  const nA = areas.length, nS = secciones.length, nP = pruebas.length

  const geo = useMemo(() => {
    const total = Math.max(1, flujo.total)
    const alturaUtil = (n: number) => (alto - 30 - PAD * (n - 1)) / total
    const k = Math.min(alturaUtil(nA), alturaUtil(nS), alturaUtil(nP))
    const cajas = { area: apilar(areas, k, alto), seccion: apilar(secciones, k, alto), prueba: apilar(pruebas, k, alto) }
    // Totales de los enlaces
    const as = areas.map((_, i) => secciones.map((_, j) => cubo[i][j].reduce((s, v) => s + v, 0)))
    const sp = secciones.map((_, j) => pruebas.map((_, p) => areas.reduce((s, _a, i) => s + cubo[i][j][p], 0)))
    // Desplazamientos dentro de cada nodo (orden de la columna vecina: sin cruces innecesarios)
    const offAS = as.map(() => new Array(nS).fill(0)), offSA = secciones.map(() => new Array(nA).fill(0))
    for (let i = 0; i < nA; i++) { let y = 0; for (let j = 0; j < nS; j++) { offAS[i][j] = y; y += as[i][j] * k } }
    for (let j = 0; j < nS; j++) { let y = 0; for (let i = 0; i < nA; i++) { offSA[j][i] = y; y += as[i][j] * k } }
    const offSP = secciones.map(() => new Array(nP).fill(0)), offPS = pruebas.map(() => new Array(nS).fill(0))
    for (let j = 0; j < nS; j++) { let y = 0; for (let p = 0; p < nP; p++) { offSP[j][p] = y; y += sp[j][p] * k } }
    for (let p = 0; p < nP; p++) { let y = 0; for (let j = 0; j < nS; j++) { offPS[p][j] = y; y += sp[j][p] * k } }
    return { k, cajas, as, sp, offAS, offSA, offSP, offPS }
  }, [flujo, areas, secciones, pruebas, cubo, alto, nA, nS, nP])

  // Parte de cada enlace que pertenece al recorrido del foco
  const resaltado = useMemo(() => {
    if (!foco) return null
    const hAS = areas.map(() => new Array(nS).fill(0)), hSP = secciones.map(() => new Array(nP).fill(0))
    for (let i = 0; i < nA; i++) for (let j = 0; j < nS; j++) for (let p = 0; p < nP; p++) {
      const v = cubo[i][j][p]
      if (!v) continue
      const dentro = foco.col === "area" ? i === foco.i : foco.col === "seccion" ? j === foco.i : p === foco.i
      if (dentro) { hAS[i][j] += v; hSP[j][p] += v }
    }
    return { hAS, hSP }
  }, [foco, cubo, areas, secciones, nA, nS, nP])

  const color = (col: Columna, i: number) => col === "area"
    ? (areas[i].clave === OTRAS_AREAS ? GRIS : colorArea(areas[i].clave))
    : col === "seccion" ? (secciones[i].agrupa ? GRIS : colorSeccion(secciones[i].clave))
      : (pruebas[i].agrupa ? GRIS : colorSeccion(pruebas[i].seccion ?? ""))
  const nombre = (col: Columna, n: NodoFlujo) => (col === "area" && !n.agrupa ? etiquetaArea(n.clave) : n.clave)
  const pct = (v: number) => (flujo.total ? (v / flujo.total) * 100 : 0)

  const cambiarFoco = (f: FocoRio) => {
    const igual = f && elegido && f.col === elegido.col && f.i === elegido.i
    const nuevo = igual ? null : f
    if (onFoco) onFoco(nuevo); else setFijado(nuevo)
  }

  const { k, cajas, as, sp, offAS, offSA, offSP, offPS } = geo
  const x0 = X.area + NODO, x1 = X.seccion, x2 = X.seccion + NODO, x3 = X.prueba
  const tenue = foco ? 0.1 : oscuro ? 0.3 : 0.26
  const dimNodo = (col: Columna, i: number) => {
    if (!foco || !resaltado) return false
    if (col === foco.col) return i !== foco.i
    if (col === "area") return resaltado.hAS[i].every(v => v === 0)
    if (col === "seccion") return resaltado.hAS.every(f => f[i] === 0)
    return resaltado.hSP.every(f => f[i] === 0)
  }
  const nodos: [Columna, NodoFlujo[]][] = [["area", areas], ["seccion", secciones], ["prueba", pruebas]]

  return (
    <div className="overflow-x-auto pb-1 [contain:inline-size]">
      <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="block h-auto w-full min-w-[720px]" role="img"
        aria-label={`Pruebas solicitadas por work area y sección: ${areas.map(a => `${nombre("area", a)} ${fmtN(a.v)}`).join(", ")}`}>
        <defs>
          {areas.map((_, i) => secciones.map((_, j) => (
            <linearGradient key={`ga${i}-${j}`} id={`${uid}-as-${i}-${j}`} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1={0} y2={0}>
              <stop offset="0%" stopColor={color("area", i)} /><stop offset="100%" stopColor={color("seccion", j)} />
            </linearGradient>
          )))}
        </defs>
        {/* Cabeceras de columna */}
        {([["area", "Work areas"], ["seccion", "Secciones del laboratorio"], ["prueba", "Pruebas más pedidas"]] as const).map(([col, t]) => (
          <text key={col} x={X[col] + NODO / 2} y={12} textAnchor="middle" fontSize={10.5} fontWeight={800} letterSpacing=".12em" fill="currentColor" fillOpacity={0.5}>{t.toUpperCase()}</text>
        ))}
        {/* Enlaces área → sección */}
        <g>
          {areas.map((_, i) => secciones.map((_, j) => {
            const v = as[i][j]
            if (!v) return null
            const w = v * k, ya = cajas.area[i].y + offAS[i][j], ys = cajas.seccion[j].y + offSA[j][i]
            const h = resaltado?.hAS[i][j] ?? 0
            return (
              <g key={`as${i}-${j}`} className="pulso-rio-enlace" style={{ animationDelay: `${(i * nS + j) * 12}ms` }}>
                <path d={banda(x0, ya, x1, ys, w)} fill={`url(#${uid}-as-${i}-${j})`} opacity={tenue} style={{ transition: "opacity 200ms ease" }}>
                  <title>{`${nombre("area", areas[i])} → ${secciones[j].clave}: ${fmtN(v)} pruebas`}</title>
                </path>
                {h > 0 && <path d={banda(x0, ya, x1, ys, h * k)} fill={`url(#${uid}-as-${i}-${j})`} opacity={0.85} pointerEvents="none" />}
              </g>
            )
          }))}
        </g>
        {/* Enlaces sección → prueba */}
        <g>
          {secciones.map((_, j) => pruebas.map((_, p) => {
            const v = sp[j][p]
            if (!v) return null
            const w = v * k, ys = cajas.seccion[j].y + offSP[j][p], yp = cajas.prueba[p].y + offPS[p][j]
            const h = resaltado?.hSP[j][p] ?? 0
            const col = color("prueba", p)
            return (
              <g key={`sp${j}-${p}`} className="pulso-rio-enlace" style={{ animationDelay: `${200 + (j * nP + p) * 8}ms` }}>
                <path d={banda(x2, ys, x3, yp, w)} fill={col} opacity={tenue} style={{ transition: "opacity 200ms ease" }}>
                  <title>{`${secciones[j].clave} → ${pruebas[p].clave}: ${fmtN(v)} peticiones`}</title>
                </path>
                {h > 0 && <path d={banda(x2, ys, x3, yp, h * k)} fill={col} opacity={0.85} pointerEvents="none" />}
              </g>
            )
          }))}
        </g>
        {/* Nodos y etiquetas */}
        {nodos.map(([col, lista]) => lista.map((n, i) => {
          const caja = cajas[col][i]
          const dim = dimNodo(col, i)
          const activo = foco?.col === col && foco.i === i
          const izquierda = col === "area"
          const lx = izquierda ? X[col] - 8 : X[col] + NODO + 8
          const ly = caja.y + caja.h / 2
          const v = foco && resaltado && !activo && foco.col !== col
            ? (col === "area" ? resaltado.hAS[i].reduce((s, x) => s + x, 0) : col === "seccion" ? resaltado.hAS.reduce((s, f) => s + f[i], 0) : resaltado.hSP.reduce((s, f) => s + f[i], 0))
            : n.v
          return (
            <g key={`${col}${i}`} className="pulso-rio-nodo" style={{ cursor: "pointer", opacity: dim ? 0.3 : 1, transition: "opacity 200ms ease" }}
              onMouseEnter={() => setHover({ col, i })} onMouseLeave={() => setHover(null)} onClick={() => cambiarFoco({ col, i })}
              role="button" tabIndex={0} aria-pressed={activo} aria-label={`${nombre(col, n)}: ${fmtN(n.v)} pruebas`}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cambiarFoco({ col, i }) } }}
              onFocus={() => setHover({ col, i })} onBlur={() => setHover(null)}>
              <rect x={X[col]} y={caja.y} width={NODO} height={caja.h} rx={3} fill={color(col, i)} />
              {activo && <rect x={X[col] - 3} y={caja.y - 3} width={NODO + 6} height={caja.h + 6} rx={5} fill="none" stroke={color(col, i)} strokeWidth={1.5} />}
              {caja.h >= 9 || activo ? (
                <text x={lx} y={ly} textAnchor={izquierda ? "end" : "start"} dominantBaseline="middle" className="pulso-rio-etiqueta" fontSize={col === "seccion" ? 11.5 : 11}>
                  <tspan fontWeight={800} fill="currentColor">{nombre(col, n).length > 26 ? `${nombre(col, n).slice(0, 25)}…` : nombre(col, n)}</tspan>
                  <tspan dx={6} fontWeight={600} fill="currentColor" fillOpacity={0.55}>{fmtCompacto(Math.round(v))}{!foco ? ` · ${fmtN(pct(n.v), pct(n.v) < 10 ? 1 : 0)} %` : ""}</tspan>
                </text>
              ) : null}
              <rect x={izquierda ? X[col] - 150 : X[col]} y={caja.y - PAD / 2} width={150 + NODO} height={caja.h + PAD} fill="transparent" />
            </g>
          )
        }))}
      </svg>
    </div>
  )
}

/** Resumen del recorrido de un nodo (texto bajo el río). */
export function describirFoco(flujo: FlujoPruebas, foco: NonNullable<FocoRio>): { titulo: string; lineas: string[] } {
  const { areas, secciones, pruebas, cubo, total } = flujo
  const pct = (v: number, de: number) => `${fmtN(de ? (v / de) * 100 : 0, 0)} %`
  const top = (vals: { k: string; v: number }[], de: number, n = 3) => vals.filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n).map(x => `${x.k} (${pct(x.v, de)})`).join(", ")
  if (foco.col === "area") {
    const a = areas[foco.i]
    const porSec = secciones.map((s, j) => ({ k: s.clave, v: cubo[foco.i][j].reduce((x, y) => x + y, 0) }))
    const porP = pruebas.map((p, q) => ({ k: p.clave, v: secciones.reduce((x, _s, j) => x + cubo[foco.i][j][q], 0) })).filter(x => !x.k.startsWith("Resto"))
    return { titulo: `${a.agrupa ? a.clave : etiquetaArea(a.clave)}: ${fmtN(a.v)} pruebas (${pct(a.v, total)} del total)`, lineas: [`Secciones: ${top(porSec, a.v)}.`, `Lo más pedido: ${top(porP, a.v)}.`] }
  }
  if (foco.col === "seccion") {
    const s = secciones[foco.i]
    const porA = areas.map((a, i) => ({ k: a.agrupa ? a.clave : etiquetaArea(a.clave), v: cubo[i][foco.i].reduce((x, y) => x + y, 0) }))
    const porP = pruebas.map((p, q) => ({ k: p.clave, v: areas.reduce((x, _a, i) => x + cubo[i][foco.i][q], 0) })).filter(x => !x.k.startsWith("Resto"))
    return { titulo: `${s.clave}: ${fmtN(s.v)} pruebas (${pct(s.v, total)} del total)`, lineas: [`La piden sobre todo: ${top(porA, s.v)}.`, `Pruebas principales: ${top(porP, s.v) || "—"}.`] }
  }
  const p = pruebas[foco.i]
  const porA = areas.map((a, i) => ({ k: a.agrupa ? a.clave : etiquetaArea(a.clave), v: secciones.reduce((x, _s, j) => x + cubo[i][j][foco.i], 0) }))
  return { titulo: `${p.clave}: ${fmtN(p.v)} ${p.agrupa ? `pruebas (${fmtN(p.agrupa)} pruebas distintas)` : "peticiones"}`, lineas: [`Dónde se pide: ${top(porA, p.v, 4)}.`] }
}
