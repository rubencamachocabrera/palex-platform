"use client"

/**
 * Compartir informe InLab: configura un enlace público de solo lectura (periodo,
 * work areas, facturación, caducidad), muestra la "tarjeta de informe" con vista
 * previa en vivo y QR de marca, y gestiona los enlaces existentes (vistas, revocar).
 * El QR y sus descargas (PNG/SVG) se generan en el navegador.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useModalA11y } from "@/hooks/useModalA11y"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"
import {
  IconArrowRight, IconCheck, IconChevronDown, IconClipboard, IconDownload, IconLock, IconMail, IconMonitor, IconMonitorShare, IconSend, IconTrash, IconX,
} from "@/components/ui/Icons"
import { fmtDia } from "@/components/inlab/charts"
import { alternarArea, etiquetaArea, FILTROS_VACIOS, kpis, type Dataset, type Rango } from "@/lib/inlab/analytics"
import { CADUCIDADES_SHARE, estadoShare, etiquetaAreasShare, type EstadoShare } from "@/lib/inlab/share"
import { useQr } from "@/components/inlab/share/QrCodigo"
import { QrPantalla } from "@/components/inlab/share/QrPantalla"
import { TarjetaInforme } from "@/components/inlab/share/TarjetaInforme"
import { descargarBlob, nombreFichero, pngTarjeta, svgCompleto } from "@/components/inlab/share/qr"

interface Share {
  id: string; token: string; desde: string | null; hasta: string | null; incluirFacturacion: boolean; areas?: string[]
  expiraEn: string | null; revocado: boolean; vistas: number; ultimaVista: string | null; creadoEn: string; creadoPor?: { nombre: string }
}

const LARGO: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
const textoPeriodo = (desde: string | null, hasta: string | null) =>
  desde ? `${fmtDia(desde, LARGO)} – ${fmtDia(hasta ?? desde, LARGO)}` : "Todo el histórico · se actualiza con nuevas cargas"
const textoCaducidad = (expiraEn: string | null, estado: EstadoShare = "activo") =>
  estado === "revocado" ? "Revocado: ya no se puede abrir"
    : !expiraEn ? "Sin caducidad"
      : `${estado === "caducado" ? "Caducó" : "Válido hasta"} el ${new Date(expiraEn).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`

function haceTiempo(iso: string, ahora: number): string {
  const min = Math.round((ahora - new Date(iso).getTime()) / 60000)
  if (min < 1) return "ahora mismo"
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d < 30 ? `hace ${d} d` : new Date(iso).toLocaleDateString("es-ES")
}

const PUNTO: Record<EstadoShare, string> = { activo: "bg-emerald-500", caducado: "bg-amber-500", revocado: "bg-rose-500" }

export function ShareModal({ abierto, onCerrar, hospitalId, hospitalNombre, rango, puedeFacturacion, ds = null, areasIniciales = [] }: {
  abierto: boolean; onCerrar: () => void; hospitalId: string; hospitalNombre: string; rango: Rango; puedeFacturacion: boolean
  /** Dataset del dashboard: vista previa de KPIs y lista de work areas */
  ds?: Dataset | null
  /** Work areas seleccionadas en el dashboard (se proponen por defecto) */
  areasIniciales?: string[]
}) {
  const toast = useToast()
  const [pantalla, setPantalla] = useState(false)
  // Con el QR a pantalla completa, Esc lo cierra a él (QrPantalla lo captura), no al modal
  const ref = useModalA11y(abierto, onCerrar)
  const tarjetaRef = useRef<HTMLDivElement>(null)
  const [shares, setShares] = useState<Share[]>([])
  const [periodo, setPeriodo] = useState<"rango" | "todo">("rango")
  const [areas, setAreas] = useState<string[]>([])
  const [facturacion, setFacturacion] = useState(false)
  const [expira, setExpira] = useState<number | null>(30)
  const [creando, setCreando] = useState(false)
  const [activoId, setActivoId] = useState<string | null>(null)
  const [historial, setHistorial] = useState(false)
  const [descargando, setDescargando] = useState<"png" | "svg" | null>(null)
  // Web Share API (móvil): el modal solo se pinta en cliente tras abrirlo
  const [puedeCompartir] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function")

  const todasAreas = useMemo(() => ds?.areas ?? [], [ds])

  // Al abrir: propone las áreas del dashboard y vuelve al borrador
  const [abiertoPrev, setAbiertoPrev] = useState(false)
  if (abierto !== abiertoPrev) {
    setAbiertoPrev(abierto)
    if (abierto) {
      const ini = areasIniciales.filter(a => todasAreas.includes(a))
      setAreas(ini.length === todasAreas.length ? [] : ini)
      setActivoId(null)
    }
  }

  // "Ahora" de referencia para estados/caducidades (se refresca al cargar la lista)
  const [ahora, setAhora] = useState(() => Date.now())
  const cargar = useCallback(() => {
    fetch(`/api/inlab/shares?hospitalId=${encodeURIComponent(hospitalId)}`).then(r => (r.ok ? r.json() : [])).then(d => { setAhora(Date.now()); setShares(Array.isArray(d) ? d : []) }).catch(() => {})
  }, [hospitalId])
  useEffect(() => { if (abierto) cargar() }, [abierto, cargar])

  const origen = typeof window !== "undefined" ? window.location.origin : ""
  const urlDe = (t: string) => `${origen}/share/inlab/${t}`
  const activo = shares.find(s => s.id === activoId) ?? null
  const url = activo && estadoShare(activo, ahora) === "activo" ? urlDe(activo.token) : null
  const g = useQr(url)

  // Lo que muestra la tarjeta: el enlace seleccionado o el borrador de la configuración
  const vista = useMemo(() => {
    if (activo) return { desde: activo.desde, hasta: activo.hasta, areas: activo.areas ?? [], facturacion: activo.incluirFacturacion, expiraEn: activo.expiraEn, estado: estadoShare(activo, ahora) as EstadoShare }
    return {
      desde: periodo === "rango" ? rango.desde : null, hasta: periodo === "rango" ? rango.hasta : null, areas, facturacion: facturacion && puedeFacturacion,
      expiraEn: null, estado: null,
    }
  }, [activo, ahora, periodo, rango, areas, facturacion, puedeFacturacion])

  // Vista previa con las mismas funciones del dashboard, solo si el periodo está dentro de lo cargado
  const preview = useMemo(() => {
    if (!ds || !vista.desde || !vista.hasta || vista.desde < rango.desde || vista.hasta > rango.hasta) return null
    return kpis(ds, { desde: vista.desde, hasta: vista.hasta }, { ...FILTROS_VACIOS, areas: vista.areas })
  }, [ds, vista, rango])

  const alcance = `${etiquetaAreasShare(vista.areas)}${vista.facturacion ? " · con facturación" : ""}`
  const periodoTxt = textoPeriodo(vista.desde, vista.hasta)

  function editar<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setActivoId(null) }
  }

  const copiar = async (t: string) => {
    try { await navigator.clipboard.writeText(urlDe(t)); toast.success("Enlace copiado") } catch { toast.error("No se pudo copiar") }
  }

  async function crear() {
    setCreando(true)
    try {
      const r = await fetch("/api/inlab/shares", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId, desde: periodo === "rango" ? rango.desde : null, hasta: periodo === "rango" ? rango.hasta : null,
          incluirFacturacion: facturacion && puedeFacturacion, areas, expiraDias: expira,
        }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.id) { toast.error(d?.error ?? "No se pudo crear el enlace"); return }
      setShares(prev => [d as Share, ...prev.filter(s => s.id !== d.id)])
      setActivoId(d.id)
      try { await navigator.clipboard.writeText(urlDe(d.token)); toast.success("Enlace creado y copiado") } catch { toast.success("Enlace creado") }
      requestAnimationFrame(() => tarjetaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }))
    } finally { setCreando(false) }
  }

  async function revocar(s: Share) {
    if (!confirm("¿Revocar este enlace? Quien lo tenga (o haya escaneado el QR) dejará de poder ver el informe.")) return
    const r = await fetch(`/api/inlab/shares/${s.id}`, { method: "DELETE" })
    if (!r.ok) { const d = await r.json().catch(() => null); toast.error(d?.error ?? "No se pudo revocar"); return }
    toast.success("Enlace revocado")
    setShares(prev => prev.map(x => (x.id === s.id ? { ...x, revocado: true } : x)))
  }

  async function descargar(tipo: "png" | "svg") {
    if (!g || !activo) return
    setDescargando(tipo)
    try {
      if (tipo === "svg") descargarBlob(new Blob([svgCompleto(g)], { type: "image/svg+xml" }), nombreFichero(hospitalNombre, "svg"))
      else descargarBlob(await pngTarjeta(g, { hospital: hospitalNombre, periodo: periodoTxt, alcance, pie: `Palex Medical · ${textoCaducidad(activo.expiraEn)} · solo lectura, sin datos de pacientes` }), nombreFichero(hospitalNombre, "png"))
    } catch { toast.error("No se pudo generar la imagen") } finally { setDescargando(null) }
  }

  const asunto = `Informe Inteligencia InLab · ${hospitalNombre}`
  const cuerpo = (u: string) => [
    "Hola,", "",
    `Te comparto el informe de Inteligencia InLab de ${hospitalNombre} (${periodoTxt}).`, "",
    u, "",
    `Es un enlace de solo lectura (${textoCaducidad(activo?.expiraEn ?? null).toLowerCase()}). Incluye: ${alcance.toLowerCase()}. Puedes filtrar por periodo y work area, imprimirlo o verlo en modo presentación. No contiene datos de pacientes.`, "",
    "Un saludo",
  ].join("\n")
  const mailto = url ? `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo(url))}` : undefined

  async function compartirNativo() {
    if (!url) return
    try { await navigator.share({ title: asunto, text: `${asunto} (${periodoTxt})`, url }) } catch { /* cancelado */ }
  }

  if (!abierto) return null
  const activos = shares.filter(s => estadoShare(s, ahora) === "activo")
  const pasados = shares.filter(s => estadoShare(s, ahora) !== "activo")

  const fila = (s: Share) => {
    const est = estadoShare(s, ahora)
    const sel = s.id === activoId
    return (
      <li key={s.id} className={`group flex flex-col gap-2 rounded-2xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${sel ? "border-teal-300 bg-teal-50/60 dark:border-teal-700 dark:bg-teal-950/20" : "border-slate-200/80 hover:border-slate-300 dark:border-slate-700"}`}>
        <button type="button" onClick={() => setActivoId(s.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`Ver tarjeta del enlace ${textoPeriodo(s.desde, s.hasta)}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PUNTO[est]}`} aria-hidden="true" />
          <span className="min-w-0 text-xs">
            <span className="block font-bold text-gray-800 dark:text-white">{textoPeriodo(s.desde, s.hasta)}</span>
            <span className="mt-1 flex flex-wrap gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{etiquetaAreasShare(s.areas ?? [])}</span>
              {s.incluirFacturacion && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Con facturación</span>}
            </span>
            <span className="mt-1 block text-[11px] text-gray-500 dark:text-slate-400">
              <strong className="font-mono font-bold tabular-nums text-gray-700 dark:text-slate-200">{s.vistas}</strong> {s.vistas === 1 ? "apertura" : "aperturas"}
              {s.ultimaVista ? ` · última ${haceTiempo(s.ultimaVista, ahora)}` : " · sin abrir aún"} · {textoCaducidad(s.expiraEn, est).replace(/^Válido hasta el/, "hasta el")}{s.creadoPor?.nombre ? ` · ${s.creadoPor.nombre}` : ""}
            </span>
          </span>
        </button>
        {est === "activo" && (
          <div className="flex shrink-0 gap-1 self-end sm:self-auto">
            <button type="button" onClick={() => setActivoId(s.id)} aria-label="Ver QR" title="Ver QR" className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/30">QR<IconArrowRight size={13} /></button>
            <button type="button" onClick={() => void copiar(s.token)} aria-label="Copiar enlace" title="Copiar enlace" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-800"><IconClipboard size={15} /></button>
            <button type="button" onClick={() => void revocar(s)} aria-label="Revocar enlace" title="Revocar enlace" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><IconTrash size={15} /></button>
          </div>
        )}
      </li>
    )
  }

  const accion = "flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[var(--surface)] px-3 text-xs font-bold text-gray-700 transition hover:-translate-y-px hover:border-teal-300 hover:text-teal-700 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:text-teal-300"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inlab-share-titulo" className="modal-surface max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl outline-none sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200/70 bg-[var(--surface)]/90 px-5 py-4 backdrop-blur dark:border-slate-700/70">
          <div className="flex items-center gap-3">
            <span className="kpi-icon-tile flex h-10 w-10 items-center justify-center rounded-xl text-white"><IconMonitorShare size={18} /></span>
            <div>
              <h2 id="inlab-share-titulo" className="text-base font-extrabold tracking-[-.01em] text-gray-900 dark:text-white">Compartir informe</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Enlace y QR de solo lectura · {hospitalNombre}</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"><IconX size={17} /></button>
        </div>

        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Configuración ── */}
          <div className="space-y-5">
            <fieldset>
              <legend className="kpi-label mb-2 text-gray-500">Periodo</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["rango", "Rango del dashboard", `${fmtDia(rango.desde, LARGO)} – ${fmtDia(rango.hasta, LARGO)}`],
                  ["todo", "Todo el histórico", "Incluye las cargas futuras"],
                ] as const).map(([v, t, sub]) => (
                  <label key={v} className={`relative flex min-h-[64px] cursor-pointer flex-col justify-center rounded-2xl border px-3.5 py-2.5 transition ${periodo === v ? "border-teal-400 bg-teal-50/70 shadow-[0_0_0_3px_rgba(0,169,157,.12)] dark:border-teal-600 dark:bg-teal-950/25" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}>
                    <input type="radio" name="inlab-share-periodo" value={v} checked={periodo === v} onChange={() => editar(setPeriodo)(v)} className="sr-only" />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">{t}</span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">{sub}</span>
                    {periodo === v && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: TEAL }}><IconCheck size={12} /></span>}
                  </label>
                ))}
              </div>
            </fieldset>

            {todasAreas.length > 1 && (
              <fieldset>
                <legend className="kpi-label mb-2 flex w-full items-center justify-between text-gray-500">
                  <span>Work areas</span>
                  <span className="font-mono text-[10px] normal-case tracking-normal text-gray-400">{areas.length ? `${areas.length} de ${todasAreas.length}` : `Todas (${todasAreas.length})`}</span>
                </legend>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Work areas incluidas">
                  <button type="button" aria-pressed={areas.length === 0} onClick={() => editar(setAreas)([])} className={`min-h-[36px] rounded-full px-3 text-[11px] font-bold transition ${areas.length === 0 ? "text-white shadow-sm" : "border border-slate-200 text-gray-600 hover:border-teal-300 dark:border-slate-700 dark:text-slate-300"}`} style={areas.length === 0 ? { background: TEAL } : undefined}>Todas</button>
                  {todasAreas.map(a => {
                    const on = areas.includes(a)
                    return (
                      <button key={a} type="button" aria-pressed={on} onClick={() => editar(setAreas)(alternarArea(areas, a, todasAreas))} className={`flex min-h-[36px] items-center gap-1 rounded-full px-3 text-[11px] font-bold transition ${on ? "bg-teal-600 text-white shadow-sm" : "border border-slate-200 text-gray-600 hover:border-teal-300 dark:border-slate-700 dark:text-slate-300"}`}>
                        {on && <IconCheck size={11} />}{etiquetaArea(a)}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-gray-500 dark:text-slate-400">
                  {areas.length ? "El cliente solo recibirá los datos de estas áreas y podrá filtrar entre ellas." : "Incluye todas las áreas, también las que aparezcan en cargas futuras."}
                </p>
              </fieldset>
            )}

            <fieldset>
              <legend className="kpi-label mb-2 text-gray-500">Caducidad</legend>
              <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Caducidad del enlace">
                {CADUCIDADES_SHARE.map(c => (
                  <button key={c.label} type="button" aria-pressed={expira === c.dias} onClick={() => editar(setExpira)(c.dias)} className={`min-h-[40px] rounded-xl px-1 text-[11px] font-extrabold transition ${expira === c.dias ? "bg-[var(--surface)] text-teal-700 shadow-sm dark:text-teal-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>{c.label}</button>
                ))}
              </div>
            </fieldset>

            {puedeFacturacion && (
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 px-3.5 py-3 dark:border-slate-700">
                <span className="text-sm text-gray-700 dark:text-gray-200"><span className="font-bold">Incluir facturación</span><span className="block text-[11px] text-gray-500 dark:text-slate-400">Muestra al cliente tarifas e importes de los consumibles incluidos.</span></span>
                <input type="checkbox" role="switch" checked={facturacion} onChange={e => editar(setFacturacion)(e.target.checked)} className="peer sr-only" />
                <span aria-hidden="true" className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400 dark:bg-slate-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-[#fff] after:shadow after:transition peer-checked:after:translate-x-5" />
              </label>
            )}

            <button type="button" disabled={creando} onClick={() => void crear()} className="btn-teal flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
              <IconLock size={16} />{creando ? "Generando…" : activo ? "Generar otro enlace con esta configuración" : "Generar enlace seguro"}
            </button>
            <p className="-mt-2 text-center text-[11px] text-gray-400">El enlace es la única llave: solo agregados, sin datos de pacientes. Puedes revocarlo cuando quieras.</p>
          </div>

          {/* ── Tarjeta de informe + acciones ── */}
          <div ref={tarjetaRef} className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <TarjetaInforme
              hospital={hospitalNombre} periodo={periodoTxt} alcance={alcance}
              caducidad={vista.estado ? textoCaducidad(vista.expiraEn, vista.estado) : expira ? `Caducará ${expira} días después de generarlo` : "Sin caducidad"}
              kpis={preview} estado={vista.estado ?? "borrador"} g={g} url={url} claveAnimacion={activo?.id ?? "borrador"}
            />
            {activo && url ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => void copiar(activo.token)} className={accion}><IconClipboard size={15} />Copiar enlace</button>
                <button type="button" onClick={() => setPantalla(true)} disabled={!g} className={accion}><IconMonitor size={15} />Presentar</button>
                <a href={url} target="_blank" rel="noopener noreferrer" className={accion}><IconArrowRight size={15} />Abrir</a>
                <button type="button" onClick={() => void descargar("png")} disabled={!g || !!descargando} className={accion}><IconDownload size={15} />{descargando === "png" ? "Generando…" : "Tarjeta PNG"}</button>
                <button type="button" onClick={() => void descargar("svg")} disabled={!g || !!descargando} className={accion}><IconDownload size={15} />QR en SVG</button>
                {puedeCompartir
                  ? <button type="button" onClick={() => void compartirNativo()} className={accion}><IconSend size={15} />Compartir…</button>
                  : <a href={mailto} className={accion}><IconMail size={15} />Correo</a>}
                {puedeCompartir && <a href={mailto} className={`${accion} col-span-2 sm:col-span-3`}><IconMail size={15} />Enviar por correo</a>}
              </div>
            ) : activo ? (
              <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center text-[11px] text-gray-500 dark:bg-slate-800 dark:text-slate-300">Este enlace ya no está activo. Genera uno nuevo para compartir.</p>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-2.5 text-center text-[11px] leading-5 text-gray-500 dark:border-slate-700 dark:text-slate-400">
                Ajusta el periodo y las áreas: la tarjeta muestra en vivo lo que verá el cliente. Al generar el enlace tendrás QR, descarga, correo y modo presentación.
              </p>
            )}
          </div>
        </div>

        {(activos.length > 0 || pasados.length > 0) && (
          <div className="border-t border-slate-200/70 px-5 py-5 dark:border-slate-700/70">
            <div className="mb-3 flex items-center justify-between">
              <p className="kpi-label text-gray-500">Enlaces activos <span className="font-mono text-gray-400">({activos.length})</span></p>
              {activoId && <button type="button" onClick={() => setActivoId(null)} className="text-[11px] font-bold text-teal-700 dark:text-teal-300">Volver a la vista previa</button>}
            </div>
            {activos.length > 0 ? <ul className="space-y-2">{activos.map(fila)}</ul> : <p className="text-xs text-gray-400">No hay enlaces activos.</p>}
            {pasados.length > 0 && (
              <div className="mt-3">
                <button type="button" onClick={() => setHistorial(v => !v)} aria-expanded={historial} className="flex min-h-[40px] items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-slate-400">
                  <IconChevronDown size={14} className={`transition-transform ${historial ? "rotate-180" : ""}`} />Caducados y revocados ({pasados.length})
                </button>
                {historial && <ul className="mt-2 space-y-2 opacity-80">{pasados.map(fila)}</ul>}
              </div>
            )}
          </div>
        )}
      </div>

      {pantalla && g && url && (
        <QrPantalla g={g} url={url} hospital={hospitalNombre} periodo={periodoTxt} alcance={alcance} onCerrar={() => setPantalla(false)} />
      )}
    </div>
  )
}
