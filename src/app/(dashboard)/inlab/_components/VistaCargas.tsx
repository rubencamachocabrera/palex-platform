"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"
import { IconAlertTriangle, IconCalendar, IconFileText, IconTrash } from "@/components/ui/Icons"
import { Skeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { CalendarioCobertura, fmtDia, fmtN } from "@/components/inlab/charts"
import { Panel, Nota } from "@/components/inlab/ui"
import { huecos } from "@/lib/inlab/analytics"
import { rangosContiguos } from "@/lib/inlab/dates"

interface Carga {
  id: string; hospitalId: string; fichero: string; tamanoBytes: number; desde: string; hasta: string; filas: number
  filasValidas: number; filasDescartadas: number; dias: number; diasSustituidos: number; diasOmitidos: number
  modo: string; estado: string; avisos: string[] | null; creadoEn: string; usuario: { nombre: string }; hospital: { nombre: string }; puedeBorrar: boolean
}

const fetcherCargas = ([url]: [string, number]): Promise<Carga[]> =>
  fetch(url).then(r => (r.ok ? r.json() : [])).then(d => (Array.isArray(d) ? d : [])).catch(() => [])

const ESTADO:Record<string, { label: string; cls: string }> = {
  COMPLETADA: { label: "Activa", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  PARCIAL: { label: "Parcialmente sustituida", cls: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" },
  SUSTITUIDA: { label: "Sustituida", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
}

export function VistaCargas({ hospitalIds, cobertura, diasConDatos, version, onCambio }: {
  hospitalIds: string[]
  cobertura: { desde: string; hasta: string } | null
  diasConDatos: string[]
  version: number
  onCambio: () => void
}) {
  const toast = useToast()
  const [abierta, setAbierta] = useState<string | null>(null)
  // SWR (clave con `version`): volver a la pestaña no repite la petición; tras cargar/borrar sí
  const { data } = useSWR(hospitalIds.length ? [`/api/inlab/cargas?hospitalIds=${hospitalIds.join(",")}`, version] : null, fetcherCargas, { revalidateOnFocus: false, revalidateIfStale: false })
  const cargas = data ?? null

  const sinDatos = useMemo(() => (cobertura ? huecos(diasConDatos, cobertura) : []), [cobertura, diasConDatos])
  const rangosHueco = useMemo(() => rangosContiguos(sinDatos), [sinDatos])
  const setDias = useMemo(() => new Set(diasConDatos), [diasConDatos])

  async function borrar(c: Carga) {
    if (!confirm(`¿Eliminar la carga «${c.fichero}» y sus ${c.dias} días de agregados? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/inlab/cargas/${c.id}`, { method: "DELETE" })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { toast.error(d?.error ?? "No se pudo eliminar"); return }
    toast.success("Carga eliminada")
    onCambio()
  }

  return (
    <div className="space-y-5">
      {cobertura && (
        <Panel eyebrow="Cobertura" titulo="Días con datos" texto={`Del ${fmtDia(cobertura.desde, { day: "2-digit", month: "short", year: "numeric" })} al ${fmtDia(cobertura.hasta, { day: "2-digit", month: "short", year: "numeric" })} (fecha de referencia de cada fila). Los recuadros naranjas son huecos sin datos cargados${hospitalIds.length > 1 ? " en ninguno de los hospitales seleccionados" : ""}.`}>
          <CalendarioCobertura dias={setDias} desde={cobertura.desde} hasta={cobertura.hasta} />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="stat-card p-3.5"><p className="kpi-label text-gray-500">Días con datos</p><p className="mt-1.5 text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtN(diasConDatos.length)}</p></div>
            <div className="stat-card p-3.5"><p className="kpi-label text-gray-500">Huecos</p><p className="mt-1.5 text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtN(sinDatos.length)} <span className="text-xs font-semibold text-gray-400">días</span></p></div>
            <div className="stat-card p-3.5"><p className="kpi-label text-gray-500">Cargas</p><p className="mt-1.5 text-xl font-extrabold tabular-nums text-gray-900 dark:text-white">{cargas ? fmtN(cargas.length) : "…"}</p></div>
          </div>
          {rangosHueco.length > 0 && (
            <div className="mt-3"><Nota tono="aviso">Huecos: {rangosHueco.slice(0, 12).map(r => (r.n === 1 ? fmtDia(r.desde) : `${fmtDia(r.desde)}–${fmtDia(r.hasta)} (${r.n} d)`)).join(" · ")}{rangosHueco.length > 12 ? " …" : ""}. Pueden ser días sin actividad real (festivos) o periodos sin exportar.</Nota></div>
          )}
        </Panel>
      )}

      <Panel eyebrow="Histórico" titulo="Ficheros cargados" texto="Cada carga acumula histórico. Si un fichero solapa días ya cargados, el asistente permite sustituirlos u omitirlos.">
        {cargas === null && <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
        {cargas?.length === 0 && <EmptyState icon="document" title="Sin cargas" description="Usa el botón + para cargar la primera exportación." />}
        <div className="space-y-2">
          {cargas?.map(c => {
            const est = ESTADO[c.estado] ?? ESTADO.COMPLETADA
            return (
              <article key={c.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setAbierta(a => (a === c.id ? null : c.id))} aria-expanded={abierta === c.id} className="flex min-w-0 items-start gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color: TEAL, background: `${TEAL}16` }}><IconFileText size={17} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-800 dark:text-white">{c.fichero}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1"><IconCalendar size={11} />{fmtDia(c.desde)} – {fmtDia(c.hasta, { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span>{fmtN(c.dias)} días · {fmtN(c.filas)} filas</span>
                        {hospitalIds.length > 1 && <span>{c.hospital.nombre}</span>}
                        <span>{c.usuario.nombre} · {new Date(c.creadoEn).toLocaleDateString("es-ES")}</span>
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${est.cls}`}>{est.label}</span>
                    {c.modo !== "NUEVA" && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{c.modo === "SUSTITUIR" ? `${c.diasSustituidos} sustituidos` : `${c.diasOmitidos} omitidos`}</span>}
                    {c.puedeBorrar && <button type="button" onClick={() => void borrar(c)} aria-label={`Eliminar carga ${c.fichero}`} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><IconTrash size={15} /></button>}
                  </div>
                </div>
                {abierta === c.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-gray-500 dark:border-slate-700 dark:text-slate-300">
                    <p>{fmtN(c.filasValidas)} filas válidas · {fmtN(c.filasDescartadas)} descartadas · {(c.tamanoBytes / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB</p>
                    {c.avisos && c.avisos.length > 0 && <ul className="mt-2 space-y-1">{c.avisos.map(a => <li key={a} className="flex gap-1.5"><IconAlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" />{a}</li>)}</ul>}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
