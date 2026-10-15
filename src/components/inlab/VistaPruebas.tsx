"use client"

/**
 * Pestaña «Pruebas» de InLab Analytics: qué pruebas de laboratorio piden las peticiones del
 * periodo. Compartida entre el dashboard (/inlab) y el informe público (si el enlace las incluye).
 *
 * Lenguaje: «peticiones que incluyen la prueba» (cada prueba una vez por petición); los perfiles
 * (Hemograma, Coagulación…) cuentan como una prueba. Ver lib/inlab/pruebas.ts.
 */
import { useDeferredValue, useMemo, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import { IconActivity, IconClipboardList, IconMicroscope, IconSearch, IconTrendingDown, IconTrendingUp, IconX, IconZap } from "@/components/ui/Icons"
import { alternarArea, etiquetaArea, granularidad, type Filtros, type Rango } from "@/lib/inlab/analytics"
import {
  cambiosPruebas, kpisPruebas, porSeccion, pruebaPorArea, rankingPruebas, seriePrueba, tendenciasPruebas,
  type DatasetPruebas, type ItemPrueba,
} from "@/lib/inlab/pruebas-analytics"
import { BarList, Donut, GRIS, TimeChart, fmtCompacto, fmtDia, fmtN } from "./charts"
import { Kpi, Nota, Panel } from "./ui"

export interface VistaPruebasProps {
  dp: DatasetPruebas
  rango: Rango
  filtros: Filtros
  onFiltro?: (patch: Partial<Filtros>) => void
  /** Áreas del Dataset principal (para alternar la selección al hacer clic en un área) */
  areas?: string[]
}

/** Color fijo por sección (el mismo en el donut, el ranking y la leyenda). */
const COLOR_SECCION: Record<string, string> = {
  "Bioquímica": TEAL,
  "Hematología": "#E11D48",
  "Hemostasia": "#7C3AED",
  "Banco de sangre": "#BE123C",
  "Orina": "#CA8A04",
  "Inmunología": "#6366F1",
  "Serología": "#0EA5E9",
  "Microbiología": "#16A34A",
  "Urgencias": ORANGE,
  "Hormonas": "#DB2777",
  "Fármacos y tóxicos": "#A16207",
  "Genética y molecular": "#0891B2",
}
const colorSeccion = (s: string) => COLOR_SECCION[s] ?? GRIS
const MAX_DONUT = 5

function Variacion({ v }: { v: number | null }) {
  if (v === null || !isFinite(v)) return null
  const r = Math.round(v * 10) / 10
  if (Math.abs(r) < 0.5) return <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">0 %</span>
  // Sin juicio de valor (más pruebas no es ni bueno ni malo): solo dirección
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-100" title="Variación por día con datos frente al periodo anterior de la misma duración">
      {r > 0 ? <IconTrendingUp size={11} /> : <IconTrendingDown size={11} />}{r > 0 ? "+" : ""}{r.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %
    </span>
  )
}

function FilaRanking({ it, max, activa, onClick, pos }: { it: ItemPrueba; max: number; activa: boolean; onClick: () => void; pos: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-500 dark:hover:bg-slate-800/60 ${activa ? "bg-teal-50/70 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="w-5 shrink-0 text-right text-[10px] font-bold tabular-nums text-gray-400">{pos}</span>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorSeccion(it.seccion) }} aria-hidden="true" />
          <span className="truncate text-xs font-bold text-gray-700 dark:text-gray-200">{it.prueba}</span>
          {it.parametros > 1 && <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200" title={`Perfil: agrupa ${it.parametros} parámetros que InLab registra por separado`}>perfil · {it.parametros}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-gray-800 dark:text-white">
          <Variacion v={it.delta} />
          <strong className="font-extrabold">{fmtN(it.n)}</strong>
          {it.pct !== null && <span className="w-12 text-right text-[10px] font-medium text-gray-400">{fmtN(it.pct, 1)} %</span>}
        </span>
      </div>
      <div className="ml-7 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/70">
        <div className="inlab-barra h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max(1, (it.n / max) * 100)}%`, background: colorSeccion(it.seccion), animationDelay: `${Math.min(pos, 8) * 40}ms` }} />
      </div>
    </button>
  )
}

export function VistaPruebas({ dp, rango, filtros, onFiltro, areas = [] }: VistaPruebasProps) {
  const k = useMemo(() => kpisPruebas(dp, rango, filtros), [dp, rango, filtros])
  const t = useMemo(() => tendenciasPruebas(dp, rango, filtros), [dp, rango, filtros])
  const ranking = useMemo(() => rankingPruebas(dp, rango, filtros), [dp, rango, filtros])
  const secciones = useMemo(() => porSeccion(ranking), [ranking])
  const cambios = useMemo(() => cambiosPruebas(ranking), [ranking])

  const [busqueda, setBusqueda] = useState("")
  const busq = useDeferredValue(busqueda.trim().toLocaleLowerCase("es"))
  const [seccion, setSeccion] = useState<string | null>(null)
  const [todas, setTodas] = useState(false)
  const [elegida, setElegida] = useState<string | null>(null)
  // Si la prueba elegida no está en el periodo/filtro, se vuelve al total
  const prueba = elegida && ranking.some(r => r.prueba === elegida) ? elegida : null

  const filtradas = useMemo(() => {
    const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es")
    const q = sinAcentos(busq)
    return ranking.filter(r => (!seccion || r.seccion === seccion) && (!q || sinAcentos(r.prueba).includes(q)))
  }, [ranking, seccion, busq])
  const visibles = todas || busq ? filtradas : filtradas.slice(0, 15)
  const posicion = useMemo(() => new Map(ranking.map((r, i) => [r.prueba, i + 1])), [ranking])
  const max = Math.max(1, ...filtradas.map(r => r.n))

  const serie = useMemo(() => seriePrueba(dp, rango, filtros, prueba), [dp, rango, filtros, prueba])
  const porArea = useMemo(() => (prueba ? pruebaPorArea(dp, rango, filtros, prueba) : []), [dp, rango, filtros, prueba])
  const itemElegido = prueba ? ranking.find(r => r.prueba === prueba) ?? null : null

  const donut = secciones.slice(0, MAX_DONUT).map(s => ({ label: s.seccion, valor: s.n, color: colorSeccion(s.seccion) }))
  const resto = secciones.slice(MAX_DONUT).reduce((n, s) => n + s.n, 0)
  if (resto > 0) donut.push({ label: "Resto", valor: resto, color: "#CBD5E1" })

  const vs = t.cmp.comparable ? `vs ${fmtDia(t.cmp.anterior.desde)} – ${fmtDia(t.cmp.anterior.hasta)}` : undefined
  const semanal = granularidad(rango) === "semana"
  const filtroNoAplica = !!filtros.consumible || !!filtros.puesto

  if (k.solicitadas === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><IconMicroscope size={22} /></span>
        <p className="mt-4 text-sm font-extrabold text-gray-800 dark:text-white">No hay pruebas en este periodo</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500 dark:text-slate-400">
          {dp.dias.length === 0
            ? "Las cargas de este hospital no incluyen las pruebas pedidas. Vuelve a cargar la base de datos completa (con dbo.LabOrder_Tests) o la exportación con la columna «Pruebas»."
            : `Hay pruebas cargadas del ${fmtDia(dp.dias[0], { day: "numeric", month: "short", year: "numeric" })} al ${fmtDia(dp.dias[dp.dias.length - 1], { day: "numeric", month: "short", year: "numeric" })}: elige un periodo dentro de esas fechas o revisa las work areas.`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Pruebas solicitadas" valor={fmtCompacto(k.solicitadas)} detalle={`${fmtN(k.dias ? k.solicitadas / k.dias : 0)} al día · ${fmtN(k.dias)} días con datos`} delta={t.solicitadas} comparadoCon={vs} tendenciaNeutra icono={<IconClipboardList size={20} />} color={TEAL} />
        <Kpi label="Pruebas por petición" valor={fmtN(k.porPeticion, 1)} detalle={`en ${fmtN(k.peticiones)} peticiones con pruebas`} delta={t.porPeticion} comparadoCon={vs} tendenciaNeutra icono={<IconActivity size={20} />} color={ORANGE} />
        <Kpi label="Pruebas distintas" valor={fmtN(k.distintas)} detalle="pruebas y perfiles diferentes pedidos" icono={<IconMicroscope size={20} />} color="#6366F1" />
        <Kpi label="En peticiones urgentes" valor={`${fmtN(k.pctUrgentes, 1)} %`} detalle="de las pruebas solicitadas" icono={<IconZap size={20} />} color="#E11D48" />
      </div>
      <Nota>
        Cada prueba cuenta <strong>una vez por petición</strong> (InLab a veces la registra repetida en el mismo pedido) y los parámetros de un mismo perfil —Hemograma, Estudio de coagulación, Sistemático de orina, Proteinograma— cuentan como una sola prueba.
        {!t.cmp.comparable && t.cmp.motivo ? ` Sin variaciones: ${t.cmp.motivo}` : " Las variaciones comparan por día con datos con el periodo anterior de la misma duración."}
        {filtroNoAplica && " El filtro de tubo o puesto no se aplica aquí: una prueba no tiene tubo ni puesto propios."}
      </Nota>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Panel
          eyebrow="Qué se pide"
          titulo="Pruebas más pedidas"
          texto="Peticiones que incluyen cada prueba y qué % de las peticiones con pruebas la piden. Elige una para ver su evolución y en qué áreas se pide."
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Buscar prueba</span>
              <IconSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar: colesterol, TSH, hemograma…"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <span className="text-[11px] font-semibold text-gray-400">{fmtN(filtradas.length)} de {fmtN(ranking.length)}</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por sección">
            {secciones.map(s => {
              const activa = seccion === s.seccion
              return (
                <button key={s.seccion} type="button" aria-pressed={activa} onClick={() => setSeccion(activa ? null : s.seccion)}
                  className={`inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition-colors ${activa ? "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-100" : "border-slate-200 text-gray-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: colorSeccion(s.seccion) }} aria-hidden="true" />{s.seccion}
                </button>
              )
            })}
          </div>
          {visibles.length === 0
            ? <p className="py-6 text-center text-xs text-gray-400">Ninguna prueba coincide con «{busqueda}»</p>
            : <div className="space-y-0.5">{visibles.map(it => <FilaRanking key={it.prueba} it={it} max={max} pos={posicion.get(it.prueba) ?? 0} activa={prueba === it.prueba} onClick={() => setElegida(prueba === it.prueba ? null : it.prueba)} />)}</div>}
          {!busq && filtradas.length > 15 && (
            <button type="button" onClick={() => setTodas(v => !v)} className="mt-2 min-h-[36px] cursor-pointer px-2 text-[11px] font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300">
              {todas ? "Ver menos" : `Ver las ${fmtN(filtradas.length)}`}
            </button>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel eyebrow="Por sección" titulo="Reparto por sección del laboratorio" texto="Sección según la etiqueta del tubo en InLab. Clic en una sección para filtrar el ranking.">
            <Donut items={donut} centro={fmtCompacto(k.solicitadas)} subcentro="pruebas" />
            <ul className="mt-4 space-y-1">
              {secciones.map(s => (
                <li key={s.seccion}>
                  <button type="button" onClick={() => setSeccion(seccion === s.seccion ? null : s.seccion)} aria-pressed={seccion === s.seccion}
                    className={`flex min-h-[32px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${seccion === s.seccion ? "bg-teal-50/70 dark:bg-teal-950/30" : ""}`}>
                    <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorSeccion(s.seccion) }} aria-hidden="true" /><span className="truncate font-bold text-gray-700 dark:text-gray-200">{s.seccion}</span><span className="text-[10px] text-gray-400">{fmtN(s.pruebas)} pruebas</span></span>
                    <span className="tabular-nums text-gray-800 dark:text-white"><strong>{fmtN(s.n)}</strong> <span className="text-[10px] text-gray-400">{fmtN((s.n / k.solicitadas) * 100, 1)} %</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {(cambios.suben.length > 0 || cambios.bajan.length > 0) && (
            <Panel eyebrow="Cambios" titulo="Lo que más sube y más baja" texto="Por día con datos, frente al periodo anterior. Solo pruebas con volumen suficiente.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {([["Suben", cambios.suben, <IconTrendingUp key="u" size={14} />], ["Bajan", cambios.bajan, <IconTrendingDown key="d" size={14} />]] as const).map(([titulo, lista, icono]) => (
                  <div key={titulo}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gray-500 dark:text-slate-300">{icono}{titulo}</p>
                    {lista.length === 0 ? <p className="text-[11px] text-gray-400">—</p> : (
                      <ul className="space-y-0.5">
                        {lista.map(it => (
                          <li key={it.prueba}>
                            <button type="button" onClick={() => setElegida(it.prueba)} className="flex min-h-[32px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60">
                              <span className="truncate font-bold text-gray-700 dark:text-gray-200">{it.prueba}</span>
                              <span className="shrink-0 tabular-nums font-extrabold text-gray-900 dark:text-white">{it.delta! > 0 ? "+" : ""}{fmtN(it.delta, 1)} %</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Panel
          eyebrow="Evolución"
          titulo={`${prueba ?? "Todas las pruebas"} ${semanal ? "por semana" : "por día"}`}
          texto={prueba ? "Peticiones que incluyen la prueba. Los huecos son días sin datos cargados." : "Pruebas solicitadas. Elige una prueba en el ranking para ver solo esa. Los huecos son días sin datos cargados."}
          accion={prueba ? <button type="button" onClick={() => setElegida(null)} className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-full bg-teal-50 px-3 text-[11px] font-bold text-teal-800 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-200"><IconX size={11} />Ver todas</button> : undefined}
        >
          <TimeChart series={[{ nombre: prueba ?? "Pruebas solicitadas", color: itemElegido ? colorSeccion(itemElegido.seccion) : TEAL, puntos: serie, area: true }]} />
          {itemElegido && (
            <p className="mt-3 text-[11px] leading-5 text-gray-500 dark:text-slate-300">
              <strong className="text-gray-800 dark:text-white">{fmtN(itemElegido.n)}</strong> peticiones la incluyen
              {itemElegido.pct !== null && <> ({fmtN(itemElegido.pct, 1)} % de las peticiones con pruebas)</>}
              {itemElegido.n > 0 && <> · {fmtN((itemElegido.urgentes / itemElegido.n) * 100, 1)} % urgentes</>}
              {itemElegido.delta !== null && <> · {itemElegido.delta >= 0 ? "+" : ""}{fmtN(itemElegido.delta, 1)} % al día frente al periodo anterior</>}.
            </p>
          )}
        </Panel>
        <Panel eyebrow="Dónde" titulo={prueba ? `${prueba} por área` : "Por área"} texto={prueba ? "Peticiones que la incluyen y qué % de las peticiones del área la piden. Clic para filtrar por área." : undefined}>
          {prueba
            ? <BarList
                items={porArea.map(a => ({ clave: a.area, label: etiquetaArea(a.area), valor: a.n, color: itemElegido ? colorSeccion(itemElegido.seccion) : TEAL, sub: a.pct !== null ? `la piden el ${fmtN(a.pct, 1)} % de sus peticiones` : undefined }))}
                seleccionado={filtros.areas}
                onSelect={onFiltro && areas.length ? (_v, item) => onFiltro({ areas: alternarArea(filtros.areas, item, areas), puesto: null }) : undefined}
                limite={8} />
            : <p className="py-8 text-center text-xs text-gray-400">Elige una prueba en el ranking para ver en qué áreas se pide.</p>}
        </Panel>
      </div>
    </div>
  )
}
