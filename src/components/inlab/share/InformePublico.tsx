"use client"

/**
 * Informe InLab público e interactivo (/share/inlab/[token]).
 *
 * Reutiliza las mismas vistas y funciones que el dashboard (Vistas.tsx + analytics.ts):
 * con el mismo periodo y las mismas work areas, las cifras son idénticas. El dataset
 * ya llega recortado por el servidor al periodo y a las áreas del enlace; aquí solo se
 * filtra dentro de ese alcance.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { BrandLockup } from "@/components/ui/BrandLockup"
import { IconCalendar, IconClipboard, IconMonitor, IconPrint, IconSend, IconShieldAlert } from "@/components/ui/Icons"
import { FILTROS_VACIOS, etiquetaArea, kpis, type Dataset, type Filtros, type Rango, type Tarifa, type Urgencia } from "@/lib/inlab/analytics"
import { addDias, diffDias } from "@/lib/inlab/dates"
import { fmtDia, fmtMin, fmtN } from "@/components/inlab/charts"
import { Panel, Segmentado } from "@/components/inlab/ui"
import { SelectorAreas } from "@/components/inlab/SelectorAreas"
import { TablaFacturacion, VistaCalidad, VistaConsumo, VistaResumen, VistaTiempos } from "@/components/inlab/Vistas"
import { PRINT_CSS } from "@/components/inlab/InformeInlab"
import { useToast } from "@/components/Toast"
import { ModoPresentacion, type Diapositiva } from "./ModoPresentacion"
import s from "./share.module.css"

export interface DatosInformePublico {
  hospital: { nombre: string; ciudad: string | null; provincia: string | null; camas: number | null }
  desde: string
  hasta: string
  /** work areas del enlace ([] = todas) */
  areas: string[]
  expiraEn: string | null
  generado: string
  tarifas: Tarifa[]
  incluirFacturacion: boolean
}

const LARGO: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }
const CORTO: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }

// ─── Cifra animada (de su valor anterior al nuevo, con formato exacto al final) ──
function useNumeroAnimado(valor: number | null, ms = 900): number | null {
  // Valor intermedio mientras dura la animación; null = mostrar el valor exacto
  // Empieza en 0 para contar hacia arriba al aparecer (sin parpadeo del valor final)
  const [anim, setAnim] = useState<number | null>(() =>
    valor !== null && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : null)
  const desdeRef = useRef(0)
  useEffect(() => {
    if (valor === null) { desdeRef.current = 0; return }
    const origen = desdeRef.current
    desdeRef.current = valor
    if (origen === valor || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const t0 = performance.now()
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - k, 4)
      setAnim(k < 1 ? origen + (valor - origen) * e : null)
      if (k < 1) frame = requestAnimationFrame(paso)
    }
    frame = requestAnimationFrame(paso)
    return () => { cancelAnimationFrame(frame); setAnim(null) }
  }, [valor, ms])
  return valor === null ? null : anim ?? valor
}

function CifraHero({ etiqueta, valor, fmt, detalle, color, retardo }: { etiqueta: string; valor: number | null; fmt: (v: number | null) => string; detalle: string; color: string; retardo: number }) {
  const v = useNumeroAnimado(valor)
  return (
    <div className={`${s.rise} rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm sm:p-5`} style={{ ["--d" as string]: `${retardo}ms` }}>
      <span className="mb-3 block h-1 w-8 rounded-full" style={{ background: color }} aria-hidden="true" />
      <p className="font-mono text-2xl font-bold leading-none tracking-[-.03em] text-white tabular-nums sm:text-[32px]" aria-label={`${etiqueta}: ${fmt(valor)}`}>{fmt(v)}</p>
      <p className="mt-2.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-300">{etiqueta}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">{detalle}</p>
    </div>
  )
}

// ─── Sección con revelado al hacer scroll ────────────────────────────────────
function Seccion({ id, numero, titulo, texto, children }: { id: string; numero: string; titulo: string; texto: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined")
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect() } }, { rootMargin: "0px 0px -12% 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section ref={ref} id={id} data-seccion={id} className={`${s.reveal} ${visible ? s.revealIn : ""} scroll-mt-36`} aria-labelledby={`${id}-titulo`}>
      <div className="mb-4 flex items-end gap-3">
        <span className="font-mono text-3xl font-bold leading-none text-teal-600/30 dark:text-teal-300/25" aria-hidden="true">{numero}</span>
        <div>
          <h2 id={`${id}-titulo`} className="text-lg font-extrabold tracking-[-.02em] text-gray-900 dark:text-white sm:text-xl">{titulo}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">{texto}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function InformePublico({ datos, ds }: { datos: DatosInformePublico; ds: Dataset }) {
  const toast = useToast()
  const total = useMemo<Rango>(() => ({ desde: datos.desde, hasta: datos.hasta }), [datos.desde, datos.hasta])
  const [rango, setRango] = useState<Rango>(total)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [verAreas, setVerAreas] = useState(false)
  const [presentando, setPresentando] = useState(false)
  const [activa, setActiva] = useState("resumen")
  const [puedeCompartir] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function")
  const onFiltro = (p: Partial<Filtros>) => setFiltros(f => ({ ...f, ...p }))

  const tarifas = datos.incluirFacturacion && datos.tarifas.length > 0 ? datos.tarifas : null
  const props = { ds, rango, filtros, onFiltro }
  const k = useMemo(() => kpis(ds, rango, filtros), [ds, rango, filtros])

  const secciones = useMemo(() => [
    { id: "resumen", label: "Resumen" },
    { id: "consumo", label: "Consumo" },
    { id: "tiempos", label: "Tiempos" },
    { id: "calidad", label: "Calidad" },
    ...(tarifas ? [{ id: "facturacion", label: "Facturación" }] : []),
  ], [tarifas])

  // Periodos rápidos dentro del rango compartido
  const nTotal = diffDias(total.desde, total.hasta) + 1
  const presets = useMemo(() => {
    const ult = (n: number): Rango => { const d = addDias(total.hasta, -(n - 1)); return { desde: d < total.desde ? total.desde : d, hasta: total.hasta } }
    return [
      { k: "todo", label: "Todo", r: total },
      ...(nTotal > 100 ? [{ k: "90", label: "90 días", r: ult(90) }] : []),
      ...(nTotal > 40 ? [{ k: "30", label: "30 días", r: ult(30) }] : []),
      ...(nTotal > 10 ? [{ k: "7", label: "7 días", r: ult(7) }] : []),
    ]
  }, [total, nTotal])
  const meses = useMemo(() => {
    const out: { k: string; label: string; r: Rango }[] = []
    let m = total.desde.slice(0, 7)
    const fin = total.hasta.slice(0, 7)
    while (m <= fin && out.length < 60) {
      const ini = `${m}-01`
      const sig = `${addDias(ini, 31).slice(0, 7)}-01`
      const ultimo = addDias(sig, -1)
      out.push({ k: m, label: fmtDia(ini, { month: "long", year: "numeric" }), r: { desde: ini < total.desde ? total.desde : ini, hasta: ultimo > total.hasta ? total.hasta : ultimo } })
      m = sig.slice(0, 7)
    }
    return out
  }, [total])
  const presetActivo = presets.find(p => p.r.desde === rango.desde && p.r.hasta === rango.hasta)?.k ?? meses.find(p => p.r.desde === rango.desde && p.r.hasta === rango.hasta)?.k ?? "custom"

  // Sección activa (scrollspy)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) setActiva((e.target as HTMLElement).dataset.seccion ?? "resumen")
    }, { rootMargin: "-35% 0px -60% 0px" })
    document.querySelectorAll("[data-seccion]").forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [secciones])

  const ir = (id: string) => {
    setActiva(id)
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
  }

  async function compartir() {
    const url = window.location.href
    if (puedeCompartir) { try { await navigator.share({ title: `Informe InLab · ${datos.hospital.nombre}`, url }) } catch { /* cancelado */ } return }
    try { await navigator.clipboard.writeText(url); toast.success("Enlace copiado") } catch { toast.error("No se pudo copiar") }
  }

  const periodoLargo = `${fmtDia(rango.desde, LARGO)} — ${fmtDia(rango.hasta, LARGO)}`
  const recortado = rango.desde !== total.desde || rango.hasta !== total.hasta
  const alcanceAreas = datos.areas.length ? `${datos.areas.length} work area${datos.areas.length === 1 ? "" : "s"}` : "Todas las work areas"
  const caducidad = datos.expiraEn ? `Enlace válido hasta el ${new Date(datos.expiraEn).toLocaleDateString("es-ES", LARGO)}` : "Enlace sin caducidad"
  const urgente = k.registros ? (k.urgentes / k.registros) * 100 : 0

  // Mismas métricas que el dashboard (Sprint 26): Peticiones = pedidos distintos (k.ordenes),
  // Tubos y etiquetas = cada tubo/etiqueta impresa (k.unidades). k.ordenes es null con filtros
  // que el payload no desglosa por petición (prioridad/consumible) → se muestra «—».
  const cifras = [
    { etiqueta: "Peticiones", valor: k.ordenes, fmt: (v: number | null) => (v === null ? "—" : fmtN(v)), detalle: k.ordenes !== null ? `${fmtN(k.dias ? k.ordenes / k.dias : 0)} al día · ${fmtN(k.dias)} días con datos` : "No disponible con este filtro de prioridad", color: "#00A99D" },
    { etiqueta: "Tubos y etiquetas", valor: k.unidades, fmt: (v: number | null) => fmtN(v), detalle: k.ordenes ? `${fmtN(k.unidades / k.ordenes, 2)} por petición` : `${fmtN(urgente, 1)} % de tubos son de peticiones urgentes`, color: "#F7941D" },
    { etiqueta: "Circuito · la mitad en menos de", valor: k.p50Total, fmt: (v: number | null) => fmtMin(v), detalle: k.tiemposN ? `9 de cada 10 en menos de ${fmtMin(k.p90Total)} · ${fmtN(k.tiemposN)} peticiones medidas` : "Sin hitos suficientes", color: "#818CF8" },
    { etiqueta: "Eventos por 1.000 tubos", valor: k.tasaEventos, fmt: (v: number | null) => fmtN(v, 1), detalle: `${fmtN(k.eventos)} eventos de calidad`, color: "#FB7185" },
  ]

  const portada = (enPresentacion: boolean) => (
    <div className={enPresentacion ? "py-6 sm:py-12" : ""}>
      <div className={s.rise}><BrandLockup size="lg" /></div>
      <p className={`${s.rise} mt-8 text-[11px] font-extrabold uppercase tracking-[.22em] text-teal-200`} style={{ ["--d" as string]: "60ms" }}>Informe Inteligencia InLab</p>
      <h1 className={`${s.rise} mt-2 max-w-3xl text-3xl font-extrabold leading-[1.05] tracking-[-.035em] text-white sm:text-5xl`} style={{ ["--d" as string]: "120ms" }}>{datos.hospital.nombre}</h1>
      <p className={`${s.rise} mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300`} style={{ ["--d" as string]: "180ms" }}>
        <span className="inline-flex items-center gap-1.5"><IconCalendar size={15} className="text-teal-300" />{periodoLargo}</span>
        {datos.hospital.ciudad && <span className="text-slate-400">{datos.hospital.ciudad}{datos.hospital.provincia && datos.hospital.provincia !== datos.hospital.ciudad ? ` · ${datos.hospital.provincia}` : ""}</span>}
      </p>
      <div className={`${s.rise} mt-4 flex flex-wrap gap-2`} style={{ ["--d" as string]: "220ms" }}>
        <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1 text-[11px] font-bold text-slate-200">{filtros.areas.length ? `${filtros.areas.length} de ${ds.areas.length} áreas` : alcanceAreas}</span>
        {filtros.urgencia !== "todas" && <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1 text-[11px] font-bold text-slate-200">{filtros.urgencia === "urgente" ? "Solo urgentes" : "Solo normales"}</span>}
        {recortado && <span className="rounded-full border border-teal-300/30 bg-teal-400/10 px-3 py-1 text-[11px] font-bold text-teal-100">Dentro de {fmtDia(total.desde, CORTO)} – {fmtDia(total.hasta, CORTO)}</span>}
        <span className="rounded-full border border-white/15 bg-white/[.07] px-3 py-1 text-[11px] font-bold text-slate-200">Solo lectura · sin datos de pacientes</span>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cifras.map((c, i) => <CifraHero key={c.etiqueta} {...c} retardo={260 + i * 70} />)}
      </div>
    </div>
  )

  const diapositivas: Diapositiva[] = [
    { id: "portada", titulo: "Portada", contenido: portada(true) },
    { id: "resumen", eyebrow: "01 · Resumen ejecutivo", titulo: "Lectura del periodo", contenido: <VistaResumen {...props} /> },
    { id: "consumo", eyebrow: "02 · Consumo y demanda", titulo: "Qué se consume y cuándo", contenido: <VistaConsumo {...props} /> },
    { id: "tiempos", eyebrow: "03 · Flujo y tiempos", titulo: "Cuánto tarda cada tramo", contenido: <VistaTiempos {...props} /> },
    { id: "calidad", eyebrow: "04 · Incidencias y calidad", titulo: "Eventos de calidad", contenido: <VistaCalidad {...props} /> },
    ...(tarifas ? [{ id: "facturacion", eyebrow: "05 · Modelo comercial", titulo: "Consumo facturable", contenido: <div className="card p-5"><TablaFacturacion {...props} tarifas={tarifas} /></div> }] : []),
  ]

  const chip = (on: boolean) => `min-h-[36px] shrink-0 rounded-full px-3 text-[11px] font-extrabold transition ${on ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`

  return (
    <div className="inlab-print">
      <style>{PRINT_CSS}</style>

      {/* ── Portada ── */}
      <header className={`${s.ink} relative rounded-b-[32px] px-4 pb-8 pt-8 sm:px-8 sm:pb-12 sm:pt-12`} style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
        <span className={s.aurora} style={{ width: 520, height: 520, left: "-12%", top: "-30%", background: "#00A99D" }} />
        <span className={s.aurora} style={{ width: 380, height: 380, right: "-6%", bottom: "-30%", background: "#F7941D", animationDelay: "-8s" }} />
        <div className="mx-auto max-w-6xl">
          {portada(false)}
          <div className={`${s.rise} inlab-no-print mt-6 flex flex-wrap gap-2`} style={{ ["--d" as string]: "560ms" }}>
            <button type="button" onClick={() => setPresentando(true)} className="btn-teal inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold text-white" style={{ backgroundColor: "#00A99D" }}><IconMonitor size={16} />Presentar</button>
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/[.07] px-4 text-sm font-semibold text-white hover:bg-white/15"><IconPrint size={16} />Imprimir / PDF</button>
            <button type="button" onClick={() => void compartir()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/[.07] px-4 text-sm font-semibold text-white hover:bg-white/15">{puedeCompartir ? <IconSend size={16} /> : <IconClipboard size={16} />}{puedeCompartir ? "Compartir" : "Copiar enlace"}</button>
          </div>
        </div>
      </header>

      {/* ── Barra de navegación y filtros ── */}
      <div className="inlab-no-print sticky top-0 z-30 px-2 pt-2 sm:px-4" style={{ paddingTop: "max(.5rem, env(safe-area-inset-top))" }}>
        <div className="filter-surface mx-auto max-w-6xl p-2">
          <div className="flex items-center gap-2">
            <nav aria-label="Secciones del informe" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {secciones.map(x => (
                <button key={x.id} type="button" onClick={() => ir(x.id)} aria-current={activa === x.id ? "true" : undefined} className={chip(activa === x.id)}>{x.label}</button>
              ))}
            </nav>
            <button type="button" onClick={() => setPresentando(true)} className="hidden min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-[11px] font-extrabold text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 sm:flex"><IconMonitor size={13} />Presentar</button>
          </div>
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-700/70 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Periodo">
              {presets.map(p => <button key={p.k} type="button" aria-pressed={presetActivo === p.k} onClick={() => setRango(p.r)} className={chip(presetActivo === p.k)}>{p.label}</button>)}
              {meses.length > 1 && (
                <select aria-label="Mes" value={meses.some(m => m.k === presetActivo) ? presetActivo : ""} onChange={e => { const m = meses.find(x => x.k === e.target.value); if (m) setRango(m.r) }}
                  className="min-h-[36px] shrink-0 rounded-full border border-slate-200 bg-transparent px-3 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <option value="">Mes…</option>
                  {meses.map(m => <option key={m.k} value={m.k}>{m.label}</option>)}
                </select>
              )}
              <span className="ml-1 hidden shrink-0 items-center gap-1 text-[11px] text-slate-500 sm:flex">
                <input aria-label="Desde" type="date" min={total.desde} max={rango.hasta} value={rango.desde} onChange={e => { if (e.target.value && e.target.value >= total.desde && e.target.value <= rango.hasta) setRango({ ...rango, desde: e.target.value }) }} className="rounded-lg bg-transparent px-1 py-1 font-semibold text-slate-700 dark:text-slate-200" />
                –
                <input aria-label="Hasta" type="date" min={rango.desde} max={total.hasta} value={rango.hasta} onChange={e => { if (e.target.value && e.target.value <= total.hasta && e.target.value >= rango.desde) setRango({ ...rango, hasta: e.target.value }) }} className="rounded-lg bg-transparent px-1 py-1 font-semibold text-slate-700 dark:text-slate-200" />
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              {ds.areas.length > 1 && (
                <button type="button" onClick={() => setVerAreas(v => !v)} aria-expanded={verAreas} className={`${chip(verAreas || filtros.areas.length > 0)} border ${verAreas || filtros.areas.length ? "border-transparent" : "border-slate-200 dark:border-slate-700"}`}>
                  Work areas · {filtros.areas.length ? `${filtros.areas.length}/${ds.areas.length}` : "todas"}
                </button>
              )}
              <Segmentado<Urgencia> etiqueta="Prioridad" valor={filtros.urgencia} onChange={u => onFiltro({ urgencia: u })} opciones={[{ value: "todas", label: "Todas" }, { value: "urgente", label: "Urgentes" }, { value: "normal", label: "Normales" }]} />
            </div>
          </div>
          {verAreas && ds.areas.length > 1 && (
            <div className={`${s.swap} max-h-[45vh] overflow-y-auto`}>
              <SelectorAreas ds={ds} rango={rango} filtros={filtros} onChange={areas => onFiltro({ areas, puesto: null })} />
            </div>
          )}
          {(filtros.consumible || filtros.puesto) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {filtros.consumible && <button type="button" onClick={() => onFiltro({ consumible: null })} className="rounded-full bg-teal-50 px-2.5 py-1 font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">Consumible: {filtros.consumible} ×</button>}
              {filtros.puesto && <button type="button" onClick={() => onFiltro({ puesto: null })} className="rounded-full bg-teal-50 px-2.5 py-1 font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">Puesto: {filtros.puesto} ×</button>}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <main id="main-content" className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
        {datos.areas.length > 0 && (
          <p className="text-[11px] leading-5 text-gray-500 dark:text-slate-400">
            <strong className="text-gray-700 dark:text-slate-200">Alcance del informe:</strong> {datos.areas.map(etiquetaArea).join(" · ")}.
          </p>
        )}
        <Seccion id="resumen" numero="01" titulo="Resumen ejecutivo" texto={`${fmtDia(rango.desde, CORTO)} – ${fmtDia(rango.hasta, CORTO)} · actividad, tiempos y calidad de un vistazo`}><VistaResumen {...props} /></Seccion>
        <Seccion id="consumo" numero="02" titulo="Consumo y demanda" texto="Qué se consume, dónde y en qué franjas"><VistaConsumo {...props} /></Seccion>
        <Seccion id="tiempos" numero="03" titulo="Flujo y tiempos" texto="Medianas y colas (P90) de cada tramo del flujo"><VistaTiempos {...props} /></Seccion>
        <Seccion id="calidad" numero="04" titulo="Incidencias y calidad" texto="Reimpresiones, anulaciones e incidencias registradas en InLab"><VistaCalidad {...props} /></Seccion>
        {tarifas && (
          <Seccion id="facturacion" numero="05" titulo="Modelo comercial" texto="Consumo facturable según las tarifas vigentes">
            <Panel eyebrow="Modelo comercial" titulo="Consumo facturable"><TablaFacturacion {...props} tarifas={tarifas} /></Panel>
          </Seccion>
        )}

        <footer className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-[var(--surface)] p-5 text-[11px] leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <IconShieldAlert size={15} className="mt-0.5 shrink-0 text-teal-600" />
            <span>Informe generado por <strong className="text-slate-700 dark:text-white">Palex Medical</strong> a partir de totales diarios agregados de InLab. No contiene datos identificativos de pacientes. Datos a {new Date(datos.generado).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}.</span>
          </p>
          <p className="shrink-0 font-semibold text-slate-600 dark:text-slate-200">{caducidad}</p>
        </footer>
      </main>

      {presentando && (
        <ModoPresentacion titulo={`${datos.hospital.nombre} · ${periodoLargo}`} diapositivas={diapositivas} onCerrar={() => setPresentando(false)} />
      )}
    </div>
  )
}
