"use client"

/**
 * Asistente de carga de exportaciones InLab.
 * 1) hospital + fichero → 2) formato y emparejamiento de columnas → 3) procesado en
 * el navegador (Web Worker) → 4) revisión, solapes y guardado de AGREGADOS.
 * Las filas crudas nunca salen del equipo del usuario.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useModalA11y } from "@/hooks/useModalA11y"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"
import {
  IconAlertTriangle, IconCheck, IconCheckCircle, IconFileText, IconLock, IconRefreshCw, IconX,
} from "@/components/ui/Icons"
import { DELIMITADORES, previsualizar, type Codificacion, type Delimitador, type Previsualizacion } from "@/lib/inlab/csv"
import { CAMPOS, autodetectarMapeo, combinarMapeo, validarMapeo, type CampoKey, type Mapeo } from "@/lib/inlab/mapping"
import type { OrdenFecha } from "@/lib/inlab/dates"
import { procesarFichero, ProcesoCancelado, type ProcessOptions, type ProcessResult } from "@/lib/inlab/process"
import type { WorkerIn, WorkerOut } from "@/lib/inlab/inlab.worker"
import { crearWorkerInlab } from "@/lib/inlab/crear-worker"
import { LIMITES, tamanoPayload } from "@/lib/inlab/types"
import { detectarExportacionSqlServer, nombreLote, procesarExportacionSqlServer, type ExportacionDetectada } from "@/lib/inlab/sqlserver"
import { MAPEO_PLANO } from "@/lib/inlab/mapping"
import { fmtDia, fmtN } from "@/components/inlab/charts"

export interface HospitalOpcion { id: string; nombre: string; ciudad: string }

type Paso = "fichero" | "columnas" | "procesando" | "revision" | "hecho"

interface CheckResult {
  duplicado: { id: string; fichero: string; creadoEn: string; usuario: { nombre: string } } | null
  diasSolapados: number
  rangosSolapados: { desde: string; hasta: string; n: number }[]
  diasNuevos: number
  cargasAfectadas: { id: string; fichero: string; creadoEn: string; desde: string; hasta: string; usuario: { nombre: string } }[]
}

const MB = (b: number) => (b / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " MB"
const PASOS: { key: Paso; label: string }[] = [
  { key: "fichero", label: "Fichero" }, { key: "columnas", label: "Columnas" }, { key: "procesando", label: "Procesado" }, { key: "revision", label: "Revisión" },
]

/** Montar solo cuando esté abierto: cada apertura empieza con estado limpio. */
export function UploadWizard({ onCerrar, hospitales, hospitalInicial, onCompletado }: {
  onCerrar: () => void
  hospitales: HospitalOpcion[]
  hospitalInicial?: string | null
  onCompletado: (hospitalId: string) => void
}) {
  const toast = useToast()
  const [paso, setPaso] = useState<Paso>("fichero")
  const [hospitalId, setHospitalId] = useState(hospitalInicial ?? "")
  const [busqueda, setBusqueda] = useState("")
  const [file, setFile] = useState<File | null>(null)
  /** Formato B: exportación completa de la BD (varios CSV dbo.*) */
  const [lote, setLote] = useState<{ files: File[]; det: ExportacionDetectada } | null>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Previsualizacion | null>(null)
  const [codificacion, setCodificacion] = useState<Codificacion>("utf-8")
  const [delimitador, setDelimitador] = useState<Delimitador>(";")
  const [ordenFecha, setOrdenFecha] = useState<OrdenFecha>("DMY")
  const [mapeo, setMapeo] = useState<Mapeo>({})
  const [autodetectados, setAutodetectados] = useState<Set<CampoKey>>(new Set())
  const [guardado, setGuardado] = useState<{ hospitalId: string; mapeo: Mapeo | null } | null>(null)
  const mapeoGuardado = guardado && guardado.hospitalId === hospitalId ? guardado.mapeo : null
  const previewRef = useRef<Previsualizacion | null>(null)
  useEffect(() => { previewRef.current = preview }, [preview])
  const [guardarMapeo, setGuardarMapeo] = useState(true)
  const [progreso, setProgreso] = useState({ bytes: 0, total: 1, filas: 0, inicio: 0 })
  const [resultado, setResultado] = useState<ProcessResult | null>(null)
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [modo, setModo] = useState<"NUEVA" | "SUSTITUIR" | "OMITIR">("NUEVA")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const cancelRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const cerrar = () => {
    if (paso === "procesando") cancelar()
    onCerrar()
  }
  const modalRef = useModalA11y(true, cerrar)

  useEffect(() => () => workerRef.current?.terminate(), [])

  // Mapeo guardado del hospital (se aplica también si llega después de la previsualización)
  useEffect(() => {
    if (!hospitalId) return
    let vivo = true
    fetch(`/api/inlab/mapeos/${hospitalId}`).then(r => (r.ok ? r.json() : null)).then(d => {
      if (!vivo) return
      const m: Mapeo | null = d?.mapeo ?? null
      setGuardado({ hospitalId, mapeo: m })
      if (d?.opciones?.ordenFecha) setOrdenFecha(d.opciones.ordenFecha)
      const pv = previewRef.current
      if (m && pv) setMapeo(prev => combinarMapeo(m, prev, pv.cabeceras))
    }).catch(() => {})
    return () => { vivo = false }
  }, [hospitalId])

  const hospitalesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return q ? hospitales.filter(h => `${h.nombre} ${h.ciudad}`.toLowerCase().includes(q)) : hospitales
  }, [hospitales, busqueda])

  /** Varios ficheros o una carpeta: si es la BD InLab completa se procesa como lote. */
  async function elegirFicheros(lista: FileList | File[] | null | undefined) {
    const files = Array.from(lista ?? []).filter(f => /\.(csv|txt|tsv)$/i.test(f.name))
    if (files.length === 0) { setError("No hay ficheros .csv en la selección."); return }
    if (files.length === 1) { setLote(null); return elegirFichero(files[0]) }
    const det = detectarExportacionSqlServer(files)
    if (!det) { setError("Has elegido varios ficheros, pero no parecen la exportación de la base de datos InLab (dbo.LabOrders.csv + dbo.LabOrder_Specimens.csv). Para un CSV único, elige solo ese fichero."); return }
    if (det.faltan.length) { setError(`Faltan tablas obligatorias de la exportación: ${det.faltan.join(", ")}.`); return }
    setError(null); setFile(null); setPreview(null)
    setLote({ files, det })
    setMapeo(MAPEO_PLANO)
  }

  async function elegirFichero(f: File | undefined | null) {
    if (!f) return
    setError(null)
    setLote(null)
    if (!/\.(csv|txt|tsv)$/i.test(f.name)) { setError("Formato no admitido. Usa una exportación .csv, .tsv o .txt."); return }
    if (f.size === 0) { setError("El fichero está vacío."); return }
    try {
      const p = await previsualizar(f)
      if (p.cabeceras.length < 2) { setError("No se detectan columnas. Revisa que el fichero sea un CSV con cabecera."); return }
      setFile(f); setPreview(p); setCodificacion(p.codificacion); setDelimitador(p.delimitador)
      const auto = autodetectarMapeo(p.cabeceras)
      setAutodetectados(new Set(Object.entries(auto).filter(([, v]) => v).map(([k]) => k as CampoKey)))
      setMapeo(combinarMapeo(mapeoGuardado, auto, p.cabeceras))
    } catch {
      setError("No se pudo leer el fichero.")
    }
  }

  async function reprevisualizar(opts: { codificacion?: Codificacion; delimitador?: Delimitador }) {
    if (!file) return
    const p = await previsualizar(file, { codificacion: opts.codificacion ?? codificacion, delimitador: opts.delimitador ?? delimitador })
    setPreview(p)
    if (opts.codificacion) setCodificacion(opts.codificacion)
    if (opts.delimitador) {
      setDelimitador(opts.delimitador)
      const auto = autodetectarMapeo(p.cabeceras)
      setAutodetectados(new Set(Object.entries(auto).filter(([, v]) => v).map(([k]) => k as CampoKey)))
      setMapeo(combinarMapeo(mapeoGuardado, auto, p.cabeceras))
    }
  }

  function cancelar() {
    cancelRef.current = true
    workerRef.current?.terminate()
    workerRef.current = null
  }

  async function procesar() {
    if (lote) return procesarLote()
    if (!file || !preview) return
    const err = validarMapeo(mapeo)
    if (err) { setError(err); return }
    setError(null); setPaso("procesando"); setResultado(null); setCheck(null)
    cancelRef.current = false
    setProgreso({ bytes: 0, total: file.size, filas: 0, inicio: Date.now() })
    const opts: ProcessOptions = { mapeo, delimitador, codificacion, ordenFecha }

    const terminar = (res: ProcessResult) => { setResultado(res); void comprobar(res) }
    const fallar = (msg: string) => { setError(msg); setPaso("columnas") }

    const worker = crearWorkerInlab()
    if (worker) {
      workerRef.current = worker
      worker.onmessage = (e: MessageEvent<WorkerOut>) => {
        const m = e.data
        if (m.type === "progreso") setProgreso(p => ({ ...p, bytes: m.bytes, total: m.total, filas: m.filas }))
        else if (m.type === "resultado") { worker?.terminate(); workerRef.current = null; terminar(m.result) }
        else if (m.type === "error") { worker?.terminate(); workerRef.current = null; fallar(m.message) }
      }
      worker.onerror = () => { worker?.terminate(); workerRef.current = null; void procesarEnHilo(opts, terminar, fallar) }
      worker.postMessage({ type: "procesar", file, opts } satisfies WorkerIn)
    } else {
      void procesarEnHilo(opts, terminar, fallar)
    }
  }

  /** Formato B: la BD completa se cruza y agrega en el Worker (o en el hilo principal como respaldo). */
  function procesarLote() {
    if (!lote) return
    setError(null); setPaso("procesando"); setResultado(null); setCheck(null)
    cancelRef.current = false
    setProgreso({ bytes: 0, total: lote.det.bytes, filas: 0, inicio: Date.now() })
    const terminar = (res: ProcessResult) => { setResultado(res); void comprobar(res) }
    const fallar = (msg: string) => { setError(msg); setPaso("fichero") }
    const enHilo = async () => {
      try {
        terminar(await procesarExportacionSqlServer(lote.files, ordenFecha, pr => setProgreso(prev => ({ ...prev, ...pr })), () => cancelRef.current))
      } catch (e) {
        if (e instanceof ProcesoCancelado) return
        fallar(e instanceof Error ? e.message : "Error procesando la exportación")
      }
    }
    const worker = crearWorkerInlab()
    if (!worker) { void enHilo(); return }
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      if (m.type === "progreso") setProgreso(pr => ({ ...pr, bytes: m.bytes, total: m.total, filas: m.filas }))
      else if (m.type === "resultado") { worker.terminate(); workerRef.current = null; terminar(m.result) }
      else if (m.type === "error") { worker.terminate(); workerRef.current = null; fallar(m.message) }
    }
    worker.onerror = () => { worker.terminate(); workerRef.current = null; void enHilo() }
    worker.postMessage({ type: "procesar-bd", files: lote.det ? Object.values(lote.det.ficheros).filter((f): f is File => !!f) : lote.files, ordenFecha } satisfies WorkerIn)
  }

  /** Respaldo sin Worker: mismo código en el hilo principal, cediendo el control entre trozos. */
  async function procesarEnHilo(opts: ProcessOptions, ok: (r: ProcessResult) => void, ko: (m: string) => void) {
    if (!file) return
    try {
      const res = await procesarFichero(file, opts, p => setProgreso(prev => ({ ...prev, ...p })), () => cancelRef.current)
      ok(res)
    } catch (e) {
      if (e instanceof ProcesoCancelado) return
      ko(e instanceof Error ? e.message : "Error procesando el fichero")
    }
  }

  async function comprobar(res: ProcessResult) {
    setPaso("revision")
    if (res.payload.dias.length === 0) return
    try {
      const r = await fetch("/api/inlab/cargas/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, hash: res.hash, dias: res.payload.dias }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d?.error ?? "No se pudo comprobar la carga"); return }
      setCheck(d)
      setModo(d.diasSolapados > 0 ? "SUSTITUIR" : "NUEVA")
    } catch {
      setError("No se pudo comprobar la carga (sin conexión)")
    }
  }

  const cuerpo = useMemo(() => {
    if (!resultado || (!file && !lote)) return null
    const nombre = lote ? nombreLote(lote.det) : file!.name
    const tamanoTotal = lote ? lote.det.bytes : file!.size
    return JSON.stringify({
      hospitalId, modo, mapeo, guardarMapeo,
      opciones: { delimitador, codificacion, ordenFecha },
      meta: {
        fichero: nombre.slice(0, 255), tamanoBytes: tamanoTotal, hash: resultado.hash,
        filas: resultado.stats.filas, filasValidas: resultado.stats.filasValidas, filasDescartadas: resultado.stats.filasDescartadas,
        avisos: resultado.stats.avisos.slice(0, 50).map(a => a.slice(0, 400)),
      },
      payload: resultado.payload,
    })
  }, [resultado, file, lote, hospitalId, modo, mapeo, guardarMapeo, delimitador, codificacion, ordenFecha])

  async function guardar() {
    if (!cuerpo) return
    setGuardando(true); setError(null)
    try {
      const r = await fetch("/api/inlab/cargas", { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d?.error ?? "No se pudo guardar la carga"); return }
      toast.success(`Carga guardada: ${fmtN(d.dias)} días${d.diasSustituidos ? ` (${d.diasSustituidos} sustituidos)` : ""}${d.diasOmitidos ? ` (${d.diasOmitidos} omitidos)` : ""}`)
      setPaso("hecho")
      onCompletado(hospitalId)
    } catch {
      setError("Error de red al guardar")
    } finally {
      setGuardando(false)
    }
  }

  const pct = Math.min(100, (progreso.bytes / Math.max(1, progreso.total)) * 100)
  const seg = Math.max(0.1, (Date.now() - progreso.inicio) / 1000)
  const idxPaso = PASOS.findIndex(p => p.key === paso)
  const bloqueante = resultado?.stats.dimensionesExcedidas.length ? "Hay columnas con demasiados valores distintos (posible texto libre o datos personales). Corrige el emparejamiento antes de guardar." : resultado && resultado.payload.dias.length === 0 ? "Ninguna fila tiene una fecha válida: revisa las columnas de fecha y el orden día/mes." : null
  const tamano = cuerpo?.length ?? 0
  const demasiadoGrande = tamano > LIMITES.maxBodyBytes
  const hospital = hospitales.find(h => h.id === hospitalId)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget && paso !== "procesando") cerrar() }}>
      <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inlab-wizard-titulo" className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none dark:bg-slate-900 sm:rounded-3xl" style={{ borderTop: `3px solid ${TEAL}` }}>
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <p className="kpi-label flex items-center gap-2 text-teal-700 dark:text-teal-400"><span className="section-title-mark" />Inteligencia InLab</p>
            <h2 id="inlab-wizard-titulo" className="mt-1 text-lg font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">Cargar exportación InLab</h2>
            <ol className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Pasos">
              {PASOS.map((p, i) => (
                <li key={p.key} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${i < idxPaso || paso === "hecho" ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300" : i === idxPaso ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`} aria-current={i === idxPaso ? "step" : undefined}>
                  {i < idxPaso || paso === "hecho" ? <IconCheck size={11} /> : <span>{i + 1}</span>}{p.label}
                </li>
              ))}
            </ol>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"><IconX size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-[11px] leading-5 text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200">
            <IconLock size={14} className="mt-0.5 shrink-0" />El fichero se procesa en tu navegador. Solo se envían totales diarios agregados; ninguna fila individual ni dato de paciente sale de tu equipo.
          </p>
          {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><IconAlertTriangle size={15} className="mt-0.5 shrink-0" />{error}</p>}

          {paso === "fichero" && (
            <div className="grid gap-5 md:grid-cols-[.9fr_1.1fr]">
              <div>
                <label htmlFor="inlab-hosp-buscar" className="kpi-label text-gray-500">1 · Hospital</label>
                <input id="inlab-hosp-buscar" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar hospital…" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800" role="listbox" aria-label="Hospitales">
                  {hospitalesFiltrados.length === 0 && <p className="p-4 text-center text-xs text-gray-400">Sin hospitales accesibles</p>}
                  {hospitalesFiltrados.map(h => (
                    <button key={h.id} type="button" role="option" aria-selected={hospitalId === h.id} onClick={() => setHospitalId(h.id)} className={`flex min-h-[44px] w-full items-center justify-between gap-2 border-b border-slate-50 px-3 py-2 text-left text-sm last:border-0 dark:border-slate-800 ${hospitalId === h.id ? "bg-teal-50 font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200" : "text-gray-700 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-slate-800"}`}>
                      <span className="min-w-0 truncate">{h.nombre}<span className="ml-1.5 text-xs font-normal text-gray-400">{h.ciudad}</span></span>
                      {hospitalId === h.id && <IconCheck size={15} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="kpi-label text-gray-500">2 · Fichero de exportación</p>
                <div
                  onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={e => { e.preventDefault(); setArrastrando(false); void elegirFicheros(e.dataTransfer.files) }}
                  className={`mt-2 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${arrastrando ? "border-teal-400 bg-teal-50/60 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700"}`}
                >
                  <span className="kpi-icon-tile flex h-12 w-12 items-center justify-center rounded-2xl text-white"><IconFileText size={22} /></span>
                  {lote ? (
                    <>
                      <p className="mt-3 text-sm font-extrabold text-gray-900 dark:text-white">Base de datos InLab completa</p>
                      <p className="mt-1 text-xs text-gray-400">{Object.keys(lote.det.ficheros).length} tablas útiles · {MB(lote.det.bytes)} a procesar</p>
                      <ul className="mt-2 flex max-w-sm flex-wrap justify-center gap-1">
                        {Object.values(lote.det.ficheros).map(f => f && <li key={f.name} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">{f.name.replace(/^dbo\./i, "").replace(/\.csv$/i, "")}</li>)}
                      </ul>
                      {lote.det.ignoradas.length > 0 && <p className="mt-2 max-w-sm text-[10px] leading-4 text-gray-400"><IconLock size={10} className="mr-1 inline" />No se abren: {lote.det.ignoradas.join(", ")} (datos personales)</p>}
                    </>
                  ) : file ? (
                    <>
                      <p className="mt-3 max-w-full truncate text-sm font-extrabold text-gray-900 dark:text-white">{file.name}</p>
                      <p className="mt-1 text-xs text-gray-400">{MB(file.size)} · {preview?.cabeceras.length} columnas · {preview?.codificacion === "utf-8" ? "UTF-8" : "Latin-1"}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-sm font-extrabold text-gray-800 dark:text-white">Arrastra aquí el CSV o la carpeta de InLab</p>
                      <p className="mt-1 max-w-sm text-xs text-gray-400">CSV de la consulta de exportación, o la base de datos completa (dbo.*.csv). Se procesa en tu equipo, aunque ocupe varios GB.</p>
                    </>
                  )}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800">{file || lote ? "Cambiar ficheros" : "Elegir fichero(s)"}</button>
                    <button type="button" onClick={() => folderRef.current?.click()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800">Elegir carpeta (BD completa)</button>
                  </div>
                  <input ref={inputRef} type="file" multiple accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={e => { void elegirFicheros(e.target.files); e.target.value = "" }} />
                  <input ref={folderRef} type="file" multiple className="hidden" {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={e => { void elegirFicheros(e.target.files); e.target.value = "" }} />
                </div>
              </div>
            </div>
          )}

          {paso === "columnas" && preview && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-bold text-gray-600 dark:text-slate-300">Separador
                  <select value={delimitador} onChange={e => void reprevisualizar({ delimitador: e.target.value as Delimitador })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {DELIMITADORES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-gray-600 dark:text-slate-300">Codificación
                  <select value={codificacion} onChange={e => void reprevisualizar({ codificacion: e.target.value as Codificacion })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="utf-8">UTF-8</option><option value="windows-1252">Latin-1 / Windows-1252</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-gray-600 dark:text-slate-300">Fechas ambiguas (01/02)
                  <select value={ordenFecha} onChange={e => setOrdenFecha(e.target.value as OrdenFecha)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="DMY">Día/mes/año (España)</option><option value="MDY">Mes/día/año</option>
                  </select>
                </label>
              </div>

              <div>
                <p className="kpi-label mb-2 text-gray-500">Previsualización · primeras {preview.filas.length} filas</p>
                <div className="max-h-56 overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                      <tr>{preview.cabeceras.map(h => {
                        const campo = CAMPOS.find(c => mapeo[c.key] === h)
                        return <th key={h} scope="col" className="whitespace-nowrap px-2.5 py-2 text-left font-extrabold text-gray-600 dark:text-slate-200">{h}{campo && <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">{campo.label}</span>}</th>
                      })}</tr>
                    </thead>
                    <tbody>
                      {preview.filas.map((f, i) => <tr key={i} className="border-t border-slate-50 dark:border-slate-800">{preview.cabeceras.map((h, j) => <td key={h} className="max-w-[180px] truncate whitespace-nowrap px-2.5 py-1.5 text-gray-500 dark:text-slate-400">{f[j] ?? ""}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="kpi-label text-gray-500">Emparejar columnas con los campos de InLab</p>
                  <button type="button" onClick={() => { const a = autodetectarMapeo(preview.cabeceras); setMapeo(a); setAutodetectados(new Set(Object.entries(a).filter(([, v]) => v).map(([k]) => k as CampoKey))) }} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-300"><IconRefreshCw size={12} />Volver a autodetectar</button>
                </div>
                {(["Hitos", "Dónde", "Qué", "Calidad"] as const).map(grupo => (
                  <fieldset key={grupo} className="mb-3">
                    <legend className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-gray-400">{grupo}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CAMPOS.filter(c => c.grupo === grupo).map(c => {
                        const col = mapeo[c.key] ?? ""
                        const j = preview.cabeceras.indexOf(col)
                        const ejemplo = j >= 0 ? preview.filas.map(f => f[j]).find(v => v && v.trim()) : undefined
                        const id = `inlab-map-${c.key}`
                        return (
                          <div key={c.key} className={`rounded-xl border p-2.5 ${col ? "border-teal-200 bg-teal-50/40 dark:border-teal-900/60 dark:bg-teal-950/15" : "border-slate-100 dark:border-slate-800"}`}>
                            <label htmlFor={id} className="flex items-center justify-between gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
                              <span>{c.label}</span>
                              {col && autodetectados.has(c.key) && mapeoGuardado?.[c.key] !== col && <span className="text-[9px] font-extrabold uppercase tracking-wide text-teal-600">auto</span>}
                              {col && mapeoGuardado?.[c.key] === col && <span className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-600">guardado</span>}
                            </label>
                            <select id={id} value={col} onChange={e => setMapeo(m => ({ ...m, [c.key]: e.target.value || null }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                              <option value="">— No disponible —</option>
                              {preview.cabeceras.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <p className="mt-1 truncate text-[10px] text-gray-400">{ejemplo ? <>Ej.: <span className="font-mono">{ejemplo.slice(0, 40)}</span></> : c.ayuda}</p>
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                  <input type="checkbox" checked={guardarMapeo} onChange={e => setGuardarMapeo(e.target.checked)} className="h-4 w-4 accent-teal-600" />
                  Guardar este emparejamiento para próximas cargas de {hospital?.nombre ?? "este hospital"}
                </label>
              </div>
            </div>
          )}

          {paso === "procesando" && (
            <div className="py-8 text-center">
              <p className="text-sm font-extrabold text-gray-900 dark:text-white">Procesando {lote ? "la base de datos InLab" : file?.name}</p>
              <p className="mt-1 text-xs text-gray-400">Leyendo por trozos y agregando en segundo plano. Puedes seguir usando la página.</p>
              <div className="mx-auto mt-6 max-w-lg">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${TEAL}, #13d1c3)` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] tabular-nums text-gray-500 dark:text-slate-400">
                  <span>{MB(progreso.bytes)} de {MB(progreso.total)}</span>
                  <span>{fmtN(progreso.filas)} filas · {fmtN(progreso.bytes / 1024 / 1024 / seg, 1)} MB/s</span>
                  <span className="font-bold">{fmtN(pct)} %</span>
                </div>
              </div>
            </div>
          )}

          {paso === "revision" && resultado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Filas leídas", fmtN(resultado.stats.filas)],
                  ["Filas válidas", fmtN(resultado.stats.filasValidas)],
                  ["Descartadas", fmtN(resultado.stats.filasDescartadas)],
                  ["Días", fmtN(resultado.payload.dias.length)],
                ].map(([l, v]) => <div key={l} className="stat-card p-3.5"><p className="kpi-label text-gray-500">{l}</p><p className="mt-1.5 text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{v}</p></div>)}
              </div>
              {resultado.stats.desde && resultado.stats.hasta && (
                <p className="text-xs text-gray-500 dark:text-slate-300">Periodo: <strong className="text-gray-800 dark:text-white">{fmtDia(resultado.stats.desde, { day: "2-digit", month: "short", year: "numeric" })} — {fmtDia(resultado.stats.hasta, { day: "2-digit", month: "short", year: "numeric" })}</strong> · {fmtN(tamanoPayload(resultado.payload))} filas agregadas ({MB(tamano)}) para {hospital?.nombre}</p>
              )}
              {resultado.stats.avisos.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
                  {resultado.stats.avisos.map(a => <li key={a}>• {a}</li>)}
                </ul>
              )}
              {bloqueante && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{bloqueante}</p>}
              {demasiadoGrande && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Los agregados ocupan {MB(tamano)} (máx. {MB(LIMITES.maxBodyBytes)}). Divide la exportación en periodos más cortos.</p>}

              {!bloqueante && !check && <p className="text-xs text-gray-400">Comprobando solapes con cargas anteriores…</p>}
              {check?.duplicado && (
                <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                  <IconAlertTriangle size={15} className="mt-0.5 shrink-0" />Este mismo fichero ya se cargó el {new Date(check.duplicado.creadoEn).toLocaleDateString("es-ES")} por {check.duplicado.usuario.nombre} («{check.duplicado.fichero}»).
                </p>
              )}
              {check && check.diasSolapados > 0 && (
                <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <legend className="px-1 text-xs font-extrabold text-gray-800 dark:text-white">{fmtN(check.diasSolapados)} días ya tenían datos</legend>
                  <p className="mb-3 text-[11px] leading-5 text-gray-500 dark:text-slate-400">
                    {check.rangosSolapados.map(r => r.desde === r.hasta ? fmtDia(r.desde) : `${fmtDia(r.desde)}–${fmtDia(r.hasta)}`).join(", ")}{check.cargasAfectadas.length ? ` · de: ${check.cargasAfectadas.map(c => c.fichero).slice(0, 3).join(", ")}` : ""}
                  </p>
                  <div className="space-y-2">
                    {([
                      ["SUSTITUIR", "Sustituir esos días", "Se borran los agregados existentes de esos días y se guardan los de este fichero."],
                      ["OMITIR", "Añadir solo los días nuevos", `Se conservan los datos existentes; se añaden ${fmtN(check.diasNuevos)} días nuevos.`],
                    ] as const).map(([v, t, d]) => (
                      <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${modo === v ? "border-teal-300 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20" : "border-slate-100 dark:border-slate-800"} ${v === "OMITIR" && check.diasNuevos === 0 ? "pointer-events-none opacity-40" : ""}`}>
                        <input type="radio" name="inlab-modo" value={v} checked={modo === v} onChange={() => setModo(v)} disabled={v === "OMITIR" && check.diasNuevos === 0} className="mt-0.5 accent-teal-600" />
                        <span><span className="block text-xs font-extrabold text-gray-800 dark:text-white">{t}</span><span className="text-[11px] text-gray-500 dark:text-slate-400">{d}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {check && check.diasSolapados === 0 && !check.duplicado && <p className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300"><IconCheckCircle size={15} />Sin solapes: todos los días son nuevos.</p>}
            </div>
          )}

          {paso === "hecho" && (
            <div className="py-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><IconCheckCircle size={28} /></span>
              <p className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">Carga completada</p>
              <p className="mt-1 text-xs text-gray-400">El dashboard ya muestra los datos de {hospital?.nombre}.</p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            {paso === "columnas" && <button type="button" onClick={() => setPaso("fichero")} className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800">Atrás</button>}
            {paso === "revision" && !lote && <button type="button" onClick={() => setPaso("columnas")} className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800">Cambiar columnas</button>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {paso !== "hecho" && paso !== "procesando" && <button type="button" onClick={cerrar} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Cancelar</button>}
            {paso === "procesando" && <button type="button" onClick={() => { cancelar(); setPaso(lote ? "fichero" : "columnas") }} className="min-h-[44px] rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30">Cancelar procesado</button>}
            {paso === "fichero" && <button type="button" disabled={!hospitalId || (!file && !lote)} onClick={() => (lote ? procesarLote() : setPaso("columnas"))} className="btn-teal min-h-[44px] rounded-xl px-5 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: TEAL }}>{!hospitalId ? "Elige un hospital" : !file && !lote ? "Elige un fichero" : lote ? "Procesar base de datos" : "Continuar"}</button>}
            {paso === "columnas" && <button type="button" onClick={() => void procesar()} className="btn-teal min-h-[44px] rounded-xl px-5 text-sm font-bold text-white" style={{ backgroundColor: TEAL }}>Procesar fichero</button>}
            {paso === "revision" && <button type="button" disabled={!!bloqueante || demasiadoGrande || !check || guardando} onClick={() => void guardar()} className="btn-teal min-h-[44px] rounded-xl px-5 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: TEAL }}>{guardando ? "Guardando…" : modo === "SUSTITUIR" ? "Sustituir y guardar" : "Guardar agregados"}</button>}
            {paso === "hecho" && <button type="button" onClick={onCerrar} className="btn-teal min-h-[44px] rounded-xl px-5 text-sm font-bold text-white" style={{ backgroundColor: TEAL }}>Ver dashboard</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
