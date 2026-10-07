"use client"

/**
 * Vistas analíticas de Inteligencia InLab, compartidas entre el dashboard interno
 * (/inlab) y el informe público (/share/inlab/[token]).
 *
 * Lenguaje (Sprint 26): solo dos volúmenes visibles —
 *   · «Peticiones»: pedidos distintos (cada petición cuenta una vez).
 *   · «Tubos y etiquetas»: cada tubo o etiqueta impresa (campo `unidades`; en InLab = filas).
 * Nunca «registros» ni «unidades» en pantalla. Tiempos: «la mitad en menos de» (mediana) y
 * «9 de cada 10 en menos de» (P90). Validaciones en < 1 min = aviso, nunca una mejora.
 */
import { useMemo, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import {
  IconActivity, IconAlertTriangle, IconClock, IconDroplet, IconFileText, IconPrinter, IconTrendingUp, IconZap,
} from "@/components/ui/Icons"
import {
  delta, eventosPor, granularidad, facturacion, heatmapSemanaHora, kpisComparables, porArea, porConsumible, porDiaSemana,
  porPuesto, prevision, serieMediana, serieTasaEventos, serieVolumen, tiemposPor, tiemposPorTramo, totalImporte,
  peticionesDisponibles, validacionesRapidas, tendenciaTiempo, esSospechosa, grupoArea, VALIDACION_RAPIDA,
  type Dataset, type Filtros, type Medida, type Rango, type Tarifa, type ValidacionRapida, alternarArea, etiquetaArea,
} from "@/lib/inlab/analytics"
import { EVENTO_LABEL, type EventoCategoria } from "@/lib/inlab/mapping"
import { TRAMO_AYUDA, TRAMO_CORTO, TRAMO_HITOS, TRAMO_LABEL, TRAMO_UNIDAD, TRAMOS, type Tramo } from "@/lib/inlab/types"
import {
  BarList, Columnas, Donut, HeatmapSemana, Leyenda, RangoTiempos, SERIE, TimeChart, colorConsumible,
  fmtCompacto, fmtDia, fmtEur, fmtMin, fmtN,
} from "./charts"
import { Kpi, Nota, NotaComparacion, Panel, Segmentado } from "./ui"

export interface VistaProps {
  ds: Dataset
  rango: Rango
  filtros: Filtros
  onFiltro?: (patch: Partial<Filtros>) => void
}

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)
const U = VALIDACION_RAPIDA

const EVENTO_COLOR: Record<EventoCategoria, string> = {
  REIMPRESION: ORANGE, RECHAZO: "#E11D48", ANULACION: "#6366F1", ERROR_IMPRESORA: "#0EA5E9", OTRO: "#94A3B8", INCIDENCIA: "#D946EF",
}

const NOMBRE_MEDIDA: Record<Medida, string> = { peticiones: "Peticiones", unidades: "Tubos y etiquetas", registros: "Tubos y etiquetas" }
const POR_QUE_TUBOS = "Las peticiones no se pueden separar por prioridad ni por tipo de tubo: con esos filtros se cuentan tubos y etiquetas."

/** Áreas del grupo Extracciones (las únicas que recorren el circuito completo). */
const areasExtraccion = (ds: Dataset) => ds.areas.filter(a => grupoArea(a) === "Extracciones")

/** Texto corto del aviso de un área: «15,8 % en < 1 min». */
const avisoCorto = (v: ValidacionRapida | undefined) => (esSospechosa(v) ? `${fmtN(v!.pct, 1)} % en < ${U.umbralMin} min` : null)

// ─── Aviso de validaciones sospechosamente rápidas ───────────────────────────

function AvisoValidaciones({ vr, compacto = false }: { vr: { total: ValidacionRapida; areas: ValidacionRapida[] }; compacto?: boolean }) {
  const afectadas = vr.areas.filter(esSospechosa)
  if (!esSospechosa(vr.total) && afectadas.length === 0) return null
  const t = vr.total
  return (
    <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/25 dark:text-amber-100">
      <p className="flex items-center gap-2 text-sm font-extrabold"><IconAlertTriangle size={16} />Validaciones sospechosamente rápidas</p>
      <p className="mt-1.5 text-xs leading-5">
        {t.pct !== null && <><strong>{fmtN(Math.round(t.rapidas))} de {fmtN(t.n)} peticiones ({fmtN(t.pct, 1)} %)</strong> se validaron en menos de {U.umbralMin} min desde la numeración. </>}
        En ese tiempo no da tiempo a llamar al paciente ni a extraer: indica que se imprimen las etiquetas y se valida la extracción sin ver al paciente (validación en bloque o de oficio).
        {!compacto && " No es rapidez: esos casos hacen que los tiempos parezcan mejores de lo que son."}
      </p>
      {afectadas.length > 0 && (
        <ul className={`mt-2 text-xs leading-5 ${compacto ? "flex flex-wrap gap-x-4 gap-y-1" : "space-y-1"}`}>
          {afectadas.slice(0, compacto ? 4 : 8).map(a => (
            <li key={a.clave}>
              <strong>{etiquetaArea(a.clave)}</strong>: {fmtN(a.pct, 1)} %{compacto ? "" : ` (${fmtN(Math.round(a.rapidas))} de ${fmtN(a.n)})`}
              {!compacto && (a.nivel === "sinCircuito"
                ? " · la mayoría se valida sin circuito: aquí el tiempo no mide la extracción."
                : a.p50SinRapidas !== null ? ` · sin contarlas, la mitad tarda menos de ${fmtMin(a.p50SinRapidas)}.` : "")}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Resumen ejecutivo ───────────────────────────────────────────────────────

export function VistaResumen({ ds, rango, filtros, onFiltro }: VistaProps) {
  // Tendencias solo con cobertura comparable; kp viene escalado a los días con datos del
  // periodo actual (si no es comparable, dias = 0 → sin tendencias). Ver kpisComparables().
  const comp = useMemo(() => kpisComparables(ds, rango, filtros), [ds, rango, filtros])
  const { k, cmp } = comp
  const prev = cmp.anterior
  const kp = comp.kp ?? { ...k, dias: 0 }
  const hayPrevio = kp.dias > 0
  const conPeticiones = k.ordenes !== null
  const medidaSerie: Medida = peticionesDisponibles(ds, filtros) ? "peticiones" : "unidades"
  const serie = useMemo(() => serieVolumen(ds, rango, filtros, medidaSerie), [ds, rango, filtros, medidaSerie])
  const cons = useMemo(() => porConsumible(ds, rango, filtros).slice(0, 6), [ds, rango, filtros])
  // porArea no filtra por área (sirve para los gráficos clicables): aquí solo las seleccionadas,
  // si no "X concentra el N %" podía referirse a un área no seleccionada y superar el 100 %
  const areas = useMemo(() => porArea(ds, rango, filtros).filter(a => !filtros.areas.length || filtros.areas.includes(a.clave)), [ds, rango, filtros])
  const vr = useMemo(() => validacionesRapidas(ds, rango, filtros), [ds, rango, filtros])
  const vrPrev = useMemo(() => (hayPrevio ? validacionesRapidas(ds, prev, filtros).total : null), [ds, prev, filtros, hayPrevio])
  const tTiempo = tendenciaTiempo(k.p50Total, vr.total, vrPrev)
  const tasa = k.tasaEventos ?? 0
  const tasaPrev = kp.tasaEventos
  const d = (a: number | null, b: number | null) => (hayPrevio ? delta(a, b) : null)
  const vs = `vs ${fmtDia(prev.desde)} – ${fmtDia(prev.hasta)}`
  const porDia = (v: number) => (k.dias ? v / k.dias : 0)
  const tramos = tiemposPorTramo(ds, rango, filtros).filter(t => t.n > 0 && t.clave !== "TOTAL")
  const cuello = tramos.reduce<typeof tramos[number] | null>((m, t) => (!m || (t.p90 ?? 0) > (m.p90 ?? 0) ? t : m), null)
  const topArea = areas[0]
  const varVolumen = conPeticiones ? d(k.ordenes, kp.ordenes) : d(k.unidades, kp.unidades)
  const conFiltroSinPeticiones = filtros.urgencia !== "todas" || !!filtros.consumible

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Peticiones" valor={conPeticiones ? fmtCompacto(k.ordenes!) : "—"}
          detalle={conPeticiones ? `${fmtN(porDia(k.ordenes!))} al día · ${fmtN(k.dias)} días con datos` : conFiltroSinPeticiones ? POR_QUE_TUBOS : "La exportación no trae el nº de petición."}
          delta={conPeticiones ? d(k.ordenes, kp.ordenes) : null} comparadoCon={vs} icono={<IconFileText size={20} />} color={TEAL} />
        <Kpi label="Tubos y etiquetas" valor={fmtCompacto(k.unidades)}
          detalle={conPeticiones && k.ordenes ? `${fmtN(k.unidades / k.ordenes, 2)} por petición · ${fmtN(porDia(k.unidades))} al día` : `${fmtN(porDia(k.unidades))} al día · ${fmtN(k.dias)} días con datos`}
          delta={d(k.unidades, kp.unidades)} comparadoCon={vs} icono={<IconDroplet size={20} />} color={ORANGE} />
        <Kpi label="Circuito completo · la mitad en menos de" valor={fmtMin(k.p50Total)}
          detalle={k.tiemposN ? `9 de cada 10 en menos de ${fmtMin(k.p90Total)} · ${fmtN(k.tiemposN)} peticiones medidas` : "Sin hitos suficientes"}
          delta={d(k.p50Total, kp.p50Total)} comparadoCon={vs} mejorSiBaja tendenciaNeutra={tTiempo.neutra} motivoNeutra={tTiempo.motivo}
          aviso={esSospechosa(vr.total) ? `${fmtN(vr.total.pct, 1)} % de las peticiones se validan en menos de ${U.umbralMin} min, sin extracción real` : null}
          icono={<IconClock size={20} />} color="#6366F1" />
        <Kpi label="Eventos de calidad por 1.000 tubos" valor={fmtN(tasa, 1)} detalle={`${fmtN(k.eventos)} reimpresiones, anulaciones e incidencias`} delta={d(tasa, tasaPrev)} comparadoCon={vs} mejorSiBaja icono={<IconAlertTriangle size={20} />} color="#E11D48" />
      </div>
      {!hayPrevio
        ? <Nota>Sin comparación con el periodo anterior ({fmtDia(prev.desde)} – {fmtDia(prev.hasta)}): {cmp.motivo}</Nota>
        : <NotaComparacion actual={rango} anterior={prev} diasActual={cmp.diasActual} diasAnterior={cmp.diasAnterior} fmt={x => fmtDia(x, { day: "numeric", month: "short", year: "numeric" })} />}
      <AvisoValidaciones vr={vr} compacto />

      <section className="relative overflow-hidden rounded-2xl bg-[#102a43] p-5 text-white shadow-[0_20px_60px_-30px_rgba(15,42,67,.9)] sm:p-7">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border border-teal-300/20" />
        <div className="relative grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-300/15 text-teal-200"><IconActivity size={21} /></span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-teal-200">Lectura del periodo</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-.02em]">{fmtDia(rango.desde, { day: "numeric", month: "long", year: "numeric" })} — {fmtDia(rango.hasta, { day: "numeric", month: "long", year: "numeric" })}</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              <li>• {conPeticiones
                ? <>Se atendieron <strong className="text-white">{fmtN(k.ordenes)}</strong> peticiones, con <strong className="text-white">{fmtN(k.unidades)}</strong> tubos y etiquetas</>
                : <>Se imprimieron <strong className="text-white">{fmtN(k.unidades)}</strong> tubos y etiquetas</>}
                {varVolumen !== null ? <> ({varVolumen >= 0 ? "+" : ""}{fmtN(varVolumen, 1)} % al día frente al periodo anterior)</> : null}.</li>
              {topArea && (conPeticiones && topArea.peticiones != null
                ? <li>• <strong className="text-white">{etiquetaArea(topArea.clave)}</strong> concentra el {fmtN(pct(topArea.peticiones, k.ordenes || 1), 1)} % de las peticiones.</li>
                : <li>• <strong className="text-white">{etiquetaArea(topArea.clave)}</strong> concentra el {fmtN(pct(topArea.unidades, k.unidades || 1), 1)} % de los tubos y etiquetas.</li>)}
              {cuello && <li>• La parte que más se alarga es <strong className="text-white">{TRAMO_CORTO[cuello.clave as Tramo].toLowerCase()}</strong> ({TRAMO_HITOS[cuello.clave as Tramo]}): 1 de cada 10 {TRAMO_UNIDAD[cuello.clave as Tramo]} tarda más de {fmtMin(cuello.p90)}.</li>}
              {esSospechosa(vr.total) && <li>• <strong className="text-amber-300">Atención:</strong> el {fmtN(vr.total.pct, 1)} % de las peticiones se valida en menos de {U.umbralMin} min, sin tiempo para extraer.</li>}
              {k.eventos > 0 && <li>• {fmtN(k.eventos)} eventos de calidad (reimpresiones, anulaciones e incidencias): {fmtN(tasa, 1)} por cada 1.000 tubos y etiquetas{conFiltroSinPeticiones ? ", sin filtro de prioridad ni de tubo" : ""}.</li>}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start">
            <div className="rounded-xl border border-white/10 bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{fmtN(pct(k.urgentes, k.registros), 1)} %</p><p className="mt-1 text-[11px] font-semibold text-slate-300">de los tubos y etiquetas son de peticiones urgentes</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{fmtN(areas.length)}</p><p className="mt-1 text-[11px] font-semibold text-slate-300">áreas con actividad</p></div>
            <div className="col-span-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-3 text-[11px] font-bold text-teal-100">Totales diarios calculados en origen · sin datos de pacientes</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Panel eyebrow="Evolución" titulo={`${NOMBRE_MEDIDA[medidaSerie]} ${granularidad(rango) === "semana" ? "por semana" : "por día"}`}
          texto={`Los huecos son días sin datos cargados.${medidaSerie === "unidades" && conFiltroSinPeticiones ? ` ${POR_QUE_TUBOS}` : ""}`}>
          <TimeChart series={[{ nombre: NOMBRE_MEDIDA[medidaSerie], color: TEAL, puntos: serie, area: true }]} />
        </Panel>
        <Panel eyebrow="Consumo" titulo="Tubos y etiquetas más usados" texto="Haz clic en uno para filtrar todo el panel.">
          <BarList items={cons.map(c => ({ clave: c.clave, valor: c.unidades, color: colorConsumible(c.clave, ds.consumibles) }))} seleccionado={filtros.consumible} onSelect={onFiltro ? v => onFiltro({ consumible: v }) : undefined} limite={6} />
        </Panel>
      </div>
    </div>
  )
}

// ─── Consumo y demanda ───────────────────────────────────────────────────────

export function VistaConsumo({ ds, rango, filtros, onFiltro }: VistaProps) {
  const conPet = peticionesDisponibles(ds, filtros)
  const [medidaSel, setMedida] = useState<"peticiones" | "unidades">("peticiones")
  // Las peticiones no existen por prioridad ni por tipo de tubo: con esos filtros, tubos y etiquetas
  const medida: Medida = conPet ? medidaSel : "unidades"
  const nombre = NOMBRE_MEDIDA[medida]
  const cons = useMemo(() => porConsumible(ds, rango, filtros), [ds, rango, filtros])
  const areas = useMemo(() => porArea(ds, rango, filtros), [ds, rango, filtros])
  const puestos = useMemo(() => porPuesto(ds, rango, filtros), [ds, rango, filtros])
  const heat = useMemo(() => heatmapSemanaHora(ds, rango, filtros), [ds, rango, filtros])
  const dow = useMemo(() => porDiaSemana(ds, rango, filtros, medida), [ds, rango, filtros, medida])
  const serie = useMemo(() => serieVolumen(ds, rango, filtros, medida), [ds, rango, filtros, medida])
  const prev = useMemo(() => prevision(ds, rango, filtros, medida), [ds, rango, filtros, medida])
  const total = cons.reduce((s, c) => s + c.unidades, 0)
  const semanal = granularidad(rango) === "semana"
  const selectorMedida = conPet
    ? <Segmentado etiqueta="Contar" valor={medidaSel} onChange={setMedida} opciones={[{ value: "peticiones", label: "Peticiones" }, { value: "unidades", label: "Tubos y etiquetas" }]} />
    : undefined

  return (
    <div className="space-y-5">
      {!conPet && (filtros.urgencia !== "todas" || filtros.consumible) && <Nota>{POR_QUE_TUBOS}</Nota>}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Panel
          eyebrow="Uso observado"
          titulo="Tubos y etiquetas por tipo"
          texto="Cada tubo o etiqueta impresa por InLab. Clic en una barra para filtrar el resto de vistas."
        >
          <p className="mb-3 text-xs font-bold text-gray-500 dark:text-slate-300">{fmtN(total)} <span className="font-normal text-gray-400">tubos y etiquetas en la selección</span></p>
          <BarList items={cons.map(c => ({ clave: c.clave, valor: c.unidades, color: colorConsumible(c.clave, ds.consumibles), sub: c.urgentes ? `${fmtN(pct(c.urgentes, c.registros), 1)} % urgentes` : undefined }))} seleccionado={filtros.consumible} onSelect={onFiltro ? v => onFiltro({ consumible: v }) : undefined} />
        </Panel>
        <Panel eyebrow="Dónde" titulo={`${nombre} por área de trabajo`} texto="Clic para filtrar por área." accion={selectorMedida}>
          <BarList
            items={areas.map((a, i) => ({ clave: a.clave, label: etiquetaArea(a.clave), valor: medida === "peticiones" ? a.peticiones ?? 0 : a.unidades, color: SERIE[i % SERIE.length], sub: medida === "peticiones" ? `${fmtN(a.unidades)} tubos y etiquetas` : undefined }))}
            seleccionado={filtros.areas} onSelect={onFiltro ? (_v, item) => onFiltro({ areas: alternarArea(filtros.areas, item, ds.areas), puesto: null }) : undefined} />
        </Panel>
      </div>

      <Panel
        eyebrow="Evolución y previsión"
        titulo={`${nombre} ${semanal ? "por semana" : "por día"}`}
        texto={prev ? `Previsión orientativa de las próximas 4 semanas, prolongando la tendencia de las últimas semanas completas (${prev.pendiente >= 0 ? "+" : ""}${fmtN(prev.pendiente, 1)} % por semana).` : "La previsión necesita al menos 4 semanas completas en el rango."}
        accion={selectorMedida}
      >
        <TimeChart
          series={[
            { nombre, color: ORANGE, puntos: serie, area: true },
            ...(prev && semanal ? [{ nombre: "Previsión", color: "#94A3B8", puntos: prev.semanas, discontinua: true }] : []),
          ]}
        />
        {prev && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Leyenda items={[{ nombre, color: ORANGE }, ...(semanal ? [{ nombre: "Previsión", color: "#94A3B8", discontinua: true }] : [])]} />
            <span className="text-[11px] text-gray-400">Próximas semanas: {prev.semanas.map(s => `${fmtDia(s.x)} ≈ ${fmtN(s.v)}`).join(" · ")} {nombre.toLowerCase()}</span>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Panel eyebrow="Demanda por horas" titulo="Mapa de calor: día de la semana × hora" texto={`Tubos y etiquetas impresos en cada franja horaria, de media por día con datos (InLab guarda la hora de cada tubo). Ayuda a dimensionar puestos y turnos.${heat.ignoraFiltros ? " Esta vista no distingue prioridad ni tipo de tubo: se muestran todos." : ""}`}>
          <HeatmapSemana m={heat.m} max={heat.max} />
        </Panel>
        <Panel eyebrow="Patrón semanal" titulo={`${nombre}: media por día de la semana`}>
          <Columnas items={["L", "M", "X", "J", "V", "S", "D"].map((l, i) => ({ label: l, valor: dow[i], detalle: `${["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i]}: ${fmtN(dow[i])} ${nombre.toLowerCase()} de media` }))} formato={v => fmtN(v)} />
        </Panel>
      </div>

      {puestos.length > 0 && (
        <Panel eyebrow="Puestos" titulo={`Tubos y etiquetas por puesto${filtros.areas.length ? ` · ${filtros.areas.map(etiquetaArea).join(", ")}` : ""}`} texto="Clic en un puesto para ver solo sus eventos de calidad.">
          <BarList items={puestos.map(p => ({ clave: p.clave, valor: p.unidades, color: TEAL, sub: `${fmtN(p.eventos ?? 0)} eventos de calidad` }))} seleccionado={filtros.puesto} onSelect={onFiltro ? v => onFiltro({ puesto: v }) : undefined} limite={10} />
        </Panel>
      )}
    </div>
  )
}

// ─── Flujo y tiempos ─────────────────────────────────────────────────────────

const PASOS_CIRCUITO = ["Llegada del paciente", "Numeración e impresión de etiquetas", "Extracción", "Validación"]

export function VistaTiempos({ ds, rango, filtros, onFiltro }: VistaProps) {
  const porTramo = useMemo(() => tiemposPorTramo(ds, rango, filtros), [ds, rango, filtros])
  const [tramoSel, setTramo] = useState<Tramo | null>(null)
  // Por defecto, el tramo de extracción (donde se detectan las validaciones sin circuito)
  const tramo: Tramo = tramoSel ?? (porTramo.find(t => t.clave === "EXTRACCION")?.n ? "EXTRACCION" : "TOTAL")
  const porAreaT = useMemo(() => tiemposPor(ds, rango, filtros, tramo, "area"), [ds, rango, filtros, tramo])
  const porUrg = useMemo(() => tiemposPor(ds, rango, filtros, tramo, "urgencia"), [ds, rango, filtros, tramo])
  const serie = useMemo(() => serieMediana(ds, rango, filtros, tramo), [ds, rango, filtros, tramo])
  const vr = useMemo(() => validacionesRapidas(ds, rango, filtros), [ds, rango, filtros])
  const vrArea = useMemo(() => new Map(vr.areas.map(a => [a.clave, a])), [vr])
  const disponibles = porTramo.filter(t => t.n > 0)
  const parciales = porTramo.filter(t => t.n > 0 && t.clave !== "TOTAL")
  const cuello = parciales.reduce<typeof parciales[number] | null>((m, t) => (!m || (t.p90 ?? 0) > (m.p90 ?? 0) ? t : m), null)
  const peorArea = porAreaT[0]
  const unidad = TRAMO_UNIDAD[tramo]
  // Las validaciones rápidas afectan a los tramos que terminan en la validación de la petición
  const tramoConAviso = tramo === "EXTRACCION" || tramo === "TOTAL"
  const extr = areasExtraccion(ds)
  const soloExtr = extr.length > 0 && filtros.areas.length === extr.length && extr.every(a => filtros.areas.includes(a))

  if (disponibles.length === 0) {
    return <Panel titulo="Sin tiempos calculables" texto="Para medir tiempos el fichero necesita al menos dos horas del circuito (p. ej. llegada del paciente y numeración, o numeración y validación).">
      <Nota>Revisa el emparejamiento de columnas en la próxima carga.</Nota>
    </Panel>
  }

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5">
        <p className="kpi-label text-teal-700 dark:text-teal-400">Cómo se mide</p>
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
          {PASOS_CIRCUITO.map((p, i) => (
            <li key={p} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">{i + 1}</span>{p}
              {i < PASOS_CIRCUITO.length - 1 && <span aria-hidden className="text-gray-300">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-slate-300">
          <strong>Espera en sala</strong> = 1 → 2 · <strong>Extracción</strong> = 2 → 4 · <strong>Circuito completo</strong> = 1 → 4.
          Si entre la numeración y la validación pasa menos de {U.umbralMin} min, no ha habido extracción: se ha validado sin ver al paciente.
          Solo <strong>Extracciones</strong> recorre el circuito completo; en Urgencias y plantas se suele validar sin él y sus tiempos salen casi cero.
        </p>
        {onFiltro && extr.length > 0 && !soloExtr && (
          <div className="inlab-no-print mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100">
            <span>Para valorar los tiempos del circuito, mira solo Extracciones.</span>
            <button type="button" onClick={() => onFiltro({ areas: extr, puesto: null })} className="min-h-[32px] rounded-lg bg-indigo-600 px-3 font-bold text-white hover:bg-indigo-700">Ver solo Extracciones</button>
          </div>
        )}
      </section>

      <AvisoValidaciones vr={vr} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {porTramo.map((t, i) => {
          const imposible = (t.clave === "EXTRACCION" || t.clave === "TOTAL") && t.p50 !== null && t.p50 < U.umbralMin
          return (
            <button key={t.clave} type="button" onClick={() => setTramo(t.clave as Tramo)} aria-pressed={tramo === t.clave} disabled={t.n === 0} title={TRAMO_AYUDA[t.clave as Tramo]}
              className={`stat-card p-4 text-left transition-all disabled:opacity-40 ${tramo === t.clave ? "ring-2 ring-indigo-400/70" : ""}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: ["#6366F1", ORANGE, TEAL, "#0f766e"][i], background: `${["#6366F1", ORANGE, TEAL, "#0f766e"][i]}16` }}><IconClock size={17} /></span>
              <p className="kpi-label mt-3 text-gray-500 dark:text-slate-300">{TRAMO_CORTO[t.clave as Tramo]}</p>
              <p className="text-[10.5px] text-gray-400">{TRAMO_HITOS[t.clave as Tramo]}</p>
              <p className="mt-2 text-[11px] text-gray-400">La mitad en menos de</p>
              <p className="text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtMin(t.p50)}</p>
              <p className="mt-1 text-[11px] text-gray-400">{t.n ? `9 de cada 10 en menos de ${fmtMin(t.p90)} · ${fmtN(t.n)} ${TRAMO_UNIDAD[t.clave as Tramo]}` : "Horas no disponibles"}</p>
              {imposible && <p className="mt-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Menos de {U.umbralMin} min: no es una extracción real</p>}
            </button>
          )
        })}
      </div>

      {(cuello || peorArea) && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="flex items-center gap-2 text-sm font-extrabold text-indigo-900 dark:text-indigo-200"><IconZap size={16} />Dónde se acumula la espera</p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-indigo-900/80 dark:text-indigo-100/80">
            {cuello && <li>• <strong>{TRAMO_CORTO[cuello.clave as Tramo]}</strong> es la parte que más se alarga: 1 de cada 10 {TRAMO_UNIDAD[cuello.clave as Tramo]} tarda más de {fmtMin(cuello.p90)} (la mitad, menos de {fmtMin(cuello.p50)}).</li>}
            {peorArea && porAreaT.length > 1 && <li>• En «{TRAMO_CORTO[tramo]}», <strong>{etiquetaArea(peorArea.clave)}</strong> es el área más lenta: 1 de cada 10 tarda más de {fmtMin(peorArea.p90)}.</li>}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Por área" titulo={TRAMO_LABEL[tramo]} texto={`Barra oscura: la mitad de las ${unidad} tarda menos; barra clara: 9 de cada 10. De más lenta a más rápida. Clic para filtrar.`}>
          <RangoTiempos unidad={unidad}
            items={porAreaT.map(a => ({ ...a, label: etiquetaArea(a.clave), aviso: tramoConAviso ? avisoCorto(vrArea.get(a.clave)) : null }))}
            seleccionado={filtros.areas} onSelect={onFiltro ? (_v, item) => onFiltro({ areas: alternarArea(filtros.areas, item, ds.areas), puesto: null }) : undefined} />
        </Panel>
        <Panel eyebrow="Por prioridad" titulo="Urgentes frente a normales" texto="Clic para filtrar por prioridad.">
          <RangoTiempos unidad={unidad} items={porUrg.map(u => ({ ...u, label: u.clave === "Urgente" ? "Urgentes" : "Normales" }))} seleccionado={filtros.urgencia === "urgente" ? "Urgente" : filtros.urgencia === "normal" ? "Normal" : null} onSelect={onFiltro ? v => onFiltro({ urgencia: v === "Urgente" ? "urgente" : v === "Normal" ? "normal" : "todas" }) : undefined} />
        </Panel>
      </div>

      <Panel eyebrow="Evolución" titulo={`${TRAMO_CORTO[tramo]} a lo largo del tiempo`} texto={TRAMO_AYUDA[tramo]} accion={<Segmentado etiqueta="Tramo" valor={tramo} onChange={setTramo} opciones={TRAMOS.filter(t => porTramo.find(p => p.clave === t)?.n).map(t => ({ value: t, label: TRAMO_CORTO[t] }))} />}>
        <TimeChart series={[{ nombre: "La mitad, menos de", color: "#6366F1", puntos: serie.p50 }, { nombre: "9 de cada 10, menos de", color: "#A5B4FC", puntos: serie.p90, discontinua: true }]} formato={v => fmtMin(v)} />
        <div className="mt-3"><Leyenda items={[{ nombre: "La mitad tarda menos de (mediana)", color: "#6366F1" }, { nombre: "9 de cada 10 tardan menos de (P90)", color: "#A5B4FC", discontinua: true }]} /></div>
      </Panel>
      <Nota>
        <strong>Cómo leer los tiempos.</strong> «La mitad en menos de» es la mediana: la mitad de las peticiones tardó menos y la otra mitad más. «9 de cada 10 en menos de» es el percentil 90 (P90): solo 1 de cada 10 tardó más. Se usan en vez de la media porque unos pocos casos de horas la distorsionarían.
        Se calculan sumando los recuentos diarios por intervalos de tiempo (de 5 s por debajo de 2 min, 15 s hasta 10 min, 30 s hasta 30 min, 1 min hasta 1 h y más amplios después); verificado frente a los valores exactos de Gómez Ulla, error típico menor de 0,05 min en tiempos cortos. Con pocas peticiones el valor puede caer entre dos casos observados. Se excluyen tiempos negativos o de más de 7 días.
      </Nota>
    </div>
  )
}

// ─── Incidencias y calidad ───────────────────────────────────────────────────

export function VistaCalidad({ ds, rango, filtros, onFiltro }: VistaProps) {
  // kp escalado a días con datos del periodo actual; dias = 0 si la cobertura no es comparable
  const comp = useMemo(() => kpisComparables(ds, rango, filtros), [ds, rango, filtros])
  const k = comp.k
  const kp = comp.kp ?? { ...k, dias: 0 }
  const vsCal = `vs ${fmtDia(comp.cmp.anterior.desde)} – ${fmtDia(comp.cmp.anterior.hasta)}`
  const porTipo = useMemo(() => eventosPor(ds, rango, filtros, "tipo"), [ds, rango, filtros])
  const porImp = useMemo(() => eventosPor(ds, rango, filtros, "impresora"), [ds, rango, filtros])
  const porPues = useMemo(() => eventosPor(ds, rango, filtros, "puesto"), [ds, rango, filtros])
  const porDet = useMemo(() => eventosPor(ds, rango, filtros, "detalle"), [ds, rango, filtros])
  const serie = useMemo(() => serieTasaEventos(ds, rango, filtros), [ds, rango, filtros])
  const tasa = k.tasaEventos ?? 0
  const tasaPrev = kp.tasaEventos

  if (ds.eventos.length === 0) {
    return <Panel titulo="Sin eventos de calidad" texto="El fichero no tenía columna de eventos emparejada o no contiene reimpresiones, rechazos, anulaciones ni errores de impresora en este periodo.">
      <Nota>Las incidencias de esta vista salen de la propia exportación InLab, no del módulo Incidencias de la plataforma.</Nota>
    </Panel>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Eventos de calidad" valor={fmtN(k.eventos)} detalle="Reimpresiones, anulaciones e incidencias registradas en InLab" delta={kp.dias ? delta(k.eventos, kp.eventos) : null} comparadoCon={vsCal} mejorSiBaja icono={<IconAlertTriangle size={20} />} color="#E11D48" />
        <Kpi label="Por cada 1.000 tubos y etiquetas" valor={fmtN(tasa, 2)} detalle="Eventos en proporción al volumen de trabajo" delta={kp.dias ? delta(tasa, tasaPrev) : null} comparadoCon={vsCal} mejorSiBaja icono={<IconTrendingUp size={20} />} color={ORANGE} />
        <Kpi label="Reimpresiones" valor={fmtN(porTipo.find(t => t.clave === "REIMPRESION")?.cantidad ?? 0)} detalle="Etiquetas impresas de nuevo" icono={<IconPrinter size={20} />} color="#6366F1" />
        <Kpi label="Rechazos" valor={fmtN(porTipo.find(t => t.clave === "RECHAZO")?.cantidad ?? 0)} detalle="Tubos rechazados" icono={<IconDroplet size={20} />} color={TEAL} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Panel eyebrow="Distribución" titulo="Eventos por tipo">
          <div className="grid items-center gap-5 sm:grid-cols-[170px_1fr]">
            <Donut items={porTipo.map(t => ({ label: EVENTO_LABEL[t.clave as EventoCategoria] ?? t.clave, valor: t.cantidad, color: EVENTO_COLOR[t.clave as EventoCategoria] ?? "#94A3B8" }))} centro={fmtN(k.eventos)} subcentro="eventos" />
            <BarList items={porTipo.map(t => ({ clave: t.clave, label: EVENTO_LABEL[t.clave as EventoCategoria] ?? t.clave, valor: t.cantidad, color: EVENTO_COLOR[t.clave as EventoCategoria] }))} />
          </div>
        </Panel>
        <Panel eyebrow="Evolución" titulo="Eventos por cada 1.000 tubos y etiquetas">
          <TimeChart series={[{ nombre: "Por 1.000 tubos y etiquetas", color: "#E11D48", puntos: serie }]} formato={v => fmtN(v, 2)} />
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel eyebrow="Equipos" titulo="Por impresora"><BarList items={porImp.map(i => ({ clave: i.clave, valor: i.cantidad, color: "#0EA5E9" }))} limite={8} /></Panel>
        <Panel eyebrow="Puestos" titulo="Por puesto" texto="Clic para filtrar."><BarList items={porPues.map(i => ({ clave: i.clave, valor: i.cantidad, color: ORANGE }))} seleccionado={filtros.puesto} onSelect={onFiltro ? v => onFiltro({ puesto: v === "—" ? null : v }) : undefined} limite={8} /></Panel>
        <Panel eyebrow="Códigos" titulo="Código original del evento" texto="Valor tal como viene en el fichero."><BarList items={porDet.map(i => ({ clave: i.clave, valor: i.cantidad, color: "#94A3B8" }))} limite={8} /></Panel>
      </div>
    </div>
  )
}

// ─── Facturación (solo lectura; el editor de tarifas vive en el dashboard) ───

export function TablaFacturacion({ ds, rango, filtros, tarifas }: VistaProps & { tarifas: Tarifa[] }) {
  const lineas = useMemo(() => facturacion(ds, rango, filtros, tarifas), [ds, rango, filtros, tarifas])
  const moneda = tarifas[0]?.moneda ?? "EUR"
  const total = totalImporte(lineas)
  const sinTarifa = [...new Set(lineas.filter(l => l.importe === null).map(l => l.consumible))]
  const meses = [...new Set(lineas.map(l => l.mes))]
  const porMes = meses.map(m => ({ mes: m, importe: totalImporte(lineas.filter(l => l.mes === m)), unidades: lineas.filter(l => l.mes === m).reduce((s, l) => s + l.unidades, 0) }))
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card p-4"><p className="kpi-label text-gray-500">Importe del periodo</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtEur(total, moneda)}</p></div>
        <div className="stat-card p-4"><p className="kpi-label text-gray-500">Tubos y etiquetas facturables</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtN(lineas.filter(l => l.importe !== null).reduce((s, l) => s + l.unidades, 0))}</p></div>
        <div className="stat-card p-4"><p className="kpi-label text-gray-500">Consumibles sin tarifa</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{sinTarifa.length}</p></div>
      </div>
      {sinTarifa.length > 0 && <Nota tono="aviso">Sin tarifa vigente: {sinTarifa.slice(0, 8).join(", ")}{sinTarifa.length > 8 ? "…" : ""}. Añade una tarifa específica o una genérica «*».</Nota>}
      {porMes.length > 1 && <Columnas items={porMes.map(m => ({ label: m.mes.slice(5) + "/" + m.mes.slice(2, 4), valor: m.importe, detalle: `${m.mes}: ${fmtEur(m.importe, moneda)} · ${fmtN(m.unidades)} tubos y etiquetas` }))} formato={v => fmtEur(v, moneda)} color="#0f766e" alto={160} />}
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-gray-400 dark:bg-slate-800">
            <tr><th scope="col" className="px-3 py-2">Mes</th><th scope="col" className="px-3 py-2">Consumible</th><th scope="col" className="px-3 py-2 text-right">Tubos y etiquetas</th><th scope="col" className="px-3 py-2 text-right">Precio por tubo o etiqueta</th><th scope="col" className="px-3 py-2 text-right">Importe</th></tr>
          </thead>
          <tbody>
            {lineas.map(l => (
              <tr key={`${l.mes}-${l.consumible}-${l.precio ?? ""}`} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-3 py-2 tabular-nums text-gray-500">{l.mes}</td>
                <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{l.consumible}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtN(l.unidades)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">{l.precio === null ? "—" : fmtEur(l.precio, moneda)}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{l.importe === null ? <span className="font-normal text-amber-600">sin tarifa</span> : fmtEur(l.importe, moneda)}</td>
              </tr>
            ))}
            {lineas.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin consumo en el periodo</td></tr>}
          </tbody>
          {lineas.length > 0 && <tfoot><tr className="border-t-2 border-slate-200 font-extrabold dark:border-slate-600"><td className="px-3 py-2" colSpan={4}>Total</td><td className="px-3 py-2 text-right tabular-nums">{fmtEur(total, moneda)}</td></tr></tfoot>}
        </table>
      </div>
    </div>
  )
}
