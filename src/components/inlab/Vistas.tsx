"use client"

/**
 * Vistas analíticas de Inteligencia InLab, compartidas entre el dashboard interno
 * (/inlab) y el informe público (/share/inlab/[token]).
 */
import { useMemo, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import {
  IconActivity, IconAlertTriangle, IconClock, IconDroplet, IconFileText, IconPrinter, IconTrendingUp, IconZap,
} from "@/components/ui/Icons"
import {
  delta, eventosPor, granularidad, facturacion, heatmapSemanaHora, kpis, periodoAnterior, porArea, porConsumible, porDiaSemana,
  porPuesto, prevision, serieMediana, serieTasaEventos, serieVolumen, tiemposPor, tiemposPorTramo,
  type Dataset, type Filtros, type Rango, type Tarifa,
} from "@/lib/inlab/analytics"
import { EVENTO_LABEL, type EventoCategoria } from "@/lib/inlab/mapping"
import { TRAMO_LABEL, TRAMOS, type Tramo } from "@/lib/inlab/types"
import {
  BarList, Columnas, Donut, HeatmapSemana, Leyenda, RangoTiempos, SERIE, TimeChart, colorConsumible,
  fmtCompacto, fmtDia, fmtEur, fmtMin, fmtN,
} from "./charts"
import { Kpi, Nota, Panel, Segmentado } from "./ui"

export interface VistaProps {
  ds: Dataset
  rango: Rango
  filtros: Filtros
  onFiltro?: (patch: Partial<Filtros>) => void
}

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

const EVENTO_COLOR: Record<EventoCategoria, string> = {
  REIMPRESION: ORANGE, RECHAZO: "#E11D48", ANULACION: "#6366F1", ERROR_IMPRESORA: "#0EA5E9", OTRO: "#94A3B8",
}

// ─── Resumen ejecutivo ───────────────────────────────────────────────────────

export function VistaResumen({ ds, rango, filtros, onFiltro }: VistaProps) {
  const prev = periodoAnterior(rango)
  const k = useMemo(() => kpis(ds, rango, filtros), [ds, rango, filtros])
  const kp = useMemo(() => kpis(ds, prev, filtros), [ds, prev, filtros])
  const serie = useMemo(() => serieVolumen(ds, rango, filtros), [ds, rango, filtros])
  const cons = useMemo(() => porConsumible(ds, rango, filtros).slice(0, 6), [ds, rango, filtros])
  const areas = useMemo(() => porArea(ds, rango, filtros), [ds, rango, filtros])
  const tasa = k.registros ? (k.eventos / k.registros) * 1000 : 0
  const tasaPrev = kp.registros ? (kp.eventos / kp.registros) * 1000 : null
  const hayPrevio = kp.dias > 0
  const d = (a: number | null, b: number | null) => (hayPrevio ? delta(a, b) : null)
  const mediaDia = k.dias ? k.registros / k.dias : 0
  const tramos = tiemposPorTramo(ds, rango, filtros).filter(t => t.n > 0 && t.clave !== "TOTAL")
  const cuello = tramos.reduce<typeof tramos[number] | null>((m, t) => (!m || (t.p90 ?? 0) > (m.p90 ?? 0) ? t : m), null)
  const topArea = areas[0]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Registros" valor={fmtCompacto(k.registros)} detalle={`${fmtN(mediaDia)} / día · ${fmtN(k.dias)} días con datos`} delta={d(k.registros, kp.registros)} icono={<IconFileText size={20} />} color={TEAL} />
        <Kpi label="Unidades consumidas" valor={fmtCompacto(k.unidades)} detalle={k.ordenes !== null ? `${fmtN(k.ordenes)} órdenes · ${fmtN(k.ordenes ? k.unidades / k.ordenes : 0, 2)} uds/orden` : "Tubos y etiquetas"} delta={d(k.unidades, kp.unidades)} icono={<IconDroplet size={20} />} color={ORANGE} />
        <Kpi label="Ciclo completo · mediana" valor={fmtMin(k.p50Total)} detalle={k.tiemposN ? `P90 ${fmtMin(k.p90Total)} · ${fmtN(k.tiemposN)} mediciones` : "Sin hitos suficientes"} delta={d(k.p50Total, kp.p50Total)} mejorSiBaja icono={<IconClock size={20} />} color="#6366F1" />
        <Kpi label="Incidencias / 1.000" valor={fmtN(tasa, 1)} detalle={`${fmtN(k.eventos)} eventos · ${fmtN(pct(k.urgentes, k.registros), 1)} % urgentes`} delta={d(tasa, tasaPrev)} mejorSiBaja icono={<IconAlertTriangle size={20} />} color="#E11D48" />
      </div>
      {!hayPrevio && <Nota>No hay datos del periodo anterior ({fmtDia(prev.desde)} – {fmtDia(prev.hasta)}) para calcular tendencias.</Nota>}

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
              <li>• Se registraron <strong className="text-white">{fmtN(k.registros)}</strong> movimientos{hayPrevio && d(k.registros, kp.registros) !== null ? <> ({(d(k.registros, kp.registros) ?? 0) >= 0 ? "+" : ""}{fmtN(d(k.registros, kp.registros), 1)} % vs. periodo anterior)</> : null}.</li>
              {topArea && <li>• <strong className="text-white">{topArea.clave}</strong> concentra el {fmtN(pct(topArea.registros, k.registros || 1), 1)} % de la actividad.</li>}
              {cuello && <li>• El tramo con mayor cola (P90) es <strong className="text-white">{TRAMO_LABEL[cuello.clave as Tramo]}</strong>: {fmtMin(cuello.p90)}.</li>}
              {k.eventos > 0 && <li>• {fmtN(k.eventos)} incidencias del sistema ({fmtN(tasa, 1)} por cada 1.000 registros).</li>}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start">
            <div className="rounded-xl border border-white/10 bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{fmtN(pct(k.urgentes, k.registros), 1)} %</p><p className="mt-1 text-[11px] font-semibold text-slate-300">actividad urgente</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{fmtN(areas.length)}</p><p className="mt-1 text-[11px] font-semibold text-slate-300">áreas con actividad</p></div>
            <div className="col-span-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-3 text-[11px] font-bold text-teal-100">Agregados diarios calculados en origen · sin datos de pacientes</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Panel eyebrow="Evolución" titulo="Volumen de registros" texto={`Agregado ${granularidad(rango) === "semana" ? "semanal" : "diario"}. Los huecos indican días sin datos cargados.`}>
          <TimeChart series={[{ nombre: "Registros", color: TEAL, puntos: serie, area: true }]} />
        </Panel>
        <Panel eyebrow="Consumo" titulo="Top consumibles" texto="Haz clic para filtrar todo el dashboard.">
          <BarList items={cons.map(c => ({ clave: c.clave, valor: c.unidades, color: colorConsumible(c.clave, ds.consumibles) }))} seleccionado={filtros.consumible} onSelect={onFiltro ? v => onFiltro({ consumible: v }) : undefined} limite={6} />
        </Panel>
      </div>
    </div>
  )
}

// ─── Consumo y demanda ───────────────────────────────────────────────────────

export function VistaConsumo({ ds, rango, filtros, onFiltro }: VistaProps) {
  const [medida, setMedida] = useState<"unidades" | "registros">("unidades")
  const cons = useMemo(() => porConsumible(ds, rango, filtros), [ds, rango, filtros])
  const areas = useMemo(() => porArea(ds, rango, filtros), [ds, rango, filtros])
  const puestos = useMemo(() => porPuesto(ds, rango, filtros), [ds, rango, filtros])
  const heat = useMemo(() => heatmapSemanaHora(ds, rango, filtros), [ds, rango, filtros])
  const dow = useMemo(() => porDiaSemana(ds, rango, filtros), [ds, rango, filtros])
  const serie = useMemo(() => serieVolumen(ds, rango, filtros, medida), [ds, rango, filtros, medida])
  const prev = useMemo(() => prevision(ds, rango, filtros), [ds, rango, filtros])
  const total = cons.reduce((s, c) => s + c[medida], 0)
  const semanal = granularidad(rango) === "semana"

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Panel
          eyebrow="Uso observado"
          titulo="Consumo por tipo de consumible"
          texto="Fuente: exportación InLab. Clic en una barra para filtrar el resto de vistas."
          accion={<Segmentado etiqueta="Medida" valor={medida} onChange={setMedida} opciones={[{ value: "unidades", label: "Unidades" }, { value: "registros", label: "Registros" }]} />}
        >
          <p className="mb-3 text-xs font-bold text-gray-500 dark:text-slate-300">{fmtN(total)} <span className="font-normal text-gray-400">{medida} en la selección</span></p>
          <BarList items={cons.map(c => ({ clave: c.clave, valor: c[medida], color: colorConsumible(c.clave, ds.consumibles), sub: c.urgentes ? `${fmtN(pct(c.urgentes, c.registros), 1)} % urgente` : undefined }))} seleccionado={filtros.consumible} onSelect={onFiltro ? v => onFiltro({ consumible: v }) : undefined} />
        </Panel>
        <Panel eyebrow="Dónde" titulo="Por área de trabajo" texto="Clic para filtrar por área.">
          <BarList items={areas.map((a, i) => ({ clave: a.clave, valor: a[medida], color: SERIE[i % SERIE.length] }))} seleccionado={filtros.area} onSelect={onFiltro ? v => onFiltro({ area: v, puesto: null }) : undefined} />
        </Panel>
      </div>

      <Panel
        eyebrow="Evolución y previsión"
        titulo={`${medida === "unidades" ? "Unidades" : "Registros"} ${semanal ? "por semana" : "por día"}`}
        texto={prev ? `Previsión orientativa de 4 semanas por regresión lineal sobre las últimas semanas completas (tendencia ${prev.pendiente >= 0 ? "+" : ""}${fmtN(prev.pendiente, 1)} % semanal). Se calcula sobre registros.` : "La previsión necesita al menos 4 semanas completas en el rango."}
      >
        <TimeChart
          series={[
            { nombre: medida === "unidades" ? "Unidades" : "Registros", color: ORANGE, puntos: serie, area: true },
            ...(prev && semanal && medida === "registros" ? [{ nombre: "Previsión", color: "#94A3B8", puntos: prev.semanas, discontinua: true }] : []),
          ]}
        />
        {prev && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Leyenda items={[{ nombre: medida === "unidades" ? "Unidades" : "Registros", color: ORANGE }, ...(semanal && medida === "registros" ? [{ nombre: "Previsión", color: "#94A3B8", discontinua: true }] : [])]} />
            <span className="text-[11px] text-gray-400">Próximas semanas: {prev.semanas.map(s => `${fmtDia(s.x)} ≈ ${fmtN(s.v)}`).join(" · ")} registros</span>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Panel eyebrow="Demanda horaria" titulo="Mapa de calor: día de la semana × hora" texto="Media de registros por día de cada tipo. Ayuda a dimensionar puestos y turnos.">
          <HeatmapSemana m={heat.m} max={heat.max} />
        </Panel>
        <Panel eyebrow="Patrón semanal" titulo="Media por día de la semana">
          <Columnas items={["L", "M", "X", "J", "V", "S", "D"].map((l, i) => ({ label: l, valor: dow[i], detalle: `${["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i]}: ${fmtN(dow[i])} registros de media` }))} formato={v => fmtN(v)} />
        </Panel>
      </div>

      {puestos.length > 0 && (
        <Panel eyebrow="Puestos" titulo={`Actividad por puesto${filtros.area ? ` · ${filtros.area}` : ""}`} texto="Clic para ver solo las incidencias de ese puesto.">
          <BarList items={puestos.map(p => ({ clave: p.clave, valor: p.registros, color: TEAL, sub: `${fmtN(p.unidades)} uds · ${fmtN(p.eventos ?? 0)} incidencias` }))} seleccionado={filtros.puesto} onSelect={onFiltro ? v => onFiltro({ puesto: v }) : undefined} limite={10} />
        </Panel>
      )}
    </div>
  )
}

// ─── Flujo y tiempos ─────────────────────────────────────────────────────────

export function VistaTiempos({ ds, rango, filtros, onFiltro }: VistaProps) {
  const [tramo, setTramo] = useState<Tramo>("TOTAL")
  const porTramo = useMemo(() => tiemposPorTramo(ds, rango, filtros), [ds, rango, filtros])
  const porAreaT = useMemo(() => tiemposPor(ds, rango, filtros, tramo, "area"), [ds, rango, filtros, tramo])
  const porUrg = useMemo(() => tiemposPor(ds, rango, filtros, tramo, "urgencia"), [ds, rango, filtros, tramo])
  const serie = useMemo(() => serieMediana(ds, rango, filtros, tramo), [ds, rango, filtros, tramo])
  const disponibles = porTramo.filter(t => t.n > 0)
  const parciales = porTramo.filter(t => t.n > 0 && t.clave !== "TOTAL")
  const cuello = parciales.reduce<typeof parciales[number] | null>((m, t) => (!m || (t.p90 ?? 0) > (m.p90 ?? 0) ? t : m), null)
  const peorArea = porAreaT[0]

  if (disponibles.length === 0) {
    return <Panel titulo="Sin tiempos calculables" texto="Para medir tiempos el fichero necesita al menos dos columnas de fecha/hora emparejadas (p. ej. petición y extracción, o extracción y recepción).">
      <Nota>Revisa el emparejamiento de columnas en la próxima carga.</Nota>
    </Panel>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {porTramo.map((t, i) => (
          <button key={t.clave} type="button" onClick={() => setTramo(t.clave as Tramo)} aria-pressed={tramo === t.clave} disabled={t.n === 0}
            className={`stat-card p-4 text-left transition-all disabled:opacity-40 ${tramo === t.clave ? "ring-2 ring-indigo-400/70" : ""}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: ["#6366F1", ORANGE, TEAL, "#0f766e"][i], background: `${["#6366F1", ORANGE, TEAL, "#0f766e"][i]}16` }}><IconClock size={17} /></span>
            <p className="mt-3 text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtMin(t.p50)}</p>
            <p className="kpi-label mt-1.5 text-gray-500 dark:text-slate-300">{TRAMO_LABEL[t.clave as Tramo]}</p>
            <p className="mt-1 text-[11px] text-gray-400">{t.n ? `P90 ${fmtMin(t.p90)} · ${fmtN(t.n)} mediciones` : "Hitos no disponibles"}</p>
          </button>
        ))}
      </div>

      {(cuello || peorArea) && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="flex items-center gap-2 text-sm font-extrabold text-indigo-900 dark:text-indigo-200"><IconZap size={16} />Cuellos de botella</p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-indigo-900/80 dark:text-indigo-100/80">
            {cuello && <li>• El tramo <strong>{TRAMO_LABEL[cuello.clave as Tramo]}</strong> tiene la cola más larga: el 10 % más lento supera {fmtMin(cuello.p90)} (mediana {fmtMin(cuello.p50)}).</li>}
            {peorArea && porAreaT.length > 1 && <li>• En «{TRAMO_LABEL[tramo]}», <strong>{peorArea.clave}</strong> es el área con mayor P90 ({fmtMin(peorArea.p90)}).</li>}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Por área" titulo={TRAMO_LABEL[tramo]} texto="Mediana y P90 por área (ordenado por P90). Clic para filtrar.">
          <RangoTiempos items={porAreaT} seleccionado={filtros.area} onSelect={onFiltro ? v => onFiltro({ area: v, puesto: null }) : undefined} />
        </Panel>
        <Panel eyebrow="Por urgencia" titulo="Urgente frente a normal" texto="Clic para filtrar por prioridad.">
          <RangoTiempos items={porUrg} seleccionado={filtros.urgencia === "urgente" ? "Urgente" : filtros.urgencia === "normal" ? "Normal" : null} onSelect={onFiltro ? v => onFiltro({ urgencia: v === "Urgente" ? "urgente" : v === "Normal" ? "normal" : "todas" }) : undefined} />
        </Panel>
      </div>

      <Panel eyebrow="Evolución" titulo={`Mediana y P90 · ${TRAMO_LABEL[tramo]}`} accion={<Segmentado etiqueta="Tramo" valor={tramo} onChange={setTramo} opciones={TRAMOS.filter(t => porTramo.find(p => p.clave === t)?.n).map(t => ({ value: t, label: TRAMO_LABEL[t].replace("Petición", "Pet.").replace("Extracción", "Ext.").replace("Recepción", "Rec.").replace("validación", "val.") }))} />}>
        <TimeChart series={[{ nombre: "Mediana", color: "#6366F1", puntos: serie.p50 }, { nombre: "P90", color: "#A5B4FC", puntos: serie.p90, discontinua: true }]} formato={v => fmtMin(v)} />
        <div className="mt-3"><Leyenda items={[{ nombre: "Mediana", color: "#6366F1" }, { nombre: "P90", color: "#A5B4FC", discontinua: true }]} /></div>
      </Panel>
      <Nota>Los percentiles se calculan sumando histogramas diarios con intervalos fijos (precisión de 2 min por debajo de 30 min, más amplia en tiempos largos). Se excluyen duraciones negativas o superiores a 7 días.</Nota>
    </div>
  )
}

// ─── Incidencias y calidad ───────────────────────────────────────────────────

export function VistaCalidad({ ds, rango, filtros, onFiltro }: VistaProps) {
  const k = useMemo(() => kpis(ds, rango, filtros), [ds, rango, filtros])
  const kp = useMemo(() => kpis(ds, periodoAnterior(rango), filtros), [ds, rango, filtros])
  const porTipo = useMemo(() => eventosPor(ds, rango, filtros, "tipo"), [ds, rango, filtros])
  const porImp = useMemo(() => eventosPor(ds, rango, filtros, "impresora"), [ds, rango, filtros])
  const porPues = useMemo(() => eventosPor(ds, rango, filtros, "puesto"), [ds, rango, filtros])
  const porDet = useMemo(() => eventosPor(ds, rango, filtros, "detalle"), [ds, rango, filtros])
  const serie = useMemo(() => serieTasaEventos(ds, rango, filtros), [ds, rango, filtros])
  const tasa = k.registros ? (k.eventos / k.registros) * 1000 : 0
  const tasaPrev = kp.registros ? (kp.eventos / kp.registros) * 1000 : null

  if (ds.eventos.length === 0) {
    return <Panel titulo="Sin eventos de calidad" texto="El fichero no tenía columna de eventos emparejada o no contiene reimpresiones, rechazos, anulaciones ni errores de impresora en este periodo.">
      <Nota>Las incidencias de esta vista salen de la propia exportación InLab, no del módulo Incidencias de la plataforma.</Nota>
    </Panel>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Eventos" valor={fmtN(k.eventos)} detalle="Del fichero InLab" delta={kp.dias ? delta(k.eventos, kp.eventos) : null} mejorSiBaja icono={<IconAlertTriangle size={20} />} color="#E11D48" />
        <Kpi label="Tasa / 1.000 registros" valor={fmtN(tasa, 2)} detalle="Normalizada por volumen" delta={kp.dias ? delta(tasa, tasaPrev) : null} mejorSiBaja icono={<IconTrendingUp size={20} />} color={ORANGE} />
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
        <Panel eyebrow="Evolución" titulo="Tasa de eventos por 1.000 registros">
          <TimeChart series={[{ nombre: "Tasa ‰", color: "#E11D48", puntos: serie }]} formato={v => fmtN(v, 2)} />
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
  const total = lineas.reduce((s, l) => s + (l.importe ?? 0), 0)
  const sinTarifa = [...new Set(lineas.filter(l => l.importe === null).map(l => l.consumible))]
  const meses = [...new Set(lineas.map(l => l.mes))]
  const porMes = meses.map(m => ({ mes: m, importe: lineas.filter(l => l.mes === m).reduce((s, l) => s + (l.importe ?? 0), 0), unidades: lineas.filter(l => l.mes === m).reduce((s, l) => s + l.unidades, 0) }))
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card p-4"><p className="kpi-label text-gray-500">Importe del periodo</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtEur(total, moneda)}</p></div>
        <div className="stat-card p-4"><p className="kpi-label text-gray-500">Unidades facturables</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtN(lineas.filter(l => l.importe !== null).reduce((s, l) => s + l.unidades, 0))}</p></div>
        <div className="stat-card p-4"><p className="kpi-label text-gray-500">Consumibles sin tarifa</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{sinTarifa.length}</p></div>
      </div>
      {sinTarifa.length > 0 && <Nota tono="aviso">Sin tarifa vigente: {sinTarifa.slice(0, 8).join(", ")}{sinTarifa.length > 8 ? "…" : ""}. Añade una tarifa específica o una genérica «*».</Nota>}
      {porMes.length > 1 && <Columnas items={porMes.map(m => ({ label: m.mes.slice(5) + "/" + m.mes.slice(2, 4), valor: m.importe, detalle: `${m.mes}: ${fmtEur(m.importe, moneda)} · ${fmtN(m.unidades)} uds` }))} formato={v => fmtEur(v, moneda)} color="#0f766e" alto={160} />}
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-gray-400 dark:bg-slate-800">
            <tr><th scope="col" className="px-3 py-2">Mes</th><th scope="col" className="px-3 py-2">Consumible</th><th scope="col" className="px-3 py-2 text-right">Unidades</th><th scope="col" className="px-3 py-2 text-right">Precio</th><th scope="col" className="px-3 py-2 text-right">Importe</th></tr>
          </thead>
          <tbody>
            {lineas.map(l => (
              <tr key={`${l.mes}-${l.consumible}`} className="border-t border-slate-100 dark:border-slate-700">
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
