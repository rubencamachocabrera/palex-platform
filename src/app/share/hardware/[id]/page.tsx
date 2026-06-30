"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Unidad {
  id: string
  serialNumber?: string | null
  numSerie?: string | null
  estado?: string | null
  ubicacion?: string | null
  notasInstalacion?: string | null
  creadoEn: string
  garantiaHasta?: string | null
  catalogo?: {
    nombre?: string | null
    referenciaPalex?: string | null
    descripcion?: string | null
    tipo?: { nombre: string } | null
  } | null
  hospital?: { id: string; nombre: string; ciudad: string; provincia: string } | null
  proyecto?: { id: string; titulo: string } | null
  incidencias?: {
    id: string; codigo: string; titulo: string;
    estado: string; prioridad: string; creadoEn: string; fechaCierre?: string | null
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo", INACTIVO: "Inactivo", EN_MANTENIMIENTO: "Mantenimiento",
  ROTO: "Avería", BAJA: "Baja",
}
const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  ACTIVO:           { bg: "#f0fdf4", text: "#15803d" },
  INACTIVO:         { bg: "#f9fafb", text: "#6b7280" },
  EN_MANTENIMIENTO: { bg: "#fff7ed", text: "#c2410c" },
  ROTO:             { bg: "#fef2f2", text: "#dc2626" },
  BAJA:             { bg: "#f9fafb", text: "#9ca3af" },
}
const INC_ESTADO_COLOR: Record<string, string> = {
  ABIERTA: "#ef4444", EN_CURSO: TEAL, CERRADA: "#22c55e",
  PENDIENTE_CLIENTE: "#f59e0b", PENDIENTE_PROVEEDOR: "#f59e0b",
  CANCELADA: "#9ca3af",
}
const PRIO_LABEL: Record<string, string> = {
  BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica",
}
const PRIO_COLOR: Record<string, string> = {
  BAJA: "#22c55e", MEDIA: "#f59e0b", ALTA: ORANGE, CRITICA: "#ef4444",
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function garantiaStatus(fecha?: string | null) {
  if (!fecha) return null
  const days = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
  if (days < 0) return { label: `Vencida hace ${-days}d`, color: "#ef4444", bg: "#fef2f2" }
  if (days < 30) return { label: `Vence en ${days}d`, color: ORANGE, bg: "#fff7ed" }
  if (days < 90) return { label: `${Math.ceil(days/30)} meses restantes`, color: "#f59e0b", bg: "#fffbeb" }
  return { label: `${Math.ceil(days/30)} meses restantes`, color: "#15803d", bg: "#f0fdf4" }
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function HardwarePassportPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Unidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [serverError, setServerError] = useState(false)

  useEffect(() => {
    fetch(`/api/share/hardware/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        if (!r.ok) { setServerError(true); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${TEAL}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (serverError) return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16, padding: 24 }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>Error del servidor</p>
      <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>No se pudo cargar el pasaporte. Inténtalo de nuevo.</p>
    </div>
  )

  if (notFound || !data) return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16, padding: 24 }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="1"/>
      </svg>
      <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>Unidad no encontrada</p>
      <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>El pasaporte de este equipo no está disponible</p>
    </div>
  )

  const estadoStyle = ESTADO_COLOR[data.estado ?? ""] ?? { bg: "#f9fafb", text: "#6b7280" }
  const garantia = garantiaStatus(data.garantiaHasta)
  const serial = data.serialNumber ?? data.numSerie ?? null
  const incAbiertas = (data.incidencias ?? []).filter(i => i.estado !== "CERRADA" && i.estado !== "CANCELADA")
  const incCerradas = (data.incidencias ?? []).filter(i => i.estado === "CERRADA" || i.estado === "CANCELADA")

  return (
    <div style={{ minHeight: "100svh", background: "#f0f7ff", fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* ── Cabecera hero ── */}
      <div style={{
        background: `linear-gradient(135deg, #0f2744 0%, #1a3a5c 60%, #0d3259 100%)`,
        padding: "40px 24px 32px",
        color: "#fff",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Logo + brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, opacity: 0.85 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="17" cy="12" r="1"/>
            </svg>
            <span style={{ fontSize: 13, letterSpacing: "0.05em", fontWeight: 600, color: TEAL }}>PALEX · PASAPORTE HARDWARE</span>
          </div>

          {/* Nombre dispositivo */}
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 700, lineHeight: 1.25, color: "#fff" }}>
            {data.catalogo?.nombre ?? "Unidad de hardware"}
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 15, color: "#93c5fd", fontWeight: 400 }}>
            {data.catalogo?.tipo?.nombre ?? "Equipamiento médico"}{data.catalogo?.referenciaPalex ? ` · ${data.catalogo.referenciaPalex}` : ""}
          </p>

          {/* Estado + serial */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 20,
              background: estadoStyle.bg, color: estadoStyle.text,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.03em"
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
              {ESTADO_LABEL[data.estado ?? ""] ?? data.estado}
            </span>
            {serial && (
              <span style={{
                padding: "5px 12px", borderRadius: 20,
                background: "rgba(255,255,255,0.12)", color: "#e2e8f0",
                fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", fontFamily: "monospace"
              }}>
                S/N: {serial}
              </span>
            )}
            {garantia && (
              <span style={{
                padding: "5px 12px", borderRadius: 20,
                background: garantia.bg, color: garantia.color,
                fontSize: 12, fontWeight: 600
              }}>
                {garantia.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* Información del hospital */}
        {data.hospital && (
          <Card title="Ubicación instalada">
            <Row label="Hospital" value={data.hospital.nombre} />
            <Row label="Ciudad" value={`${data.hospital.ciudad}, ${data.hospital.provincia}`} />
            {data.ubicacion && <Row label="Ubicación" value={data.ubicacion} />}
            {data.proyecto && <Row label="Proyecto" value={data.proyecto.titulo} />}
          </Card>
        )}

        {/* Detalles técnicos */}
        <Card title="Detalles técnicos">
          <Row label="Referencia Palex" value={data.catalogo?.referenciaPalex ?? "—"} />
          <Row label="Descripción" value={data.catalogo?.descripcion ?? "—"} />
          <Row label="Tipo" value={data.catalogo?.tipo?.nombre ?? "—"} />
          {data.garantiaHasta && <Row label="Garantía hasta" value={fmtFecha(data.garantiaHasta)} />}
          <Row label="Registro" value={fmtFecha(data.creadoEn)} />
          {data.notasInstalacion && <Row label="Notas instalación" value={data.notasInstalacion} />}
        </Card>

        {/* Incidencias activas */}
        {incAbiertas.length > 0 && (
          <Card title="Incidencias abiertas">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {incAbiertas.map(inc => (
                <IncidenciaRow key={inc.id} inc={inc} />
              ))}
            </div>
          </Card>
        )}

        {/* Historial de incidencias */}
        {incCerradas.length > 0 && (
          <Card title={`Historial de incidencias (${incCerradas.length})`} collapsible>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {incCerradas.map(inc => (
                <IncidenciaRow key={inc.id} inc={inc} muted />
              ))}
            </div>
          </Card>
        )}

        {/* Sin incidencias */}
        {(data.incidencias ?? []).length === 0 && (
          <Card title="Historial de incidencias">
            <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block" }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Sin incidencias registradas</p>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 32, color: "#94a3b8", fontSize: 12 }}>
          <p style={{ margin: 0 }}>Pasaporte generado por <strong style={{ color: TEAL }}>Palex Platform</strong></p>
          <p style={{ margin: "4px 0 0" }}>Este documento es informativo y puede no reflejar el estado en tiempo real.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Card({ title, children, collapsible }: { title: string; children: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
      marginBottom: 16, overflow: "hidden"
    }}>
      <div
        style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: collapsible ? "pointer" : "default" }}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e293b", letterSpacing: "0.01em" }}>{title}</h2>
        {collapsible && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>
      {open && <div style={{ padding: "12px 20px 16px" }}>{children}</div>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "7px 0", borderBottom: "1px solid #f8fafc" }}>
      <span style={{ fontSize: 13, color: "#64748b", flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1e293b", textAlign: "right", fontWeight: 400, wordBreak: "break-word" }}>{value}</span>
    </div>
  )
}

function IncidenciaRow({ inc, muted }: { inc: { id: string; codigo: string; titulo: string; estado: string; prioridad: string; creadoEn: string; fechaCierre?: string | null }; muted?: boolean }) {
  const estadoColor = INC_ESTADO_COLOR[inc.estado] ?? "#9ca3af"
  const prioColor = PRIO_COLOR[inc.prioridad] ?? "#9ca3af"
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10, border: "1px solid #f1f5f9",
      background: muted ? "#fafafa" : "#fff",
      display: "flex", flexDirection: "column", gap: 4
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", fontWeight: 600 }}>{inc.codigo}</span>
        <span style={{ fontSize: 11, color: estadoColor, fontWeight: 600, letterSpacing: "0.03em" }}>● {inc.estado.replace(/_/g, " ")}</span>
        <span style={{ fontSize: 11, color: prioColor, fontWeight: 600, marginLeft: "auto" }}>{PRIO_LABEL[inc.prioridad] ?? inc.prioridad}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: muted ? "#6b7280" : "#1e293b", fontWeight: 500 }}>{inc.titulo}</p>
      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
        {new Date(inc.creadoEn).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        {inc.fechaCierre && ` → ${new Date(inc.fechaCierre).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`}
      </p>
    </div>
  )
}
