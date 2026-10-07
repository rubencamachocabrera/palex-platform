"use client"

/**
 * Inteligencia InLab — dashboard sobre agregados cargados desde exportaciones InLab.
 * Ver src/lib/inlab/README.md para el flujo completo y la adaptación al CSV real.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton, SkeletonKPI } from "@/components/ui/Skeleton"
import {
  IconBuilding, IconCalendar, IconCheck, IconChevronDown, IconMicroscope, IconMonitorShare, IconPlus, IconPrint, IconRefreshCw, IconX,
} from "@/components/ui/Icons"
import { TEAL, ORANGE } from "@/lib/brand"
import { usePerfil } from "@/hooks/usePerfil"
import { useFabAction } from "@/hooks/useFabAction"
import { INLAB_ROLES_VER } from "@/lib/inlab/roles"
import { decodificar, FILTROS_VACIOS, periodoAnterior, type Filtros, type Rango, type Urgencia } from "@/lib/inlab/analytics"
import { addDias } from "@/lib/inlab/dates"
import type { InlabPayload } from "@/lib/inlab/types"
import { fmtDia } from "@/components/inlab/charts"
import { Segmentado } from "@/components/inlab/ui"
import { VistaCalidad, VistaConsumo, VistaResumen, VistaTiempos } from "@/components/inlab/Vistas"
import { UploadWizard, type HospitalOpcion } from "./_components/UploadWizard"
import { VistaCargas } from "./_components/VistaCargas"
import { VistaComparar } from "./_components/VistaComparar"
import { VistaFacturacion } from "./_components/VistaFacturacion"
import { ShareModal } from "./_components/ShareModal"

const DemoGulla = dynamic(() => import("./_demo/DemoGulla").then(m => m.DemoGulla), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> })
const InformeInlab = dynamic(() => import("@/components/inlab/InformeInlab").then(m => m.InformeInlab), { ssr: false })

type Tab = "resumen" | "consumo" | "tiempos" | "calidad" | "comparar" | "facturacion" | "cargas"
type Preset = "30d" | "90d" | "12m" | "todo" | "custom"

interface Cobertura { hospitalId: string; desde: string; hasta: string; dias: number; cargas: number; ultimaCarga: string | null }
interface InfoHospitales { todos: (HospitalOpcion & { camas: number | null })[]; conDatos: Cobertura[]; puedeFacturacion: boolean }

const TABS: { key: Tab; label: string; color: string; facturacion?: boolean }[] = [
  { key: "resumen", label: "Resumen ejecutivo", color: TEAL },
  { key: "consumo", label: "Consumo & demanda", color: ORANGE },
  { key: "tiempos", label: "Flujo & tiempos", color: "#6366f1" },
  { key: "calidad", label: "Incidencias & calidad", color: "#E11D48" },
  { key: "comparar", label: "Comparar hospitales", color: "#0EA5E9" },
  { key: "facturacion", label: "Modelo comercial", color: "#0f766e", facturacion: true },
  { key: "cargas", label: "Cargas & cobertura", color: "#64748b" },
]

const LS_KEY = "inlab_seleccion"

function rangoPreset(p: Preset, cob: { desde: string; hasta: string }): Rango {
  const n = p === "30d" ? 30 : p === "90d" ? 90 : p === "12m" ? 365 : 0
  if (!n) return { desde: cob.desde, hasta: cob.hasta }
  const desde = addDias(cob.hasta, -(n - 1))
  return { desde: desde < cob.desde ? cob.desde : desde, hasta: cob.hasta }
}

export default function InlabPage() {
  const { rol, isLoading: cargandoPerfil } = usePerfil()
  const [info, setInfo] = useState<InfoHospitales | null>(null)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [demo, setDemo] = useState(false)
  const [preset, setPreset] = useState<Preset>("90d")
  const [rangoCustom, setRango] = useState<Rango | null>(null)
  const [respuesta, setRespuesta] = useState<{ key: string; payload: InlabPayload | null; error: string | null } | null>(null)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [tab, setTab] = useState<Tab>("resumen")
  const [wizard, setWizard] = useState(false)
  const [share, setShare] = useState(false)
  const [informe, setInforme] = useState(false)
  const [version, setVersion] = useState(0)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  useFabAction("fab:inlab-cargar", () => setWizard(true))

  const cargarInfo = useCallback((preferido?: string) => fetch("/api/inlab/hospitales")
    .then(r => (r.ok ? r.json() : { todos: [], conDatos: [], puedeFacturacion: false }))
    .catch(() => ({ todos: [], conDatos: [], puedeFacturacion: false }))
    .then((d: InfoHospitales) => {
    setInfo(d)
    const ids = new Set(d.conDatos.map(c => c.hospitalId))
    setSeleccion(prev => {
      if (preferido && ids.has(preferido)) return [preferido]
      const validos = prev.filter(id => ids.has(id))
      if (validos.length) return validos
      let guardado: string[] = []
      try { guardado = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") } catch { /* sin storage */ }
      const g = Array.isArray(guardado) ? guardado.filter(id => ids.has(id)) : []
      if (g.length) return g
      return d.conDatos[0] ? [d.conDatos[0].hospitalId] : []
    })
  }), [])

  useEffect(() => { void cargarInfo() }, [cargarInfo])
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(seleccion)) } catch { /* sin storage */ } }, [seleccion])

  // Cerrar selector al hacer clic fuera
  useEffect(() => {
    if (!selectorAbierto) return
    const onDown = (e: MouseEvent) => { if (!selectorRef.current?.contains(e.target as Node)) setSelectorAbierto(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectorAbierto(false) }
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [selectorAbierto])

  // Cobertura combinada de la selección
  const cobertura = useMemo(() => {
    const cs = (info?.conDatos ?? []).filter(c => seleccion.includes(c.hospitalId))
    if (!cs.length) return null
    return { desde: cs.reduce((m, c) => (c.desde < m ? c.desde : m), cs[0].desde), hasta: cs.reduce((m, c) => (c.hasta > m ? c.hasta : m), cs[0].hasta) }
  }, [info, seleccion])

  // Rango derivado: preset relativo al último día con datos, o personalizado recortado a la cobertura
  const rango = useMemo<Rango | null>(() => {
    if (!cobertura) return null
    if (preset !== "custom" || !rangoCustom) return rangoPreset(preset, cobertura)
    const desde = rangoCustom.desde < cobertura.desde || rangoCustom.desde > cobertura.hasta ? cobertura.desde : rangoCustom.desde
    const hasta = rangoCustom.hasta > cobertura.hasta || rangoCustom.hasta < desde ? cobertura.hasta : rangoCustom.hasta
    return { desde, hasta }
  }, [cobertura, preset, rangoCustom])

  // Datos: rango + periodo anterior (para tendencias)
  const datosUrl = useMemo(() => {
    if (!rango || seleccion.length === 0 || !cobertura) return null
    const prev = periodoAnterior(rango)
    const desde = prev.desde < cobertura.desde ? cobertura.desde : prev.desde
    return `/api/inlab/datos?hospitalIds=${seleccion.join(",")}&desde=${desde}&hasta=${rango.hasta}`
  }, [rango, seleccion, cobertura])
  const datosKey = datosUrl ? `${datosUrl}#${version}` : null
  useEffect(() => {
    if (!datosUrl || !datosKey) return
    let vivo = true
    fetch(datosUrl)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (vivo) setRespuesta(r.ok ? { key: datosKey, payload: d, error: null } : { key: datosKey, payload: null, error: d?.error ?? "No se pudieron cargar los datos" })
      })
      .catch(() => { if (vivo) setRespuesta({ key: datosKey, payload: null, error: "Error de red" }) })
    return () => { vivo = false }
  }, [datosUrl, datosKey])
  // Mientras llega la respuesta nueva se mantiene la anterior (evita parpadeos)
  const cargandoDatos = !!datosKey && respuesta?.key !== datosKey
  const payload = datosKey ? respuesta?.payload ?? null : null
  const errorDatos = datosKey && respuesta?.key === datosKey ? respuesta.error : null

  const ds = useMemo(() => (payload ? decodificar(payload) : null), [payload])
  // Días con datos para "Cargas & cobertura": toda la cobertura, no solo el rango
  const [diasCobertura, setDiasCobertura] = useState<string[]>([])
  useEffect(() => {
    if (tab !== "cargas" || !cobertura || seleccion.length === 0) return
    fetch(`/api/inlab/datos?hospitalIds=${seleccion.join(",")}&desde=${cobertura.desde}&hasta=${cobertura.hasta}`)
      .then(r => (r.ok ? r.json() : null)).then(d => setDiasCobertura(Array.isArray(d?.dias) ? d.dias : [])).catch(() => {})
  }, [tab, cobertura, seleccion, version])

  const onFiltro = useCallback((p: Partial<Filtros>) => setFiltros(f => ({ ...f, ...p })), [])
  const onCompletado = useCallback((hospitalId: string) => {
    setDemo(false)
    setVersion(v => v + 1)
    void cargarInfo(hospitalId)
  }, [cargarInfo])

  const nombre = (id: string) => info?.todos.find(h => h.id === id)?.nombre ?? "Hospital"
  const unico = seleccion.length === 1 ? seleccion[0] : null
  const tabs = TABS.filter(t => !t.facturacion || info?.puedeFacturacion)
  const activos = [
    filtros.area && { k: "area" as const, label: `Área: ${filtros.area}` },
    filtros.consumible && { k: "consumible" as const, label: `Consumible: ${filtros.consumible}` },
    filtros.puesto && { k: "puesto" as const, label: `Puesto: ${filtros.puesto}` },
  ].filter(Boolean) as { k: "area" | "consumible" | "puesto"; label: string }[]

  if (!cargandoPerfil && rol && !(INLAB_ROLES_VER as readonly string[]).includes(rol)) {
    return <div className="py-24 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-slate-800"><IconMicroscope size={24} /></span><h1 className="mt-5 text-lg font-extrabold text-gray-900 dark:text-white">Acceso restringido</h1><p className="mt-2 text-sm text-gray-400">Inteligencia InLab está disponible para perfiles autorizados.</p></div>
  }

  const hayDatos = (info?.conDatos.length ?? 0) > 0
  const props = ds && rango ? { ds, rango, filtros, onFiltro } : null

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <PageHeader
        title="Inteligencia InLab"
        icon={<IconMicroscope size={19} />}
        subtitle="Actividad, consumo, tiempos y calidad de la preanalítica de cada hospital a partir de las exportaciones de InLab."
        actions={
          <>
            {unico && !demo && <button type="button" onClick={() => setShare(true)} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"><IconMonitorShare size={16} /><span className="hidden sm:inline">Compartir</span></button>}
            {ds && !demo && <button type="button" onClick={() => setInforme(true)} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"><IconPrint size={16} /><span className="hidden sm:inline">Informe</span></button>}
            <button type="button" onClick={() => setWizard(true)} className="btn-teal flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: TEAL }}><IconPlus size={16} />Cargar fichero</button>
          </>
        }
      />

      {/* Barra de filtros */}
      {(hayDatos || demo) && (
        <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/85">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div ref={selectorRef} className="relative">
              <button type="button" onClick={() => setSelectorAbierto(v => !v)} aria-expanded={selectorAbierto} aria-haspopup="listbox" className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left dark:border-slate-700 dark:bg-slate-800 xl:w-auto xl:min-w-[280px]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300"><IconBuilding size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[.12em] text-gray-400">Hospital{seleccion.length > 1 ? "es" : ""}</span>
                  <span className="block truncate text-xs font-extrabold text-gray-800 dark:text-white">{demo ? "Demostración · GULLA (estático)" : seleccion.length === 0 ? "Selecciona" : seleccion.length === 1 ? nombre(seleccion[0]) : `${seleccion.length} hospitales (agregados)`}</span>
                </span>
                <IconChevronDown size={15} className="text-gray-400" />
              </button>
              {selectorAbierto && (
                <div role="listbox" aria-multiselectable="true" className="absolute left-0 top-full z-30 mt-2 max-h-80 w-full min-w-[300px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {(info?.conDatos ?? []).map(c => {
                    const sel = !demo && seleccion.includes(c.hospitalId)
                    return (
                      <button key={c.hospitalId} type="button" role="option" aria-selected={sel}
                        onClick={() => { setDemo(false); setSeleccion(s => (demo ? [c.hospitalId] : sel ? (s.length > 1 ? s.filter(x => x !== c.hospitalId) : s) : [...s, c.hospitalId])) }}
                        className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${sel ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{sel && <IconCheck size={11} />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-gray-800 dark:text-white">{nombre(c.hospitalId)}</span>
                          <span className="block text-[10px] text-gray-400">{fmtDia(c.desde)} – {fmtDia(c.hasta, { day: "2-digit", month: "short", year: "numeric" })} · {c.dias} días · {c.cargas} cargas</span>
                        </span>
                        <span role="button" tabIndex={0} title="Solo este" onClick={e => { e.stopPropagation(); setDemo(false); setSeleccion([c.hospitalId]); setSelectorAbierto(false) }} onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); setDemo(false); setSeleccion([c.hospitalId]); setSelectorAbierto(false) } }} className="rounded-md px-1.5 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/30">solo</span>
                      </button>
                    )
                  })}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button type="button" role="option" aria-selected={demo} onClick={() => { setDemo(true); setSelectorAbierto(false) }} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/20">
                    <span className={`h-2 w-2 rounded-full ${demo ? "bg-amber-500" : "bg-amber-200"}`} />Demostración · GULLA (datos estáticos)
                  </button>
                </div>
              )}
            </div>

            {!demo && cobertura && rango && (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Segmentado etiqueta="Periodo rápido" valor={preset} onChange={setPreset} opciones={[{ value: "30d", label: "30 días" }, { value: "90d", label: "90 días" }, { value: "12m", label: "12 meses" }, { value: "todo", label: "Todo" }, { value: "custom", label: "Personalizado" }]} />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"><span className="text-[10px] font-bold text-gray-400">Desde</span><input aria-label="Fecha de inicio" type="date" min={cobertura.desde} max={rango.hasta} value={rango.desde} onChange={e => { if (!e.target.value) return; setPreset("custom"); setRango({ ...rango, desde: e.target.value }) }} className="bg-transparent font-semibold text-gray-700 outline-none dark:text-slate-200" /></label>
                  <label className="flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"><span className="text-[10px] font-bold text-gray-400">Hasta</span><input aria-label="Fecha de fin" type="date" min={rango.desde} max={cobertura.hasta} value={rango.hasta} onChange={e => { if (!e.target.value) return; setPreset("custom"); setRango({ ...rango, hasta: e.target.value }) }} className="bg-transparent font-semibold text-gray-700 outline-none dark:text-slate-200" /></label>
                </div>
              </div>
            )}
          </div>
          {!demo && rango && (
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5"><IconCalendar size={13} className="text-teal-600" /><strong className="font-bold text-gray-700 dark:text-gray-200">{fmtDia(rango.desde, { day: "2-digit", month: "short", year: "numeric" })} — {fmtDia(rango.hasta, { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                {activos.map(a => (
                  <button key={a.k} type="button" onClick={() => onFiltro({ [a.k]: null })} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-bold text-teal-800 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-200" aria-label={`Quitar filtro ${a.label}`}>{a.label}<IconX size={11} /></button>
                ))}
                {activos.length > 0 && <button type="button" onClick={() => setFiltros(f => ({ ...FILTROS_VACIOS, urgencia: f.urgencia }))} className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300"><IconRefreshCw size={12} />Limpiar</button>}
                {cargandoDatos && <span className="text-gray-400">Actualizando…</span>}
              </div>
              <Segmentado<Urgencia> etiqueta="Prioridad" valor={filtros.urgencia} onChange={u => onFiltro({ urgencia: u })} opciones={[{ value: "todas", label: "Todas" }, { value: "urgente", label: "Urgentes" }, { value: "normal", label: "Normales" }]} />
            </div>
          )}
        </section>
      )}

      {/* Contenido */}
      {info === null ? (
        <div className="space-y-4"><div className="grid grid-cols-2 gap-4 xl:grid-cols-4"><SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI /></div><Skeleton className="h-72 w-full" /></div>
      ) : demo ? (
        <DemoGulla />
      ) : !hayDatos ? (
        <div className="card p-6 sm:p-10">
          <EmptyState
            icon={<span className="kpi-icon-tile flex h-16 w-16 items-center justify-center rounded-2xl text-white"><IconMicroscope size={28} /></span>}
            title="Carga el primer fichero con +"
            description="Exporta los datos de InLab de un hospital (CSV) y cárgalos aquí. El fichero se procesa en tu navegador y solo se guardan totales diarios agregados, sin datos de pacientes."
            action={{ label: "Cargar exportación InLab", onClick: () => setWizard(true) }}
          />
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setDemo(true)} className="text-xs font-bold text-teal-700 underline-offset-4 hover:underline dark:text-teal-300">Ver la demostración con datos estáticos de GULLA</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80" role="tablist" aria-label="Secciones de Inteligencia InLab">
            <div className="flex min-w-max gap-1">
              {tabs.map(t => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className="relative min-h-[40px] rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all" style={tab === t.key ? { color: t.color, background: `${t.color}12`, boxShadow: `inset 0 0 0 1px ${t.color}22` } : { color: "#64748b" }}>
                  <span className="relative z-10">{t.label}</span>
                  {tab === t.key && <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full" style={{ background: t.color }} />}
                </button>
              ))}
            </div>
          </div>

          {errorDatos && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorDatos}</p>}

          {tab === "comparar" && rango ? <VistaComparar rango={rango} seleccionados={seleccion} />
            : tab === "cargas" ? <VistaCargas hospitalIds={seleccion} cobertura={cobertura} diasConDatos={diasCobertura} version={version} onCambio={() => { setVersion(v => v + 1); void cargarInfo() }} />
              : !props ? <div className="space-y-4"><div className="grid grid-cols-2 gap-4 xl:grid-cols-4"><SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI /></div><Skeleton className="h-72 w-full" /></div>
                : tab === "resumen" ? <VistaResumen {...props} />
                  : tab === "consumo" ? <VistaConsumo {...props} />
                    : tab === "tiempos" ? <VistaTiempos {...props} />
                      : tab === "calidad" ? <VistaCalidad {...props} />
                        : tab === "facturacion" ? <VistaFacturacion {...props} hospitalId={unico} hospitalNombre={unico ? nombre(unico) : ""} />
                          : null}
        </>
      )}

      {wizard && <UploadWizard onCerrar={() => setWizard(false)} hospitales={info?.todos ?? []} hospitalInicial={unico} onCompletado={onCompletado} />}
      {unico && rango && <ShareModal abierto={share} onCerrar={() => setShare(false)} hospitalId={unico} hospitalNombre={nombre(unico)} rango={rango} puedeFacturacion={!!info?.puedeFacturacion} />}
      {informe && ds && rango && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6">
          <InformeInlab
            hospital={{ nombre: unico ? nombre(unico) : `${seleccion.length} hospitales: ${seleccion.map(nombre).join(", ")}`, ciudad: unico ? info?.todos.find(h => h.id === unico)?.ciudad : null }}
            rango={rango}
            ds={ds}
            acciones={<button type="button" onClick={() => setInforme(false)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"><IconX size={16} />Cerrar</button>}
          />
        </div>
      )}
    </div>
  )
}
