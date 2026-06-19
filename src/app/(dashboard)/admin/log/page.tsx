"use client"

import { useEffect, useState } from "react"
import { TEAL } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"

interface LogEntry {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: string | null
  creadoEn: string
  usuario: { id: string; nombre: string; rol: string }
}

const ACCION_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  CREAR:    { icon: "+", color: "#16a34a", bg: "#f0fdf4" },
  EDITAR:   { icon: "~", color: "#2563eb", bg: "#eff6ff" },
  ELIMINAR: { icon: "x", color: "#dc2626", bg: "#fef2f2" },
}

const ENTIDAD_LABEL: Record<string, string> = {
  visita: "Visita",
  hospital: "Hospital",
  proyecto: "Proyecto",
  usuario: "Usuario",
  hardware: "Hardware",
  contacto: "Contacto",
}

function fmtFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function fechaRel(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "Ahora"
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const d = Math.floor(hrs / 24)
  if (d === 1) return "Ayer"
  if (d < 7) return `Hace ${d} días`
  return fmtFecha(iso)
}

function avatarColor(nombre: string) {
  const colors = ["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb"]
  let h = 0; for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

export default function LogActividadPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  useEffect(() => {
    setLoading(true)
    fetch(`/api/log-actividad?limit=${LIMIT}&offset=${offset}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLogs(data.logs)
          setTotal(data.total)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [offset])

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div>
      <PageHeader title="Log de actividad" subtitle={`${total} registros en total`} />

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="clipboard" title="Sin actividad registrada" description="Las acciones del sistema aparecerán aquí." />
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {logs.map(log => {
              const ai = ACCION_ICON[log.accion] ?? { icon: "?", color: "#6b7280", bg: "#f9fafb" }
              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: ai.bg, color: ai.color }}>
                    {ai.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">{log.usuario.nombre}</span>
                      {" "}
                      <span className="text-gray-500 dark:text-gray-400">
                        {log.accion === "CREAR" ? "creó" : log.accion === "EDITAR" ? "editó" : log.accion === "ELIMINAR" ? "eliminó" : log.accion.toLowerCase()}
                      </span>
                      {" "}
                      <span className="font-medium">{ENTIDAD_LABEL[log.entidad] ?? log.entidad}</span>
                      {log.detalle && <span className="text-gray-500 dark:text-gray-400"> — {log.detalle}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{fechaRel(log.creadoEn)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: avatarColor(log.usuario.rol) + "18", color: avatarColor(log.usuario.rol) }}>
                      {log.usuario.rol}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors">
              Anterior
            </button>
            <span className="text-xs text-gray-400">Página {currentPage} de {totalPages}</span>
            <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors"
              style={{ borderColor: offset + LIMIT < total ? TEAL : undefined, color: offset + LIMIT < total ? TEAL : undefined }}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
