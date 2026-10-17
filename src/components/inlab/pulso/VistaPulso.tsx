"use client"

/**
 * «Pulso del laboratorio»: la pantalla de entrada de InLab Analytics. Todo se entiende de un
 * vistazo y está conectado (work areas, prioridad y periodo del dashboard):
 *
 *   · Cifras vivas — peticiones, tubos y etiquetas, pruebas, extracción, calidad (con tendencia)
 *   · Reloj de 24 horas — tubos por hora de un día medio o de un día concreto, «Reproducir el día»
 *   · El río — work areas → secciones → pruebas (Sankey con recorridos)
 *   · El año en un vistazo — calendario de toda la cobertura; clic en un día = su detalle
 *   · Lo que dicen los datos — hallazgos con reglas fijas (lib/inlab/hallazgos.ts)
 *   · Modo pantalla — todo lo anterior a pantalla completa, rotando solo (PulsoTV)
 *
 * Solo lee lo que el dashboard ya tiene (Dataset, DatasetPruebas) más las parejas de pruebas.
 */
import dynamic from "next/dynamic"
import { useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { IconCalendar, IconMonitor, IconPause, IconPlay, IconX } from "@/components/ui/Icons"
import {
  esSospechosa, etiquetaArea, grupoArea, kpisComparables, delta, peticionesDisponibles, serieMediana, serieTasaEventos, serieVolumen,
  tendenciaTiempo, tiemposPorTramo, validacionesRapidas, VALIDACION_RAPIDA, type Dataset, type Filtros, type Rango,
} from "@/lib/inlab/analytics"
import { kpisPruebas, seriePrueba, tendenciasPruebas, type DatasetPruebas } from "@/lib/inlab/pruebas-analytics"
import {
  OTRAS_AREAS, actividadPorDia, flujoPruebas, fmtHora, rankingAreas, relojDia, resumenDia, valorDia, type ModoReloj,
} from "@/lib/inlab/pulso"
import { hallazgos, type DestinoHallazgo, type Hallazgo } from "@/lib/inlab/hallazgos"
import { fetcherJuntas, urlJuntas } from "../PanelJuntas"
import { fmtCompacto, fmtDia, fmtMin, fmtN } from "../charts"
import { colorAreaPorPosicion, GRIS } from "../colores"
import { Nota, Panel, Segmentado } from "../ui"
import { CalendarioAnual } from "./CalendarioAnual"
import { RelojDia, useReproduccion } from "./RelojDia"
import { RioPruebas, describirFoco, type FocoRio } from "./RioPruebas"
import { CifraViva, TarjetaHallazgo, type CifraDato } from "./piezas"

const PulsoTV = dynamic(() => import("./PulsoTV").then(m => m.PulsoTV), { ssr: false })

export interface VistaPulsoProps {
  /** Dataset recortado a la ventana del periodo (como el resto de vistas) */
  ds: Dataset
  /** Dataset de toda la cobertura (calendario y día elegido fuera del periodo) */
  dsTodo: Dataset
  dp: DatasetPruebas | null
  dpTodo: DatasetPruebas | null
  /** true mientras llegan las pruebas (se piden aparte) */
  cargandoPruebas?: boolean
  rango: Rango
  filtros: Filtros
  onFiltro?: (patch: Partial<Filtros>) => void
  hospitalIds: string[]
  hospitalNombre: string
  onIr?: (destino: DestinoHallazgo) => void
}

type TipoReloj = ModoReloj["tipo"]

export function VistaPulso({ ds, dsTodo, dp, dpTodo, cargandoPruebas = false, rango, filtros, onFiltro, hospitalIds, hospitalNombre, onIr }: VistaPulsoProps) {
  const [tipoReloj, setTipoReloj] = useState<TipoReloj>("laborable")
  const ultimoDia = useMemo(() => [...ds.dias].reverse().find(d => d >= rango.desde && d <= rango.hasta) ?? dsTodo.dias[dsTodo.dias.length - 1] ?? null, [ds.dias, dsTodo.dias, rango])
  const [diaElegido, setDia] = useState<string | null>(null)
  const dia = diaElegido && dsTodo.dias.includes(diaElegido) ? diaElegido : ultimoDia
  const [focoRio, setFocoRio] = useState<FocoRio>(null)
  const [tv, setTv] = useState(false)
  const refReloj = useRef<HTMLDivElement>(null)

  // ── Cifras ──
  const conPet = peticionesDisponibles(ds, filtros)
  const comp = useMemo(() => kpisComparables(ds, rango, filtros), [ds, rango, filtros])
  const { k, kp, cmp } = comp
  // Tiempo de extracción: sin filtro de áreas, solo las de Extracciones (con todas, urgencias y
  // plantas —que validan sin circuito— hunden la mediana a < 1 min y no mide nada)
  const areasExtr = useMemo(() => ds.areas.filter(a => grupoArea(a) === "Extracciones"), [ds.areas])
  const soloExtr = filtros.areas.length === 0 && areasExtr.length > 0
  const fT = useMemo(() => (soloExtr ? { ...filtros, areas: areasExtr } : filtros), [filtros, soloExtr, areasExtr])
  const vr = useMemo(() => validacionesRapidas(ds, rango, fT), [ds, rango, fT])
  const vrPrev = useMemo(() => (kp ? validacionesRapidas(ds, cmp.anterior, fT).total : null), [ds, cmp, fT, kp])
  const extr = useMemo(() => tiemposPorTramo(ds, rango, fT).find(t => t.clave === "EXTRACCION") ?? null, [ds, rango, fT])
  const extrPrev = useMemo(() => (kp ? tiemposPorTramo(ds, cmp.anterior, fT).find(t => t.clave === "EXTRACCION") ?? null : null), [ds, cmp, fT, kp])
  const kpr = useMemo(() => (dp ? kpisPruebas(dp, rango, filtros) : null), [dp, rango, filtros])
  const tpr = useMemo(() => (dp ? tendenciasPruebas(dp, rango, filtros) : null), [dp, rango, filtros])
  const series = useMemo(() => ({
    volumen: serieVolumen(ds, rango, filtros, conPet ? "peticiones" : "unidades"),
    tubos: serieVolumen(ds, rango, filtros, "unidades"),
    pruebas: dp ? seriePrueba(dp, rango, filtros, null) : [],
    extraccion: serieMediana(ds, rango, fT, "EXTRACCION").p50,
    calidad: serieTasaEventos(ds, rango, filtros),
  }), [ds, dp, rango, filtros, fT, conPet])

  const cifras = useMemo<CifraDato[]>(() => {
    const porDia = (v: number) => (k.dias ? v / k.dias : 0)
    const tt = tendenciaTiempo(extr?.p50 ?? null, vr.total, vrPrev)
    return [
      { id: "peticiones", label: conPet ? "Peticiones" : "Tubos y etiquetas", valor: fmtCompacto(conPet ? k.ordenes ?? 0 : k.unidades), detalle: `${fmtN(porDia(conPet ? k.ordenes ?? 0 : k.unidades))} al día · ${fmtN(k.dias)} días`, delta: kp ? delta(conPet ? k.ordenes : k.unidades, conPet ? kp.ordenes : kp.unidades) : null, serie: series.volumen, color: "#5EEAD4" },
      { id: "tubos", label: "Tubos y etiquetas", valor: fmtCompacto(k.unidades), detalle: conPet && k.ordenes ? `${fmtN(k.unidades / k.ordenes, 2)} por petición` : `${fmtN(porDia(k.unidades))} al día`, delta: kp ? delta(k.unidades, kp.unidades) : null, serie: series.tubos, color: "#FDBA74" },
      { id: "pruebas", label: "Pruebas solicitadas", valor: kpr ? (kpr.solicitadas ? fmtCompacto(kpr.solicitadas) : "—") : cargandoPruebas ? "…" : "—", detalle: kpr?.porPeticion ? `${fmtN(kpr.porPeticion, 1)} por petición · ${fmtN(kpr.distintas)} distintas` : kpr ? "Sin pruebas cargadas en el periodo" : cargandoPruebas ? "Cargando pruebas…" : "La carga no trae pruebas", delta: tpr?.solicitadas ?? null, neutra: true, serie: series.pruebas, color: "#C4B5FD" },
      { id: "extraccion", label: soloExtr ? "Extracción en Extracciones · la mitad en menos de" : "Extracción · la mitad en menos de", valor: fmtMin(extr?.p50), detalle: extr?.n ? `9 de cada 10 en menos de ${fmtMin(extr.p90)}` : "Sin hitos suficientes", delta: kp ? delta(extr?.p50 ?? null, extrPrev?.p50 ?? null) : null, mejorSiBaja: true, neutra: tt.neutra, motivoNeutra: tt.motivo, serie: series.extraccion, color: "#A5B4FC", aviso: esSospechosa(vr.total) ? `${fmtN(vr.total.pct, 1)} % validadas en < ${VALIDACION_RAPIDA.umbralMin} min` : null },
      { id: "calidad", label: "Eventos de calidad / 1.000 tubos", valor: fmtN(k.tasaEventos ?? 0, 1), detalle: `${fmtN(k.eventos)} reimpresiones, anulaciones e incidencias`, delta: kp ? delta(k.tasaEventos, kp.tasaEventos) : null, mejorSiBaja: true, serie: series.calidad, color: "#FDA4AF" },
    ].filter(c => conPet || c.id !== "tubos")
  }, [k, kp, conPet, kpr, tpr, extr, extrPrev, vr, vrPrev, series, cargandoPruebas, soloExtr])

  // ── Áreas: orden y colores comunes al reloj y al río ──
  const ranking = useMemo(() => rankingAreas(ds, rango, filtros).map(x => x.area), [ds, rango, filtros])
  const colorArea = useMemo(() => {
    const m = new Map(ranking.slice(0, 5).map((a, i) => [a, colorAreaPorPosicion(i)]))
    return (a: string) => m.get(a) ?? GRIS
  }, [ranking])

  // ── Reloj ──
  const diaReloj = tipoReloj === "dia" ? dia : null
  const modo: ModoReloj = diaReloj ? { tipo: "dia", d: diaReloj } : { tipo: tipoReloj === "finde" ? "finde" : "laborable" }
  const reloj = useMemo(() => {
    const m: ModoReloj = diaReloj ? { tipo: "dia", d: diaReloj } : { tipo: tipoReloj === "finde" ? "finde" : "laborable" }
    return relojDia(diaReloj ? dsTodo : ds, rango, filtros, m, ranking)
  }, [ds, dsTodo, rango, filtros, ranking, tipoReloj, diaReloj])
  const relojLaborable = useMemo(() => relojDia(ds, rango, filtros, { tipo: "laborable" }, ranking), [ds, rango, filtros, ranking])
  const colores = reloj.grupos.map(g => (g === OTRAS_AREAS ? GRIS : colorArea(g)))
  const { t: tRepro, setT: setTRepro, reproduciendo, reproducir, parar, ref: refRepro } = useReproduccion({ auto: true, clave: `${modo.tipo}|${modo.tipo === "dia" ? modo.d : ""}|${rango.desde}|${rango.hasta}|${filtros.areas.join(",")}` })
  const subtitulo = modo.tipo === "dia" ? `el ${fmtDia(modo.d, { day: "numeric", month: "short" })}` : modo.tipo === "finde" ? "en fin de semana" : "en un día laborable"
  const totGrupos = reloj.grupos.map((_, g) => reloj.horas.reduce((s, h) => s + h.v[g], 0))

  // ── Río ──
  const flujo = useMemo(() => (dp ? flujoPruebas(dp, rango, filtros) : null), [dp, rango, filtros])
  const focoValido = focoRio && flujo && focoRio.i < (focoRio.col === "area" ? flujo.areas.length : focoRio.col === "seccion" ? flujo.secciones.length : flujo.pruebas.length) ? focoRio : null
  const descFoco = flujo && focoValido ? describirFoco(flujo, focoValido) : null

  // ── Calendario ──
  const porDia = useMemo(() => actividadPorDia(dsTodo, filtros), [dsTodo, filtros])
  const rDia = useMemo(() => (dia ? resumenDia(dsTodo, dpTodo, dia, filtros) : null), [dsTodo, dpTodo, dia, filtros])
  const relojDiaElegido = useMemo(() => (dia ? relojDia(dsTodo, rango, filtros, { tipo: "dia", d: dia }, ranking) : null), [dsTodo, rango, filtros, dia, ranking])
  const coloresDia = relojDiaElegido ? relojDiaElegido.grupos.map(g => (g === OTRAS_AREAS ? GRIS : colorArea(g))) : []

  // ── Hallazgos ──
  const { data: juntas } = useSWR(hospitalIds.length ? urlJuntas(hospitalIds, rango, filtros.areas) : null, fetcherJuntas, { revalidateOnFocus: false, keepPreviousData: true, dedupingInterval: 60_000 })
  const lista = useMemo(() => hallazgos({ ds, dp, rango, filtros, juntas: juntas ?? null }), [ds, dp, rango, filtros, juntas])

  const irA = (h: Hallazgo) => {
    if (!h.ir) return
    if ("dia" in h.ir) { setDia(h.ir.dia); setTipoReloj("dia"); refReloj.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return }
    onIr?.(h.ir)
  }
  const elegirDia = (d: string) => { setDia(d) }
  const verDiaEnReloj = () => { setTipoReloj("dia"); refReloj.current?.scrollIntoView({ behavior: "smooth", block: "center" }) }

  const hastaCobertura = dsTodo.dias[dsTodo.dias.length - 1]
  const unidadCal = dsTodo.actividad.some(a => a.ordenes !== null) ? "peticiones" : "tubos y etiquetas"

  return (
    <div className="space-y-5">
      {/* ── Cabecera en tinta: cifras + reloj ── */}
      <section className="pulso-hero relative overflow-hidden rounded-3xl p-5 text-white sm:p-7">
        <div className="pulso-aurora" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-teal-200"><span className="pulso-latido" aria-hidden="true" />Pulso del laboratorio</p>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-[-.02em] sm:text-2xl">{hospitalNombre}</h2>
              <p className="mt-1 text-xs text-slate-300">
                {fmtDia(rango.desde, { day: "numeric", month: "long", year: "numeric" })} — {fmtDia(rango.hasta, { day: "numeric", month: "long", year: "numeric" })}
                {filtros.areas.length > 0 && ` · ${filtros.areas.length === 1 ? etiquetaArea(filtros.areas[0]) : `${filtros.areas.length} work areas`}`}
                {filtros.urgencia !== "todas" && ` · ${filtros.urgencia === "urgente" ? "urgentes" : "normales"}`}
                {hastaCobertura && ` · datos hasta el ${fmtDia(hastaCobertura, { day: "numeric", month: "short", year: "numeric" })}`}
              </p>
            </div>
            <button type="button" onClick={() => setTv(true)} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 self-start rounded-xl border border-white/15 bg-white/[.07] px-4 text-sm font-bold text-white transition-colors hover:bg-white/[.14] focus-visible:outline-2 focus-visible:outline-teal-300">
              <IconMonitor size={16} />Modo pantalla
            </button>
          </div>

          <div className={`mt-5 grid grid-cols-2 gap-3 ${cifras.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
            {cifras.map(c => <CifraViva key={c.id} c={c} />)}
          </div>

          <div ref={refReloj} className="mt-6 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)]">
            <div ref={refRepro} className="text-slate-100">
              <RelojDia reloj={reloj} colores={colores} t={tRepro} subtitulo={subtitulo} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-teal-200">El reloj de 24 horas</p>
              <h3 className="mt-1 text-lg font-extrabold">Tubos y etiquetas por hora {subtitulo}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="pulso-segmentado">
                  <Segmentado<TipoReloj> etiqueta="Qué día mostrar" valor={tipoReloj} onChange={setTipoReloj}
                    opciones={[{ value: "laborable", label: "Laborable medio" }, { value: "finde", label: "Fin de semana" }, ...(dia ? [{ value: "dia" as const, label: fmtDia(dia, { day: "numeric", month: "short" }) }] : [])]} />
                </div>
                <button type="button" onClick={() => (reproduciendo ? parar() : reproducir(tRepro !== null && tRepro < 24 ? tRepro : 0))}
                  className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl bg-teal-400 px-4 text-xs font-extrabold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-white">
                  {reproduciendo ? <><IconPause size={14} />Pausa</> : <><IconPlay size={14} />Reproducir el día</>}
                </button>
              </div>
              <label className="mt-3 block">
                <span className="sr-only">Hora del día</span>
                <input type="range" min={0} max={24} step={0.25} value={tRepro ?? 24}
                  onChange={e => { parar(); const v = Number(e.target.value); setTRepro(v >= 24 ? null : v) }}
                  className="pulso-rango w-full" aria-valuetext={tRepro === null ? "Día completo" : `${fmtHora(tRepro)}`} />
              </label>
              {reloj.dias === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No hay días de este tipo con datos en el periodo.</p>
              ) : (
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[.06] p-3"><dt className="text-[10px] font-bold text-slate-400">Hora punta</dt><dd className="mt-1 text-lg font-extrabold tabular-nums">{reloj.pico ? `${reloj.pico.h}:00` : "—"}</dd><dd className="text-[10.5px] text-slate-400">{reloj.pico ? `${fmtN(reloj.pico.pct, 0)} % del día` : ""}</dd></div>
                  <div className="rounded-xl bg-white/[.06] p-3"><dt className="text-[10px] font-bold text-slate-400">Mitad del día</dt><dd className="mt-1 text-lg font-extrabold tabular-nums">{fmtHora(reloj.mitadA)}</dd><dd className="text-[10.5px] text-slate-400">50 % del trabajo</dd></div>
                  <div className="rounded-xl bg-white/[.06] p-3"><dt className="text-[10px] font-bold text-slate-400">Grueso del día</dt><dd className="mt-1 text-lg font-extrabold tabular-nums">{fmtHora(reloj.inicio)}–{fmtHora(reloj.fin)}</dd><dd className="text-[10.5px] text-slate-400">90 % del trabajo</dd></div>
                </dl>
              )}
              <ul className="mt-4 space-y-1.5">
                {reloj.grupos.map((g, i) => (
                  <li key={g}>
                    <button type="button" disabled={!onFiltro || g === OTRAS_AREAS} onClick={() => onFiltro?.({ areas: [g], puesto: null })}
                      className="flex min-h-[30px] w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs enabled:cursor-pointer enabled:hover:bg-white/[.07]" title={g === OTRAS_AREAS ? undefined : `Ver solo ${etiquetaArea(g)}`}>
                      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colores[i] }} /><span className="truncate font-bold">{g === OTRAS_AREAS ? g : etiquetaArea(g)}</span></span>
                      <span className="tabular-nums text-slate-300">{fmtN(reloj.total ? (totGrupos[i] / reloj.total) * 100 : 0, 0)} %</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10.5px] leading-4 text-slate-400">
                {modo.tipo === "dia" ? "Tubos y etiquetas de ese día." : `Media de ${fmtN(reloj.dias)} ${modo.tipo === "finde" ? "sábados y domingos" : "días laborables"} cargados del periodo.`} Por hora de impresión: InLab no guarda la hora de la petición.
                {(filtros.urgencia !== "todas" || filtros.consumible) && " Sin filtro de prioridad ni de tubo: la actividad por hora no los separa."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── El río ── */}
      <Panel eyebrow="El río" titulo="De dónde viene el trabajo y adónde va"
        texto="Pruebas solicitadas en el periodo: qué work areas las piden, a qué sección del laboratorio van y cuáles son las más pedidas. Pasa el cursor o pulsa un área, una sección o una prueba para seguir su recorrido."
        accion={flujo && <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold tabular-nums text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">{fmtCompacto(flujo.total)} pruebas</span>}>
        {!flujo ? (
          cargandoPruebas
            ? <div className="h-[380px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" aria-busy="true" aria-label="Cargando pruebas" />
            : <Nota>Las cargas de este hospital no traen las pruebas pedidas: vuelve a cargar la base de datos completa (con dbo.LabOrder_Tests).</Nota>
        ) : flujo.total === 0 ? (
          <Nota>No hay pruebas cargadas en este periodo{dp && dp.dias.length ? ` (hay del ${fmtDia(dp.dias[0], { day: "numeric", month: "short", year: "numeric" })} al ${fmtDia(dp.dias[dp.dias.length - 1], { day: "numeric", month: "short", year: "numeric" })})` : ""}.</Nota>
        ) : (
          <>
            <div className="text-slate-700 dark:text-slate-200"><RioPruebas flujo={flujo} colorArea={colorArea} foco={focoValido} onFoco={setFocoRio} /></div>
            {descFoco ? (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/60">
                <div className="min-w-0 text-xs leading-5 text-gray-600 dark:text-slate-300">
                  <p className="font-extrabold text-gray-900 dark:text-white">{descFoco.titulo}</p>
                  {descFoco.lineas.map(l => <p key={l}>{l}</p>)}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {focoValido?.col === "area" && !flujo.areas[focoValido.i].agrupa && onFiltro && (
                    <button type="button" onClick={() => { onFiltro({ areas: [flujo.areas[focoValido.i].clave], puesto: null }); setFocoRio(null) }} className="min-h-[36px] cursor-pointer rounded-full bg-teal-600 px-3 text-[11px] font-extrabold text-white hover:bg-teal-700">Ver solo esta área</button>
                  )}
                  {focoValido?.col === "prueba" && !flujo.pruebas[focoValido.i].agrupa && onIr && (
                    <button type="button" onClick={() => onIr({ tab: "pruebas", prueba: flujo.pruebas[focoValido.i].clave })} className="min-h-[36px] cursor-pointer rounded-full bg-violet-600 px-3 text-[11px] font-extrabold text-white hover:bg-violet-700">Ver en Pruebas</button>
                  )}
                  <button type="button" onClick={() => setFocoRio(null)} aria-label="Quitar selección" className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700"><IconX size={14} /></button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-gray-400">Cada prueba cuenta una vez por petición; los perfiles (Hemograma, Coagulación…) cuentan como una. «Resto de pruebas» agrupa las que no están entre las más pedidas.</p>
            )}
          </>
        )}
      </Panel>

      {/* ── El año en un vistazo ── */}
      <Panel eyebrow="El año en un vistazo" titulo={`Cada día cargado, por ${unidadCal}`}
        texto="Más intenso = más actividad (por cuantiles, para que los fines de semana no aplasten la escala). Rayado = día sin datos cargados, no un día sin trabajo. Atenuado = fuera del periodo elegido. Pulsa un día para ver su detalle.">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 text-slate-500 dark:text-slate-400">
            {dsTodo.dias.length > 0 && <CalendarioAnual porDia={porDia} desde={dsTodo.dias[0]} hasta={hastaCobertura} rango={rango} seleccionado={dia} onDia={elegirDia} unidad={unidadCal} />}
            <label className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800">
              <IconCalendar size={14} className="text-teal-600" /><span className="text-[10px] font-bold text-gray-400">Ir a un día</span>
              <input type="date" aria-label="Elegir día" min={dsTodo.dias[0]} max={hastaCobertura} value={dia ?? ""} onChange={e => { if (e.target.value) setDia(e.target.value) }} className="bg-transparent font-semibold text-gray-700 outline-none dark:text-slate-200" />
            </label>
          </div>
          {rDia && (
            <aside className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50" aria-live="polite">
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-teal-700 dark:text-teal-300">Día elegido</p>
              <h3 className="mt-1 text-base font-extrabold text-gray-900 first-letter:uppercase dark:text-white">{fmtDia(rDia.d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
              {porDia.get(rDia.d) ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900/60"><p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtN(valorDia(porDia.get(rDia.d)))}</p><p className="text-[10px] font-semibold text-gray-400">{unidadCal}</p></div>
                    <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900/60"><p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{rDia.frenteAMedia === null ? "—" : `${rDia.frenteAMedia > 0 ? "+" : ""}${fmtN(rDia.frenteAMedia, 0)} %`}</p><p className="text-[10px] font-semibold text-gray-400">frente a un {fmtDia(rDia.d, { weekday: "long" })} normal</p></div>
                    {rDia.peticiones !== null && <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900/60"><p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtN(rDia.tubos)}</p><p className="text-[10px] font-semibold text-gray-400">tubos y etiquetas</p></div>}
                    <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900/60"><p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{rDia.pruebas === null ? "—" : fmtN(rDia.pruebas)}</p><p className="text-[10px] font-semibold text-gray-400">pruebas solicitadas</p></div>
                  </div>
                  {rDia.areaPrincipal && <p className="mt-3 text-[11px] leading-5 text-gray-500 dark:text-slate-300"><strong className="text-gray-800 dark:text-white">{etiquetaArea(rDia.areaPrincipal.area)}</strong> hizo el {fmtN(rDia.areaPrincipal.pct, 0)} % · {fmtN(rDia.pctUrgentes, 0)} % de tubos urgentes.</p>}
                  {relojDiaElegido && relojDiaElegido.total > 0 && (
                    <button type="button" onClick={verDiaEnReloj} className="mt-3 block w-full cursor-pointer rounded-xl text-slate-600 transition-colors hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900/60" title="Ver este día en el reloj grande">
                      <RelojDia reloj={relojDiaElegido} colores={coloresDia} t={null} tamano={220} subtitulo="ese día" compacto />
                      <span className="block pb-2 text-[10.5px] font-bold text-teal-700 dark:text-teal-300">Ver en el reloj grande y reproducir</span>
                    </button>
                  )}
                </>
              ) : <p className="mt-3 text-xs text-gray-500 dark:text-slate-300">Sin datos cargados ese día.</p>}
            </aside>
          )}
        </div>
      </Panel>

      {/* ── Hallazgos ── */}
      {lista.length > 0 && (
        <Panel eyebrow="Lo que dicen los datos" titulo="Hallazgos del periodo"
          texto="Frases calculadas con reglas fijas a partir de las mismas cifras del dashboard (con los filtros actuales). Solo aparecen si hay datos suficientes y la diferencia es relevante.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lista.slice(0, 6).map((h, i) => <TarjetaHallazgo key={h.id} h={h} onIr={h.ir && ("dia" in h.ir || onIr) ? irA : undefined} i={i} />)}
          </div>
        </Panel>
      )}

      {tv && (
        <PulsoTV
          onCerrar={() => setTv(false)}
          hospitalNombre={hospitalNombre} rango={rango} filtros={filtros} hastaCobertura={hastaCobertura}
          cifras={cifras}
          reloj={relojLaborable} colorArea={colorArea}
          flujo={flujo} porDia={porDia} dsTodo={dsTodo} unidadCal={unidadCal}
          hallazgos={lista}
        />
      )}
    </div>
  )
}

