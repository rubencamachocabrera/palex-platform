"use client"

import { useEffect, useState, useCallback, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { Skeleton } from "@/components/ui/Skeleton"
import {
  IconArrowLeft, IconClipboardList, IconPhoneIncoming, IconPhoneOutgoing,
  IconSend, IconInbox, IconZap, IconWrench, IconTerminal,
  IconMessageCircle, IconRefreshCw, IconUserCheck, IconClock,
  IconEyeOff, IconFileExport, IconAlertTriangle, IconPhone, IconMail,
} from "@/components/ui/Icons"

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

interface TipoEventoDef {
  value: string
  label: string
  icon: (props: { size?: number; className?: string }) => ReactNode
  color: string
}

const TIPOS_EVENTO: TipoEventoDef[] = [
  { value: "NOTA", label: "Nota interna", icon: IconClipboardList, color: "#6b7280" },
  { value: "LLAMADA_ENTRANTE", label: "Llamada entrante", icon: IconPhoneIncoming, color: "#10b981" },
  { value: "LLAMADA_SALIENTE", label: "Llamada saliente", icon: IconPhoneOutgoing, color: "#3b82f6" },
  { value: "EMAIL_ENVIADO", label: "Email enviado", icon: IconSend, color: "#8b5cf6" },
  { value: "EMAIL_RECIBIDO", label: "Email recibido", icon: IconInbox, color: "#6366f1" },
  { value: "ESCALADO", label: "Escalado", icon: IconZap, color: "#ef4444" },
  { value: "RESPUESTA_TECNICA", label: "Resp. técnica", icon: IconWrench, color: TEAL },
  { value: "RESPUESTA_APLICACIONES", label: "Resp. aplicaciones", icon: IconTerminal, color: "#0ea5e9" },
  { value: "COMUNICACION_CLIENTE", label: "Com. cliente", icon: IconMessageCircle, color: ORANGE },
]

const TIPOS_EVENTO_AUTO: TipoEventoDef[] = [
  { value: "CAMBIO_ESTADO", label: "Cambio estado", icon: IconRefreshCw, color: "#9ca3af" },
  { value: "CAMBIO_ASIGNACION", label: "Cambio asignación", icon: IconUserCheck, color: "#9ca3af" },
]

const ALL_TIPOS = [...TIPOS_EVENTO, ...TIPOS_EVENTO_AUTO]

function getEstadoStyle(estado: string) {
  return ESTADOS.find(e => e.value === estado) ?? { label: estado, color: "#6b7280", bg: "#f3f4f6" }
}

function getEventoInfo(tipo: string): TipoEventoDef {
  return ALL_TIPOS.find(t => t.value === tipo) ?? { label: tipo, icon: IconClipboardList, color: "#6b7280", value: tipo }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.floor((today.getTime() - target.getTime()) / 86400000)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  if (diff < 7) return `Hace ${diff} días`
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
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

function groupEventsByDate(eventos: Evento[]): { label: string; events: Evento[] }[] {
  const groups: { label: string; events: Evento[] }[] = []
  for (const ev of eventos) {
    const label = dateGroupLabel(ev.creadoEn)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.events.push(ev)
    } else {
      groups.push({ label, events: [ev] })
    }
  }
  return groups
}

export default function IncidenciaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { perfil, rol } = usePerfil()
  const id = params.id as string

  const [inc, setInc] = useState<Incidencia | null>(null)
  const [loading, setLoading] = useState(true)

  const [eventoTipo, setEventoTipo] = useState("NOTA")
  const [eventoDesc, setEventoDesc] = useState("")
  const [eventoDuracion, setEventoDuracion] = useState("")
  const [eventoPrivado, setEventoPrivado] = useState(false)
  const [enviandoEvento, setEnviandoEvento] = useState(false)

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
      privado: eventoPrivado,
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
      setEventoPrivado(false)
      success("Evento registrado")
      fetchInc()
    } else {
      toastError("Error al registrar evento")
    }
    setEnviandoEvento(false)
  }

  function exportarPDF() {
    if (!inc) return
    const est = getEstadoStyle(inc.estado)
    const pri = PRIORIDADES[inc.prioridad] ?? { label: inc.prioridad, color: "#6b7280" }
    const sla = slaInfo(inc.creadoEn, inc.slaHoras, inc.estado)

    const eventosHTML = inc.eventos.map(ev => {
      const info = getEventoInfo(ev.tipo)
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${formatDate(ev.creadoEn)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9"><span style="font-size:11px;font-weight:600;color:${info.color};background:${info.color}15;padding:2px 8px;border-radius:10px">${info.label}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">${ev.descripcion}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${ev.autor.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;text-align:center">${ev.duracion ? ev.duracion + " min" : "—"}</td>
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${inc.codigo} — ${inc.titulo}</title>
    <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:40px auto;color:#1e293b;padding:0 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${TEAL};padding-bottom:16px;margin-bottom:24px">
        <div>
          <h1 style="margin:0;font-size:22px;color:#0f172a">${inc.titulo}</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;font-family:monospace">${inc.codigo} · ${inc.hospital.nombre} · ${inc.hospital.ciudad}</p>
        </div>
        <div style="text-align:right">
          <span style="font-size:12px;font-weight:700;color:${est.color};background:${est.bg};padding:4px 12px;border-radius:12px">${est.label}</span>
          <span style="font-size:12px;font-weight:700;color:${pri.color};background:${pri.bg || '#f3f4f6'};padding:4px 12px;border-radius:12px;margin-left:6px">${pri.label}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
        ${[
          ["Tipo", inc.tipo === "HARDWARE" ? "Hardware" : "Software"],
          ["Categoría", CATEGORIAS[inc.categoria] ?? inc.categoria],
          ["Equipo", EQUIPOS[inc.equipoResponsable]],
          ["Reportada por", inc.reportadoPor.nombre],
          ["Asignada a", inc.asignadoA?.nombre ?? "Sin asignar"],
          ["Creada", formatDate(inc.creadoEn)],
          ["SLA", `${inc.slaHoras ?? 0}h — ${sla.label}`],
          ...(inc.fechaResolucion ? [["Resuelta", formatDate(inc.fechaResolucion)]] : []),
          ...(inc.contacto ? [["Contacto", inc.contacto.nombre + (inc.contacto.cargo ? ` (${inc.contacto.cargo})` : "")]] : []),
          ...(inc.hardwareUnidad ? [["Hardware", `${inc.hardwareUnidad.catalogo.marca} ${inc.hardwareUnidad.catalogo.modelo}${inc.hardwareUnidad.numSerie ? ` — SN: ${inc.hardwareUnidad.numSerie}` : ""}`]] : []),
        ].map(([k, v]) => `<div style="background:#f8fafc;padding:10px 14px;border-radius:8px"><span style="font-size:11px;text-transform:uppercase;color:#94a3b8;font-weight:700">${k}</span><p style="margin:4px 0 0;font-size:13px;font-weight:500">${v}</p></div>`).join("")}
      </div>
      <p style="font-size:14px;white-space:pre-wrap;color:#475569;margin-bottom:24px;line-height:1.6">${inc.descripcion}</p>
      ${inc.resolucion ? `<div style="background:#ecfdf5;border-left:3px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px"><p style="font-size:11px;text-transform:uppercase;color:#059669;font-weight:700;margin:0 0 4px">Resolución</p><p style="font-size:13px;color:#065f46;margin:0;white-space:pre-wrap">${inc.resolucion}</p></div>` : ""}
      <h2 style="font-size:14px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;margin-bottom:12px">Historial de eventos (${inc.eventos.length})</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Fecha</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Tipo</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Descripción</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Autor</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Duración</th>
        </tr></thead>
        <tbody>${eventosHTML}</tbody>
      </table>
      <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:32px">Informe generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} — Palex Medical</p>
    </body></html>`

    const w = window.open("", "_blank")
    if (w) { w.document.write(html); w.document.close(); w.print() }
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
  const eventGroups = groupEventsByDate(inc.eventos)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/incidencias")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group">
          <IconArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Incidencias</span>
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-sm font-mono font-bold text-gray-400">{inc.codigo}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: est.bg, color: est.color }}>{est.label}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
        <button onClick={exportarPDF} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Exportar informe">
          <IconFileExport size={14} />
          <span className="hidden sm:inline">Exportar</span>
        </button>
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
              <Link href={`/hospitales/${inc.hospital.id}?from=incidencia&iid=${id}`} className="font-medium hover:underline" style={{ color: TEAL }}>{inc.hospital.nombre}</Link>
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
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contacto</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{inc.contacto.nombre}</p>
                {inc.contacto.cargo && <p className="text-xs text-gray-500 mt-0.5">{inc.contacto.cargo}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {inc.contacto.email && (
                    <a href={`mailto:${inc.contacto.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      <IconMail size={12} /> {inc.contacto.email}
                    </a>
                  )}
                  {inc.contacto.telefono && (
                    <a href={`tel:${inc.contacto.telefono}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      <IconPhone size={12} /> {inc.contacto.telefono}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Hardware */}
            {inc.hardwareUnidad && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hardware afectado</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ORANGE}15` }}>
                    <IconWrench size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {inc.hardwareUnidad.catalogo.marca} {inc.hardwareUnidad.catalogo.modelo}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {inc.hardwareUnidad.numSerie && `SN: ${inc.hardwareUnidad.numSerie}`}
                      {inc.hardwareUnidad.numSerie && inc.hardwareUnidad.catalogo.referenciaPalex && " · "}
                      {inc.hardwareUnidad.catalogo.referenciaPalex && `Ref: ${inc.hardwareUnidad.catalogo.referenciaPalex}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SLA */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SLA</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: sla.color }}>{sla.label}</span>
              <span className="text-xs text-gray-400">{inc.slaHoras ?? 0}h objetivo</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm disabled:opacity-50"
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
              <div className="rounded-xl p-3" style={{ backgroundColor: "#ecfdf5" }}>
                <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{inc.resolucion}</p>
              </div>
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
              {/* Event type grid with SVG icons */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TIPOS_EVENTO.map(t => {
                  const Icon = t.icon
                  const active = eventoTipo === t.value
                  return (
                    <button key={t.value} onClick={() => setEventoTipo(t.value)}
                      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium border transition-all"
                      style={active
                        ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10`, boxShadow: `0 0 0 1px ${t.color}30` }
                        : { borderColor: "transparent", color: "#9ca3af", backgroundColor: "transparent" }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={active ? { backgroundColor: `${t.color}18` } : { backgroundColor: "#f1f5f9" }}>
                        <Icon size={15} />
                      </div>
                      <span className="text-center leading-tight">{t.label}</span>
                    </button>
                  )
                })}
              </div>

              <textarea value={eventoDesc} onChange={e => setEventoDesc(e.target.value)}
                rows={2} placeholder="Describe lo ocurrido..."
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />

              <div className="flex items-center gap-3 flex-wrap">
                {/* Duration for calls */}
                {["LLAMADA_ENTRANTE", "LLAMADA_SALIENTE"].includes(eventoTipo) && (
                  <div className="flex items-center gap-2">
                    <IconClock size={14} className="text-gray-400" />
                    <input type="number" value={eventoDuracion} onChange={e => setEventoDuracion(e.target.value)}
                      min="0" max="999" placeholder="min"
                      className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                    <span className="text-xs text-gray-400">min</span>
                  </div>
                )}

                {/* Privado toggle */}
                <button onClick={() => setEventoPrivado(p => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={eventoPrivado
                    ? { borderColor: ORANGE, color: ORANGE, backgroundColor: `${ORANGE}10` }
                    : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                  <IconEyeOff size={13} />
                  Privado
                </button>

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
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Historial ({inc.eventos.length} eventos)
              </h3>
            </div>

            {inc.eventos.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <IconAlertTriangle size={20} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400">Sin eventos registrados</p>
              </div>
            ) : (
              <div className="space-y-6">
                {eventGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Date group header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{group.label}</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                      <span className="text-[11px] text-gray-300 dark:text-gray-600">{group.events.length}</span>
                    </div>

                    {/* Events in this group */}
                    <div className="relative ml-4">
                      {/* Vertical line */}
                      <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-700" />

                      <div className="space-y-3">
                        {group.events.map((ev, ei) => {
                          const info = getEventoInfo(ev.tipo)
                          const Icon = info.icon
                          const isAuto = ["CAMBIO_ESTADO", "CAMBIO_ASIGNACION"].includes(ev.tipo)

                          return (
                            <div key={ev.id} className="relative pl-10 group/ev">
                              {/* Icon node */}
                              <div className="absolute left-0 top-2.5 w-7 h-7 rounded-lg flex items-center justify-center z-10 shadow-sm transition-transform group-hover/ev:scale-110"
                                style={{ backgroundColor: isAuto ? "#f1f5f9" : `${info.color}15`, border: `2px solid ${isAuto ? "#e2e8f0" : info.color}30` }}>
                                <span style={{ color: isAuto ? "#9ca3af" : info.color }}><Icon size={13} /></span>
                              </div>

                              {/* Event card */}
                              <div className={`rounded-xl border p-3.5 transition-all group-hover/ev:shadow-sm ${isAuto
                                ? "border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
                                : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"}`}>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${info.color}12`, color: info.color }}>
                                    {info.label}
                                  </span>
                                  {ev.privado && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: `${ORANGE}15`, color: ORANGE }}>
                                      <IconEyeOff size={10} /> Privado
                                    </span>
                                  )}
                                  {ev.duracion != null && ev.duracion > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                      <IconClock size={10} /> {ev.duracion} min
                                    </span>
                                  )}
                                  <span className="text-[11px] text-gray-400 ml-auto">{formatTime(ev.creadoEn)}</span>
                                </div>
                                <p className={`text-sm whitespace-pre-wrap ${isAuto ? "text-gray-500 dark:text-gray-400 italic" : "text-gray-800 dark:text-gray-200"}`}>
                                  {ev.descripcion}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1.5">{ev.autor.nombre}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
