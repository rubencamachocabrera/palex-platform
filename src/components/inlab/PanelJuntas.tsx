"use client"

/**
 * «Se piden juntas»: con qué otras pruebas va cada prueba en la misma petición, la constelación
 * de pruebas afines (paneles que se piden siempre juntos) y las parejas más habituales.
 * Datos: GET /api/inlab/pruebas/juntas (lib/inlab/juntas.ts), calculados en servidor por meses.
 */
import { useMemo, useState } from "react"
import useSWR from "swr"
import { IconActivity, IconAlertCircle } from "@/components/ui/Icons"
import type { Filtros, Rango } from "@/lib/inlab/analytics"
import type { JuntasRespuesta, Pareja } from "@/lib/inlab/juntas-calculo"
import { PARES_MINIMO } from "@/lib/inlab/types"
import { fmtN } from "./charts"
import { colorSeccion } from "./colores"
import { Nota, Panel } from "./ui"

export function urlJuntas(hospitalIds: string[], rango: Rango, areas: string[], prueba?: string | null) {
  const q = new URLSearchParams({ hospitalIds: [...hospitalIds].sort().join(","), desde: rango.desde, hasta: rango.hasta })
  if (areas.length) q.set("areas", [...areas].sort().join(","))
  if (prueba) q.set("prueba", prueba)
  return `/api/inlab/pruebas/juntas?${q}`
}

export async function fetcherJuntas(url: string): Promise<JuntasRespuesta> {
  const r = await fetch(url)
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error(d?.error ?? "No se pudieron cargar las pruebas que se piden juntas")
  return d as JuntasRespuesta
}

const OPCIONES = { revalidateOnFocus: false, keepPreviousData: true, dedupingInterval: 60_000 } as const

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const fmtMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`

/** Nota de alcance: meses completos, sin prioridad, mínimo por celda. */
function NotaJuntas({ j, filtros }: { j: JuntasRespuesta; filtros: Filtros }) {
  const m = j.meses
  return (
    <Nota>
      Calculado por meses completos: {m.length === 1 ? fmtMes(m[0]) : `${fmtMes(m[0])} – ${fmtMes(m[m.length - 1])}`} ({fmtN(m.length)} {m.length === 1 ? "mes" : "meses"} con parejas cargadas, {fmtN(j.peticiones)} peticiones con pruebas).
      {" "}Solo combinaciones con al menos {PARES_MINIMO} peticiones en un mes y área.
      {filtros.urgencia !== "todas" && " El filtro de prioridad no se aplica: las parejas no se separan por urgencia."}
      {" "}«Veces más de lo esperado» compara con lo que pasaría si cada prueba se pidiera por su cuenta (1 = sin relación).
    </Nota>
  )
}

// ─── Compañeras de una prueba ────────────────────────────────────────────────

function Companeras({ j, onElegir }: { j: JuntasRespuesta; onElegir: (p: string) => void }) {
  const p = j.prueba
  if (!p) return null
  if (p.companeras.length === 0) return <p className="py-6 text-center text-xs text-gray-400">{p.nombre} no se pide con otras pruebas con frecuencia suficiente en este periodo.</p>
  return (
    <ul className="space-y-0.5">
      {p.companeras.slice(0, 15).map((c, i) => (
        <li key={c.prueba}>
          <button type="button" onClick={() => onElegir(c.prueba)} className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-500 dark:hover:bg-slate-800/60"
            title={`${fmtN(c.n)} peticiones con las dos. ${c.pctInversa !== null ? `El ${fmtN(c.pctInversa, 1)} % de las peticiones con ${c.prueba} incluye ${p.nombre}.` : ""}`}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorSeccion(c.seccion) }} aria-hidden="true" />
                <span className="truncate text-xs font-bold text-gray-700 dark:text-gray-200">{c.prueba}</span>
                {c.lift !== null && c.lift >= 1.5 && <span className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9.5px] font-extrabold tabular-nums text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">×{fmtN(c.lift, c.lift >= 10 ? 0 : 1)}</span>}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-gray-800 dark:text-white"><strong className="font-extrabold">{fmtN(c.pct, 1)} %</strong> <span className="text-[10px] text-gray-400">{fmtN(c.n)}</span></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/70">
              <div className="inlab-barra h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max(1, c.pct)}%`, background: colorSeccion(c.seccion), animationDelay: `${Math.min(i, 8) * 40}ms` }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ─── Constelación ────────────────────────────────────────────────────────────

interface NodoC { prueba: string; seccion: string; n: number; x: number; y: number; ang: number }

/**
 * Red circular de las parejas afines: cada prueba en el borde (agrupadas por sección), cada
 * pareja una curva por dentro. Grosor = peticiones con las dos; opacidad = fuerza (el menor de
 * los dos %). Pasar el cursor por una prueba enciende sus parejas.
 */
export function Constelacion({ afines, max = 40, seleccionada, onElegir, tamano = 720 }: {
  afines: Pareja[]; max?: number; seleccionada?: string | null; onElegir?: (p: string) => void; tamano?: number
}) {
  const [hover, setHover] = useState<string | null>(null)
  const foco = hover ?? seleccionada ?? null
  const { nodos, enlaces } = useMemo(() => {
    const lista = afines.slice(0, max)
    const info = new Map<string, { seccion: string; n: number }>()
    for (const p of lista) {
      // n de cada prueba: n(AB) / P(B|A)
      if (!info.has(p.a)) info.set(p.a, { seccion: p.seccionA, n: p.pctAB ? (p.n * 100) / p.pctAB : p.n })
      if (!info.has(p.b)) info.set(p.b, { seccion: p.seccionB, n: p.pctBA ? (p.n * 100) / p.pctBA : p.n })
    }
    const orden = [...info.entries()].sort((x, y) => x[1].seccion.localeCompare(y[1].seccion, "es") || x[0].localeCompare(y[0], "es"))
    const c = tamano / 2, R = tamano / 2 - 150
    const nodos = new Map<string, NodoC>()
    orden.forEach(([prueba, v], i) => {
      const ang = (i / orden.length) * Math.PI * 2 - Math.PI / 2
      nodos.set(prueba, { prueba, seccion: v.seccion, n: v.n, ang, x: c + R * Math.cos(ang), y: c + R * Math.sin(ang) })
    })
    return { nodos, enlaces: lista }
  }, [afines, max, tamano])

  if (nodos.size < 3) return <p className="py-8 text-center text-xs text-gray-400">No hay parejas afines suficientes en este periodo.</p>
  const c = tamano / 2
  const maxN = Math.max(...enlaces.map(e => e.n))
  const maxNodo = Math.max(...[...nodos.values()].map(n => n.n))
  const vecinos = foco ? new Set(enlaces.filter(e => e.a === foco || e.b === foco).flatMap(e => [e.a, e.b])) : null
  return (
    <div className="overflow-x-auto [contain:inline-size]">
      <svg viewBox={`0 0 ${tamano} ${tamano}`} className="mx-auto block w-full min-w-[520px] max-w-[720px]" role="img" aria-label={`Constelación de ${nodos.size} pruebas que se piden juntas`}>
        <circle cx={c} cy={c} r={tamano / 2 - 150} fill="none" className="stroke-slate-200/70 dark:stroke-slate-700/60" strokeDasharray="2 5" />
        <g>
          {enlaces.map((e, i) => {
            const A = nodos.get(e.a)!, B = nodos.get(e.b)!
            const activo = !foco || e.a === foco || e.b === foco
            const fuerza = Math.min(e.pctAB, e.pctBA) / 100
            const w = 1 + 5 * Math.sqrt(e.n / maxN)
            return (
              <path key={`${e.a}|${e.b}`} d={`M ${A.x} ${A.y} Q ${c + (A.x + B.x - 2 * c) * 0.18} ${c + (A.y + B.y - 2 * c) * 0.18} ${B.x} ${B.y}`}
                fill="none" stroke={colorSeccion(A.seccion)} strokeWidth={w} strokeLinecap="round"
                opacity={activo ? 0.25 + 0.6 * fuerza : 0.05}
                className="inlab-constelacion-enlace" style={{ animationDelay: `${Math.min(i, 30) * 25}ms`, transition: "opacity 200ms ease" }}>
                <title>{`${e.a} + ${e.b}: ${fmtN(e.n)} peticiones · el ${fmtN(e.pctAB, 0)} % de las de ${e.a} lleva ${e.b} · ×${fmtN(e.lift, 1)}`}</title>
              </path>
            )
          })}
        </g>
        <g>
          {[...nodos.values()].map(n => {
            const activo = !vecinos || vecinos.has(n.prueba)
            const r = 4 + 9 * Math.sqrt(n.n / maxNodo)
            const izq = Math.cos(n.ang) < 0
            const grados = (n.ang * 180) / Math.PI + (izq ? 180 : 0)
            const lx = c + (tamano / 2 - 150 + r + 8) * Math.cos(n.ang), ly = c + (tamano / 2 - 150 + r + 8) * Math.sin(n.ang)
            return (
              <g key={n.prueba} opacity={activo ? 1 : 0.25} style={{ transition: "opacity 200ms ease", cursor: onElegir ? "pointer" : undefined }}
                onMouseEnter={() => setHover(n.prueba)} onMouseLeave={() => setHover(null)} onClick={onElegir ? () => onElegir(n.prueba) : undefined}>
                <circle cx={n.x} cy={n.y} r={r} fill={colorSeccion(n.seccion)} className="stroke-white dark:stroke-slate-900" strokeWidth={2} />
                {foco === n.prueba && <circle cx={n.x} cy={n.y} r={r + 5} fill="none" stroke={colorSeccion(n.seccion)} strokeWidth={1.5} />}
                <text x={lx} y={ly} transform={`rotate(${grados} ${lx} ${ly})`} textAnchor={izq ? "end" : "start"} dominantBaseline="middle"
                  className={`text-[11px] ${foco === n.prueba ? "fill-slate-900 font-extrabold dark:fill-white" : "fill-slate-600 font-semibold dark:fill-slate-300"}`}>
                  {n.prueba.length > 28 ? `${n.prueba.slice(0, 27)}…` : n.prueba}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function PanelJuntas({ hospitalIds, rango, filtros, prueba, onElegir }: {
  hospitalIds: string[]; rango: Rango; filtros: Filtros; prueba: string | null; onElegir: (p: string) => void
}) {
  const general = useSWR(urlJuntas(hospitalIds, rango, filtros.areas), fetcherJuntas, OPCIONES)
  const deLaPrueba = useSWR(prueba ? urlJuntas(hospitalIds, rango, filtros.areas, prueba) : null, fetcherJuntas, OPCIONES)
  const j = general.data
  const error = general.error ?? deLaPrueba.error

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error instanceof Error ? error.message : "Error de red"}</p>
  if (!j) return <div className="card h-48 animate-pulse" aria-busy="true" aria-label="Cargando pruebas que se piden juntas" />
  if (j.meses.length === 0) {
    return (
      <section className="card flex items-start gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"><IconAlertCircle size={18} /></span>
        <div>
          <p className="text-sm font-extrabold text-gray-900 dark:text-white">Pruebas que se piden juntas: falta recargar</p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-300">Las cargas de este periodo son anteriores a esta función. Vuelve a cargar la base de datos del hospital (modo «Sustituir») para ver con qué pruebas se pide cada una.</p>
        </div>
      </section>
    )
  }
  const jp = deLaPrueba.data?.prueba?.nombre === prueba ? deLaPrueba.data : null
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Panel eyebrow="Se piden juntas" titulo={prueba ? `Con qué se pide ${prueba}` : "Parejas más habituales"}
          texto={prueba
            ? "De las peticiones con esta prueba, qué % incluye también cada una de las otras. «×» = veces más de lo esperado por azar. Clic para cambiar de prueba."
            : "Las combinaciones con más peticiones. Elige una prueba en el ranking o en la constelación para ver sus compañeras."}>
          {prueba
            ? (jp ? <Companeras j={jp} onElegir={onElegir} /> : <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" aria-busy="true" />)
            : (
              <ul className="space-y-1">
                {j.frecuentes.slice(0, 12).map(p => (
                  <li key={`${p.a}|${p.b}`}>
                    <button type="button" onClick={() => onElegir(p.a)} className="flex min-h-[36px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <span className="flex min-w-0 items-center gap-1.5 font-bold text-gray-700 dark:text-gray-200">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorSeccion(p.seccionA) }} aria-hidden="true" /><span className="truncate">{p.a}</span>
                        <span className="text-gray-400">+</span>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorSeccion(p.seccionB) }} aria-hidden="true" /><span className="truncate">{p.b}</span>
                      </span>
                      <span className="shrink-0 tabular-nums"><strong className="font-extrabold text-gray-900 dark:text-white">{fmtN(p.n)}</strong> <span className="text-[10px] text-gray-400">{fmtN(j.peticiones ? (p.n / j.peticiones) * 100 : 0, 1)} %</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
        <Panel eyebrow="Constelación" titulo="Pruebas que van de la mano"
          texto="Parejas que se piden juntas muchas más veces de lo esperado: suelen ser paneles clínicos (hormonas, tiroides, autoinmunidad, orina…). Grosor = peticiones; intensidad = lo inseparables que son."
          accion={<span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"><IconActivity size={12} />{fmtN(Math.min(40, j.afines.length))} parejas</span>}>
          <Constelacion afines={j.afines} seleccionada={prueba} onElegir={onElegir} />
        </Panel>
      </div>
      <NotaJuntas j={j} filtros={filtros} />
    </div>
  )
}
