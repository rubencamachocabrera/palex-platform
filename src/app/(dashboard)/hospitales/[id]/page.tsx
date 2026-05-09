"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

const TEAL = "#00A99D"

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público", HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada", LABORATORIO: "Laboratorio",
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
  const { data: session } = useSession()
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"info" | "contactos" | "visitas">("info")
  const [creandoVisita, setCreandoVisita] = useState(false)

  useEffect(() => {
    fetch(`/api/hospitales/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setHospital(data); setLoading(false) })
  }, [id])

  async function nuevaVisita() {
    setCreandoVisita(true)
    const rol = (session?.user as { role?: string } | undefined)?.role ?? "PROYECTOS"
    const tipo = rol === "VENTAS" ? "VENTAS" : "PROYECTOS"
    const r = await fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospitalId: id, tipo }),
    })
    if (r.ok) {
      const v = await r.json()
      router.push(`/dashboard/visitas/${v.id}`)
    } else {
      setCreandoVisita(false)
    }
  }

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
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mt-1 text-lg">&#8249;</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 leading-tight">{hospital.nombre}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {hospital.ciudad}{hospital.provincia ? `, ${hospital.provincia}` : ""} &middot; {hospital.zona.nombre}
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
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-teal-500 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={tab === t ? { borderColor: TEAL, color: TEAL } : {}}
          >
            {t === "info"
              ? "Informacion"
              : t === "contactos"
              ? `Contactos (${hospital.contactos.length})`
              : `Visitas (${hospital.visitas.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Informacion */}
      {tab === "info" && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {[
            { label: "Tipo", value: TIPO_LABELS[hospital.tipo] ?? hospital.tipo },
            { label: "Zona", value: hospital.zona.nombre },
            { label: "Ciudad", value: hospital.ciudad },
            { label: "Provincia", value: hospital.provincia ?? "-" },
            { label: "Pais", value: hospital.pais },
            { label: "Camas", value: hospital.camas?.toString() ?? "-" },
            { label: "Direccion", value: hospital.direccion ?? "-" },
            { label: "Estado", value: hospital.activo ? "Activo" : "Inactivo" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs font-medium text-gray-400">{label}</span>
              <span className="text-sm text-gray-700 text-right">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Contactos */}
      {tab === "contactos" && (
        <div>
          {hospital.contactos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No hay contactos registrados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hospital.contactos.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                      {c.cargo && <p className="text-xs text-gray-400 mt-0.5">{c.cargo}</p>}
                    </div>
                    {c.principal && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: TEAL }}
                      >
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800"
                      >
                        <span>Email:</span> {c.email}
                      </a>
                    )}
                    {c.telefono && (
                      <a
                        href={`tel:${c.telefono}`}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800"
                      >
                        <span>Tel:</span> {c.telefono}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Visitas */}
      {tab === "visitas" && (
        <div>
          {hospital.visitas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No hay visitas registradas.</p>
              <button
                onClick={nuevaVisita}
                disabled={creandoVisita}
                className="mt-3 text-sm font-medium"
                style={{ color: TEAL }}
              >
                Registrar primera visita
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {hospital.visitas.map(v => (
                  <Link
                    key={v.id}
                    href={`/dashboard/visitas/${v.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(v.fecha).toLocaleDateString("es-ES")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.usuario.nombre} &middot; {v.tipo}</p>
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
    </div>
  )
}
