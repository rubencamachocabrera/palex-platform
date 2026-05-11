"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { TEAL } from "@/lib/brand"

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
  const [tab, setTab] = useState<"info" | "contactos" | "visitas">("info")
  const [creandoVisita, setCreandoVisita] = useState(false)

  // Estado modal contacto
  const [contactoModal, setContactoModal] = useState(false)
  const [editContacto, setEditContacto] = useState<Contacto | null>(null)
  const [formC, setFormC] = useState({ ...CONTACTO_EMPTY })
  const [guardandoC, setGuardandoC] = useState(false)
  const [errorC, setErrorC] = useState("")

  const isAdmin = userRol === "ADMIN"

  async function cargar() {
    const [rH, rP] = await Promise.all([
      fetch(`/api/hospitales/${id}`),
      fetch("/api/perfil"),
    ])
    if (rH.ok) setHospital(await rH.json())
    if (rP.ok) { const p = await rP.json(); setUserRol(p.rol ?? "") }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [id])

  // --- Visita ---
  async function nuevaVisita() {
    setCreandoVisita(true)
    const tipo = userRol === "VENTAS" ? "VENTAS" : "PROYECTOS"
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

  async function eliminarContacto(contactoId: string, nombre: string) {
    if (!confirm(`Eliminar el contacto "${nombre}"?`)) return
    await fetch(`/api/contactos/${contactoId}`, { method: "DELETE" })
    await cargar()
  }

  // --- Render ---
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-400">Cargando...</p>
    </div>
  )
  if (!hospital) return (
    <div className="text-center py-20">
      <p className="text-sm text-gray-400">Hospital no encontrado.</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">

      {/* Cabecera */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mt-1 text-xl leading-none shrink-0">
          &#8249;
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 leading-tight">{hospital.nombre}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {hospital.ciudad}{hospital.provincia ? `, ${hospital.provincia}` : ""} &#183; {hospital.zona.nombre}
          </p>
        </div>
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
        {(["info", "contactos", "visitas"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-teal-500" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={tab === t ? { borderColor: TEAL, color: TEAL } : {}}
          >
            {t === "info" ? "Informacion"
              : t === "contactos" ? `Contactos (${hospital.contactos.length})`
              : `Visitas (${hospital.visitas.length})`}
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
          {isAdmin && (
            <div className="flex justify-end mb-3">
              <button
                onClick={abrirCrearContacto}
                className="text-sm font-medium text-white px-4 py-2 rounded-lg"
                style={{ backgroundColor: TEAL }}
              >
                + Nuevo contacto
              </button>
            </div>
          )}

          {hospital.contactos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-3xl mb-3">👤</p>
              <p className="text-gray-500 text-sm font-medium">Sin contactos registrados</p>
              {isAdmin && (
                <button onClick={abrirCrearContacto} className="mt-3 text-sm font-medium" style={{ color: TEAL }}>
                  Añadir primer contacto →
                </button>
              )}
            </div>
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
                            <a href={`mailto:${c.email}`} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5">
                              <span className="text-base">✉️</span>
                              <span className="truncate">{c.email}</span>
                            </a>
                          )}
                          {c.telefono && (
                            <a href={`tel:${c.telefono}`} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5">
                              <span className="text-base">📞</span>
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
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-3xl mb-3">📋</p>
              <p className="text-gray-500 text-sm font-medium">Sin visitas registradas</p>
              <button onClick={nuevaVisita} disabled={creandoVisita} className="mt-3 text-sm font-medium" style={{ color: TEAL }}>
                Registrar primera visita →
              </button>
            </div>
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

      {/* ── Modal contacto ── */}
      {contactoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editContacto ? "Editar contacto" : "Nuevo contacto"}
              </h2>
              <button onClick={() => setContactoModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &#215;
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
