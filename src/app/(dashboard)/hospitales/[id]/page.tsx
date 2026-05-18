"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { TEAL } from "@/lib/brand"
import {
  IconArrowLeft, IconMail, IconPhone, IconUser,
  IconFileText, IconPlus, IconX,
} from "@/components/ui/Icons"
import { EmptyState } from "@/components/ui/EmptyState"

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Publico", HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clinica Privada", LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud", UNIVERSIDAD: "Universidad", OTRO: "Otro",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}
const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}

interface TimelineEvento {
  id: string; tipo: string; titulo: string; descripcion: string; fecha: string; href?: string
}

const TIPO_COLOR: Record<string, string> = {
  visita: "bg-teal-500", oportunidad: "bg-purple-500", etapa: "bg-amber-400", proyecto: "bg-blue-500",
}

const CONTACTO_EMPTY = { nombre: "", cargo: "", email: "", telefono: "", principal: false }

interface Contacto {
  id: string; nombre: string; cargo: string | null
  email: string | null; telefono: string | null; principal: boolean
}
interface Visita {
  id: string; estado: string; tipo: string; fecha: string
  usuario: { id: string; nombre: string; rol: string }
}
interface Hospital {
  id: string; nombre: string; ciudad: string; provincia: string | null
  pais: string; tipo: string; camas: number | null; direccion: string | null
  activo: boolean; zona: { id: string; nombre: string }
  contactos: Contacto[]; visitas: Visita[]
}

export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [userRol, setUserRol] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"info" | "contactos" | "visitas" | "timeline">("info")
  const [timeline, setTimeline] = useState<TimelineEvento[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [creandoVisita, setCreandoVisita] = useState(false)

  // Estado modal contacto
  const [contactoModal, setContactoModal] = useState(false)
  const [editContacto, setEditContacto] = useState<Contacto | null>(null)
  const [formC, setFormC] = useState({ ...CONTACTO_EMPTY })
  const [guardandoC, setGuardandoC] = useState(false)
  const [errorC, setErrorC] = useState("")

  // QR
  const [showQR, setShowQR] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const isAdmin = userRol === "ADMIN"

  async function cargar() {
    try {
      const [rH, rP] = await Promise.all([
        fetch(`/api/hospitales/${id}`),
        fetch("/api/perfil"),
      ])
      if (rH.ok) setHospital(await rH.json())
      if (rP.ok) { const p = await rP.json(); setUserRol(p.rol ?? "") }
    } catch (e) {
      console.error("[cargar hospital]", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [id])

  // --- Visita ---
  async function nuevaVisita() {
    setCreandoVisita(true)
    const tipo = userRol === "VENTAS" ? "VENTAS" : "PROYECTOS"  // TECNICO usa PROYECTOS
    const r = await fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospitalId: id, tipo }),
    })
    if (r.ok) { const v = await r.json(); router.push(`/visitas/${v.id}`) }
    else setCreandoVisita(false)
  }

  // --- Contactos ---
  function abrirCrearContacto() {
    setEditContacto(null)
    setFormC({ ...CONTACTO_EMPTY })
    setErrorC("")
    setContactoModal(true)
  }

  function abrirEditarContacto(c: Contacto) {
    setEditContacto(c)
    setFormC({
      nombre: c.nombre,
      cargo: c.cargo ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      principal: c.principal,
    })
    setErrorC("")
    setContactoModal(true)
  }

  async function guardarContacto() {
    if (!formC.nombre.trim()) { setErrorC("El nombre es obligatorio"); return }
    setGuardandoC(true); setErrorC("")
    const payload = {
      nombre: formC.nombre,
      cargo: formC.cargo || null,
      email: formC.email || null,
      telefono: formC.telefono || null,
      principal: formC.principal,
    }
    const url = editContacto
      ? `/api/contactos/${editContacto.id}`
      : `/api/hospitales/${id}/contactos`
    const method = editContacto ? "PATCH" : "POST"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    if (!r.ok) {
      const d = await r.json()
      setErrorC(d.error ?? "Error al guardar")
      setGuardandoC(false)
      return
    }
    setContactoModal(false)
    setGuardandoC(false)
    await cargar()
  }

  async function cargarTimeline() {
    if (timeline.length > 0) return
    setTimelineLoading(true)
    fetch(`/api/hospitales/${id}/timeline`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setTimeline(d) })
      .finally(() => setTimelineLoading(false))
  }

  async function eliminarContacto(contactoId: string, nombre: string) {
    if (!confirm(`Eliminar el contacto "${nombre}"?`)) return
    await fetch(`/api/contactos/${contactoId}`, { method: "DELETE" })
    await cargar()
  }

  // Genera el QR cuando se abre el modal
  useEffect(() => {
    if (!showQR || !hospital || !qrCanvasRef.current) return
    const partes = [
      hospital.nombre,
      hospital.ciudad + (hospital.provincia ? `, ${hospital.provincia}` : ""),
      hospital.pais,
      hospital.tipo ? TIPO_LABELS[hospital.tipo] ?? hospital.tipo : "",
      hospital.camas ? `${hospital.camas} camas` : "",
      hospital.direccion ?? "",
    ].filter(Boolean)
    import("qrcode").then(QRCode => {
      QRCode.toCanvas(qrCanvasRef.current!, partes.join("\n"), {
        width: 240,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
      })
    })
  }, [showQR, hospital])

  // --- Render ---
  if (loading) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg skeleton-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 rounded-lg skeleton-shimmer" />
          <div className="h-3 w-1/3 rounded-lg skeleton-shimmer" />
        </div>
        <div className="w-24 h-9 rounded-lg skeleton-shimmer shrink-0" />
      </div>
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {[80, 110, 90].map(w => (
          <div key={w} className={`h-10 rounded-t-lg skeleton-shimmer mb-0`} style={{ width: w }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-20 skeleton-shimmer" />)}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0">
            <div className="h-3 w-20 rounded skeleton-shimmer" />
            <div className="h-3 w-32 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
  if (!hospital) return (
    <div className="max-w-2xl mx-auto py-20">
      <EmptyState icon="search" title="Hospital no encontrado" description="El hospital que buscas no existe o no tienes acceso." action={{ label: "Volver a hospitales", href: "/hospitales" }} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">

      {/* Cabecera */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0 mt-0.5">
          <IconArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 leading-tight">{hospital.nombre}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {hospital.ciudad}{hospital.provincia ? `, ${hospital.provincia}` : ""} &#183; {hospital.zona.nombre}
          </p>
        </div>
        <button
          onClick={() => setShowQR(true)}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          title="Ver QR del hospital"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h1v1h-1z M17 14h1v1h-1z M14 17h1v1h-1z M17 17h3v3h-3z"/>
          </svg>
        </button>
        <button
          onClick={nuevaVisita}
          disabled={creandoVisita}
          className="text-sm font-medium text-white px-4 py-2 rounded-lg shrink-0 disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: TEAL }}
        >
          {creandoVisita ? "..." : "+ Visita"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 gap-1">
        {(["info", "contactos", "visitas", "timeline"] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "timeline") cargarTimeline() }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-teal-500" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={tab === t ? { borderColor: TEAL, color: TEAL } : {}}
          >
            {t === "info" ? "Informacion"
              : t === "contactos" ? `Contactos (${hospital.contactos.length})`
              : t === "visitas" ? `Visitas (${hospital.visitas.length})`
              : "Timeline"}
          </button>
        ))}
      </div>

      {/* ── Tab: Informacion ── */}
      {tab === "info" && (
        <div className="space-y-4">
          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{hospital.visitas.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Visitas</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{hospital.contactos.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Contactos</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              {hospital.visitas.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-gray-700 leading-tight">
                    {new Date(hospital.visitas[hospital.visitas.length - 1].fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Última visita</p>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-300">—</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sin visitas</p>
                </>
              )}
            </div>
          </div>
          {/* Contacto principal */}
          {hospital.contactos.find(c => c.principal) && (() => {
            const cp = hospital.contactos.find(c => c.principal)!
            return (
              <div className="bg-teal-50 rounded-xl border border-teal-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                  {cp.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-teal-800">{cp.nombre}</p>
                  {cp.cargo && <p className="text-xs text-teal-600 truncate">{cp.cargo}</p>}
                </div>
                <span className="text-xs bg-teal-100 text-teal-700 font-medium px-2 py-0.5 rounded-full shrink-0">Principal</span>
              </div>
            )
          })()}
          {/* Detalle */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[
              { label: "Tipo",      value: TIPO_LABELS[hospital.tipo] ?? hospital.tipo },
              { label: "Zona",      value: hospital.zona.nombre },
              { label: "Ciudad",    value: hospital.ciudad },
              { label: "Provincia", value: hospital.provincia ?? "—" },
              { label: "Pais",      value: hospital.pais },
              { label: "Camas",     value: hospital.camas?.toString() ?? "—" },
              { label: "Direccion", value: hospital.direccion ?? "—" },
              { label: "Estado",    value: hospital.activo ? "Activo" : "Inactivo" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
                <span className="text-sm text-gray-700 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Contactos ── */}
      {tab === "contactos" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={abrirCrearContacto}
              className="flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
              style={{ backgroundColor: TEAL }}
            >
              <IconPlus size={15} /> Nuevo contacto
            </button>
          </div>

          {hospital.contactos.length === 0 ? (
            <EmptyState
              icon="document"
              title="Sin contactos registrados"
              description={isAdmin ? "Añade el primer contacto de este centro." : "El administrador puede añadir contactos."}
              action={{ label: "Añadir contacto", onClick: abrirCrearContacto }}
            />
          ) : (
            <div className="space-y-3">
              {hospital.contactos.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: c.principal ? TEAL : "#9CA3AF" }}
                      >
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                          {c.principal && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: TEAL }}>
                              Principal
                            </span>
                          )}
                        </div>
                        {c.cargo && <p className="text-xs text-gray-400 mt-0.5">{c.cargo}</p>}
                        <div className="flex flex-col gap-1 mt-2">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 group/mail">
                              <IconMail size={13} className="text-gray-400 group-hover/mail:text-gray-600 shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </a>
                          )}
                          {c.telefono && (
                            <a href={`tel:${c.telefono}`} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 group/tel">
                              <IconPhone size={13} className="text-gray-400 group-hover/tel:text-gray-600 shrink-0" />
                              {c.telefono}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => abrirEditarContacto(c)}
                          className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarContacto(c.id, c.nombre)}
                          className="text-xs text-red-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-red-100 hover:border-red-200 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Visitas ── */}
      {tab === "visitas" && (
        <div>
          {hospital.visitas.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="Sin visitas registradas"
              description="Registra tu primera visita a este centro."
              action={{ label: "Registrar primera visita", onClick: nuevaVisita }}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {hospital.visitas.map(v => (
                  <Link
                    key={v.id}
                    href={`/visitas/${v.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(v.fecha).toLocaleDateString("es-ES")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {v.usuario.nombre} &#183; {v.tipo}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${ESTADO_COLOR[v.estado]}`}>
                      {ESTADO_LABEL[v.estado]}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={nuevaVisita}
                  disabled={creandoVisita}
                  className="text-sm font-medium disabled:opacity-50"
                  style={{ color: TEAL }}
                >
                  {creandoVisita ? "Creando..." : "+ Nueva visita"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Timeline ── */}
      {tab === "timeline" && (
        <div>
          {timelineLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-1.5 pb-4 border-l border-gray-100 pl-4">
                    <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <EmptyState icon="document" title="Sin actividad registrada" description="Las visitas, oportunidades y proyectos de este hospital aparecerán aquí." />
          ) : (
            <div className="relative">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-100" />
              <div className="space-y-0">
                {timeline.map((ev, i) => (
                  <div key={ev.id} className="flex gap-4" style={{ animationDelay: `${i * 20}ms` }}>
                    <div className={`w-2.5 h-2.5 rounded-full mt-[18px] shrink-0 z-10 ${TIPO_COLOR[ev.tipo] ?? "bg-gray-300"}`} />
                    <div className="flex-1 pb-4 pl-2">
                      {ev.href ? (
                        <Link href={ev.href} className="group block">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-teal-600 transition-colors">{ev.titulo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ev.descripcion}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">{new Date(ev.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </Link>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-800">{ev.titulo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ev.descripcion}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">{new Date(ev.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal QR ── */}
      {showQR && hospital && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowQR(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">QR del hospital</p>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <IconX size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4 p-6">
              <canvas ref={qrCanvasRef} className="rounded-xl" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">{hospital.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{hospital.ciudad}{hospital.provincia ? `, ${hospital.provincia}` : ""}</p>
              </div>
              <button
                onClick={() => {
                  const canvas = qrCanvasRef.current
                  if (!canvas) return
                  const link = document.createElement("a")
                  link.download = `qr-${hospital.nombre.replace(/\s+/g, "-").toLowerCase()}.png`
                  link.href = canvas.toDataURL("image/png")
                  link.click()
                }}
                className="w-full py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Descargar PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal contacto ── */}
      {contactoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editContacto ? "Editar contacto" : "Nuevo contacto"}
              </h2>
              <button onClick={() => setContactoModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <IconX size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre *</label>
                <input
                  value={formC.nombre}
                  onChange={e => setFormC(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre y apellidos"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Cargo</label>
                <input
                  value={formC.cargo}
                  onChange={e => setFormC(f => ({ ...f, cargo: e.target.value }))}
                  placeholder="Jefe de laboratorio, Supervisor..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formC.email}
                    onChange={e => setFormC(f => ({ ...f, email: e.target.value }))}
                    placeholder="correo@hospital.es"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefono</label>
                  <input
                    type="tel"
                    value={formC.telefono}
                    onChange={e => setFormC(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="600 000 000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">Contacto principal</p>
                  <p className="text-xs text-gray-400">Aparece destacado en el perfil del hospital</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormC(f => ({ ...f, principal: !f.principal }))}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                  style={{ backgroundColor: formC.principal ? TEAL : "#E5E7EB" }}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formC.principal ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {errorC && <p className="text-xs text-red-500">{errorC}</p>}
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-gray-100">
              <button
                onClick={() => setContactoModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarContacto}
                disabled={guardandoC}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {guardandoC ? "Guardando..." : editContacto ? "Guardar cambios" : "Crear contacto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
