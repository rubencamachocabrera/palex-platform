"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { Skeleton } from "@/components/ui/Skeleton"

interface Evento {
  id: string
  tipo: string
  descripcion: string
  duracion: number | null
  privado: boolean
  metadatos: unknown
  creadoEn: string
  autor: { id: string; nombre: string }
}

interface Incidencia {
  id: string; codigo: string; titulo: string; descripcion: string
  tipo: "HARDWARE" | "SOFTWARE"; categoria: string
  prioridad: string; estado: string; equipoResponsable: string
  slaHoras: number | null; resolucion: string | null
  creadoEn: string; actualizadoEn: string
  fechaResolucion: string | null; fechaCierre: string | null
  hospital: { id: string; nombre: string; ciudad: string; provincia: string | null }
  contacto: { id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null } | null
  reportadoPor: { id: string; nombre: string }
  asignadoA: { id: string; nombre: string } | null
  hardwareUnidad: { id: string; numSerie: string | null; estado: string; catalogo: { id: string; marca: string; modelo: string; referenciaPalex: string | null } } | null
  eventos: Evento[]
}

const ESTADOS = [
  { value: "ABIERTA", label: "Abierta", color: "#ef4444", bg: "#fef2f2" },
  { value: "EN_PROGRESO", label: "En progreso", color: "#f59e0b", bg: "#fffbeb" },
  { value: "PENDIENTE_CLIENTE", label: "Pendiente cliente", color: "#8b5cf6", bg: "#f5f3ff" },
  { value: "PENDIENTE_PROVEEDOR", label: "Pendiente proveedor", color: "#6366f1", bg: "#eef2ff" },
  { value: "RESUELTA", label: "Resuelta", color: "#10b981", bg: "#ecfdf5" },
  { value: "CERRADA", label: "Cerrada", color: "#6b7280", bg: "#f3f4f6" },
]

const PRIORIDADES: Record<string, { label: string; color: string; bg: string }> = {
  CRITICA: { label: "Crítica", color: "#dc2626", bg: "#fef2f2" },
  ALTA: { label: "Alta", color: "#f97316", bg: "#fff7ed" },
  MEDIA: { label: "Media", color: "#f59e0b", bg: "#fffbeb" },
  BAJA: { label: "Baja", color: TEAL, bg: TEAL_LIGHT },
}

const CATEGORIAS: Record<string, string> = {
  BC_ROBO: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_IMPRESORA: "Zebra Impresora",
  READER_RFID: "Reader RFID", GATEWAY_BT: "Gateway BT", MINI_PC: "Mini-PC",
  NEVERA: "Nevera", PANTALLA: "Pantalla", INLAB: "InLab", OTRO: "Otro",
}

const EQUIPOS: Record<string, string> = {
  SERVICIO_TECNICO: "Servicio Técnico", APLICACIONES: "Aplicaciones", AMBOS: "Ambos",
}

const TIPOS_EVENTO = [
  { value: "NOTA", label: "Nota interna", icon: "📝", color: "#6b7280" },
  { value: "LLAMADA_ENTRANTE", label: "Llamada entrante", icon: "📞", color: "#10b981" },
  { value: "LLAMADA_SALIENTE", label: "Llamada saliente", icon: "📱", color: "#3b82f6" },
  { value: "EMAIL_ENVIADO", label: "Email enviado", icon: "📤", color: "#8b5cf6" },
  { value: "EMAIL_RECIBIDO", label: "Email recibido", icon: "📥", color: "#6366f1" },
  { value: "ESCALADO", label: "Escalado", icon: "⚡", color: "#ef4444" },
  { value: "RESPUESTA_TECNICA", label: "Resp. técnica", icon: "🔧", color: TEAL },
  { value: "RESPUESTA_APLICACIONES", label: "Resp. aplicaciones", icon: "💻", color: "#0ea5e9" },
  { value: "COMUNICACION_CLIENTE", label: "Com. cliente", icon: "🏥", color: ORANGE },
  { value: "CAMBIO_ESTADO", label: "Cambio estado", icon: "🔄", color: "#9ca3af" },
  { value: "CAMBIO_ASIGNACION", label: "Cambio asignación", icon: "👤", color: "#9ca3af" },
]

function getEstadoStyle(estado: string) {
  return ESTADOS.find(e => e.value === estado) ?? { label: estado, color: "#6b7280", bg: "#f3f4f6" }
}

function getEventoInfo(tipo: string) {
  return TIPOS_EVENTO.find(t => t.value === tipo) ?? { label: tipo, icon: "📋", color: "#6b7280" }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function slaInfo(creadoEn: string, slaHoras: number | null, estado: string) {
  if (["RESUELTA", "CERRADA"].includes(estado)) return { label: "Cumplido", color: "#10b981", pct: 0 }
  if (!slaHoras) return { label: "Sin SLA", color: "#9ca3af", pct: 0 }
  const elapsed = (Date.now() - new Date(creadoEn).getTime()) / 3600000
  const remaining = Math.max(0, slaHoras - elapsed)
  const pct = Math.min(100, (elapsed / slaHoras) * 100)
  if (remaining <= 0) return { label: `Vencido hace ${Math.round(elapsed - slaHoras)}h`, color: "#ef4444", pct: 100 }
  if (pct > 75) return { label: `${Math.round(remaining)}h restantes`, color: "#f59e0b", pct }
  return { label: `${Math.round(remaining)}h restantes`, color: "#10b981", pct }
}

export default function IncidenciaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { perfil, rol } = usePerfil()
  const id = params.id as string

  const [inc, setInc] = useState<Incidencia | null>(null)
  const [loading, setLoading] = useState(true)

  // Event form
  const [eventoTipo, setEventoTipo] = useState("NOTA")
  const [eventoDesc, setEventoDesc] = useState("")
  const [eventoDuracion, setEventoDuracion] = useState("")
  const [enviandoEvento, setEnviandoEvento] = useState(false)

  // Status/resolution
  const [editandoResolucion, setEditandoResolucion] = useState(false)
  const [resolucionText, setResolucionText] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchInc = useCallback(async () => {
    const r = await fetch(`/api/incidencias/${id}`)
    if (r.ok) {
      const data = await r.json()
      setInc(data)
      setResolucionText(data.resolucion ?? "")
    } else {
      toastError("Incidencia no encontrada")
      router.push("/incidencias")
    }
    setLoading(false)
  }, [id, router, toastError])

  useEffect(() => { fetchInc() }, [fetchInc])

  async function cambiarEstado(nuevoEstado: string) {
    setSaving(true)
    const body: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === "RESUELTA" && resolucionText.trim()) {
      body.resolucion = resolucionText.trim()
    }
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      success("Estado actualizado")
      fetchInc()
    } else {
      toastError("Error al actualizar")
    }
    setSaving(false)
  }

  async function guardarResolucion() {
    setSaving(true)
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolucion: resolucionText.trim() }),
    })
    if (r.ok) {
      success("Resolución guardada")
      setEditandoResolucion(false)
      fetchInc()
    } else {
      toastError("Error al guardar")
    }
    setSaving(false)
  }

  async function enviarEvento() {
    if (!eventoDesc.trim()) { toastError("Escribe una descripción"); return }
    setEnviandoEvento(true)
    const body: Record<string, unknown> = {
      tipo: eventoTipo,
      descripcion: eventoDesc.trim(),
    }
    if (eventoDuracion) body.duracion = parseInt(eventoDuracion)

    const r = await fetch(`/api/incidencias/${id}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setEventoDesc("")
      setEventoDuracion("")
      setEventoTipo("NOTA")
      success("Evento registrado")
      fetchInc()
    } else {
      toastError("Error al registrar evento")
    }
    setEnviandoEvento(false)
  }

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
  if (!inc) return null

  const est = getEstadoStyle(inc.estado)
  const pri = PRIORIDADES[inc.prioridad] ?? { label: inc.prioridad, color: "#6b7280", bg: "#f3f4f6" }
  const sla = slaInfo(inc.creadoEn, inc.slaHoras, inc.estado)
  const isOpen = !["RESUELTA", "CERRADA"].includes(inc.estado)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.push("/incidencias")} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="text-sm font-mono font-bold text-gray-400">{inc.codigo}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: est.bg, color: est.color }}>{est.label}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{inc.titulo}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-6">{inc.descripcion}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Actions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Details card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detalles</h3>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Hospital</span>
              <Link href={`/hospitales/${inc.hospital.id}`} className="font-medium hover:underline" style={{ color: TEAL }}>{inc.hospital.nombre}</Link>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tipo</span>
              <span className="font-medium text-gray-900 dark:text-white">{inc.tipo === "HARDWARE" ? "Hardware" : "Software"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Categoría</span>
              <span className="font-medium text-gray-900 dark:text-white">{CATEGORIAS[inc.categoria] ?? inc.categoria}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Equipo</span>
              <span className="font-medium text-gray-900 dark:text-white">{EQUIPOS[inc.equipoResponsable]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reportada por</span>
              <span className="font-medium text-gray-900 dark:text-white">{inc.reportadoPor.nombre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Asignada a</span>
              <span className="font-medium text-gray-900 dark:text-white">{inc.asignadoA?.nombre ?? "Sin asignar"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Creada</span>
              <span className="text-gray-700 dark:text-gray-300">{formatDate(inc.creadoEn)}</span>
            </div>
            {inc.fechaResolucion && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Resuelta</span>
                <span className="text-gray-700 dark:text-gray-300">{formatDate(inc.fechaResolucion)}</span>
              </div>
            )}

            {/* Contact */}
            {inc.contacto && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contacto</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{inc.contacto.nombre}</p>
                {inc.contacto.cargo && <p className="text-xs text-gray-500">{inc.contacto.cargo}</p>}
                {inc.contacto.email && <p className="text-xs text-gray-500">{inc.contacto.email}</p>}
                {inc.contacto.telefono && <p className="text-xs text-gray-500">{inc.contacto.telefono}</p>}
              </div>
            )}

            {/* Hardware */}
            {inc.hardwareUnidad && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hardware afectado</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {inc.hardwareUnidad.catalogo.marca} {inc.hardwareUnidad.catalogo.modelo}
                </p>
                {inc.hardwareUnidad.numSerie && <p className="text-xs text-gray-500">SN: {inc.hardwareUnidad.numSerie}</p>}
                {inc.hardwareUnidad.catalogo.referenciaPalex && <p className="text-xs text-gray-500">Ref: {inc.hardwareUnidad.catalogo.referenciaPalex}</p>}
              </div>
            )}
          </div>

          {/* SLA */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SLA</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: sla.color }}>{sla.label}</span>
              <span className="text-xs text-gray-400">{inc.slaHoras ?? 0}h objetivo</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, sla.pct)}%`, backgroundColor: sla.color }} />
            </div>
          </div>

          {/* State actions */}
          {isOpen && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cambiar estado</h3>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.filter(e => e.value !== inc.estado && e.value !== "CERRADA").map(e => (
                  <button key={e.value} onClick={() => cambiarEstado(e.value)} disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80 disabled:opacity-50"
                    style={{ borderColor: e.color, color: e.color }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resolución</h3>
              {!editandoResolucion && (
                <button onClick={() => setEditandoResolucion(true)} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
                  {inc.resolucion ? "Editar" : "Añadir"}
                </button>
              )}
            </div>
            {editandoResolucion ? (
              <div className="space-y-2">
                <textarea value={resolucionText} onChange={e => setResolucionText(e.target.value)}
                  rows={3} placeholder="Describe cómo se resolvió la incidencia..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditandoResolucion(false)} className="text-xs text-gray-500 px-3 py-1.5">Cancelar</button>
                  <button onClick={guardarResolucion} disabled={saving}
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                    Guardar
                  </button>
                </div>
              </div>
            ) : inc.resolucion ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{inc.resolucion}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Sin resolución registrada</p>
            )}
          </div>

          {/* Close button */}
          {inc.estado === "RESUELTA" && (
            <button onClick={() => cambiarEstado("CERRADA")} disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#6b7280" }}>
              Cerrar incidencia
            </button>
          )}
        </div>

        {/* Right: Timeline + Event form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add event */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Registrar evento</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_EVENTO.filter(t => !["CAMBIO_ESTADO", "CAMBIO_ASIGNACION"].includes(t.value)).map(t => (
                  <button key={t.value} onClick={() => setEventoTipo(t.value)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={eventoTipo === t.value
                      ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` }
                      : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea value={eventoDesc} onChange={e => setEventoDesc(e.target.value)}
                rows={2} placeholder="Describe lo ocurrido..."
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
              <div className="flex items-center gap-3">
                {["LLAMADA_ENTRANTE", "LLAMADA_SALIENTE"].includes(eventoTipo) && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Duración (min):</label>
                    <input type="number" value={eventoDuracion} onChange={e => setEventoDuracion(e.target.value)}
                      min="0" max="999" className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                )}
                <button onClick={enviarEvento} disabled={enviandoEvento || !eventoDesc.trim()}
                  className="ml-auto px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>
                  {enviandoEvento ? "Enviando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Historial ({inc.eventos.length} eventos)
            </h3>
            {inc.eventos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin eventos registrados</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-4">
                  {inc.eventos.map(ev => {
                    const info = getEventoInfo(ev.tipo)
                    return (
                      <div key={ev.id} className="relative pl-10">
                        <div className="absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white dark:bg-gray-900 border-2 z-10"
                          style={{ borderColor: info.color }}>
                          <span>{info.icon}</span>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${info.color}15`, color: info.color }}>
                              {info.label}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">{formatDate(ev.creadoEn)}</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ev.descripcion}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <span>{ev.autor.nombre}</span>
                            {ev.duracion && <span>· {ev.duracion} min</span>}
                            {ev.privado && <span className="text-orange-500 font-medium">· Privado</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
