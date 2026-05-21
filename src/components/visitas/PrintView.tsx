"use client"

import type { FormSection } from "@/lib/form-schema"
import type { TodoItem } from "@/components/visitas/TodoChecklist"
import { TEAL } from "@/lib/brand"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}

interface Foto { id: string; name: string; data: string; caption: string }
type FotosMap = Record<string, Foto[]>

interface VisitaData {
  id: string; estado: string; tipo: string; fecha: string
  datos: Record<string, unknown>
  hospital: { id: string; nombre: string; ciudad: string; provincia?: string | null }
  usuario: { id: string; nombre: string }
}

function calcProgress(section: FormSection, datos: Record<string, unknown>): number {
  const reqFields = section.fields.filter(f => f.req)
  const toCheck = reqFields.length > 0 ? reqFields : section.fields
  if (toCheck.length === 0) return 100
  const filled = toCheck.filter(f => {
    const v = datos[f.id]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "number") return v > 0
    return v !== undefined && v !== null && v !== ""
  }).length
  return Math.round((filled / toCheck.length) * 100)
}

interface PrintViewProps {
  visita: VisitaData
  datos: Record<string, unknown>
  sections: FormSection[]
}

export default function PrintView({ visita, datos, sections }: PrintViewProps) {
  const fotos = (datos.fotos as FotosMap) ?? {}
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0
  const fechaLarga = new Date(visita.fecha).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
  const fechaCorta = new Date().toLocaleDateString("es-ES")

  return (
    <div className="print-doc">
      <style>{`
        @page { margin: 20mm 15mm; }
        @media print {
          body, html { margin: 0; padding: 0; background: white !important; }
          .no-print { display: none !important; }
          .print-doc { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; }
          .cover-page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
          .section-block { page-break-inside: avoid; margin-bottom: 24px; }
          .foto-grid { page-break-inside: avoid; }
          .page-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding: 6px 15mm; display: flex; justify-content: space-between; }
        }
        @media screen {
          .print-doc { max-width: 800px; margin: 0 auto; padding: 20px; background: white; }
          .cover-page { min-height: 90vh; border-bottom: 3px solid #e5e7eb; margin-bottom: 40px; padding-bottom: 40px; }
        }
      `}</style>

      {/* PORTADA */}
      <div className="cover-page" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ backgroundColor: TEAL, color: "white", padding: "32px 40px", borderRadius: "0 0 24px 24px", marginBottom: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Palex Medical</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Soluciones Preanalíticas</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, opacity: 0.7 }}>
              <div>Informe de visita</div>
              <div style={{ fontWeight: 600 }}>{visita.tipo}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "48px 40px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ borderLeft: `5px solid ${TEAL}`, paddingLeft: 24, marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Hospital / Centro
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111", margin: 0, lineHeight: 1.1 }}>
              {visita.hospital.nombre}
            </h1>
            <p style={{ fontSize: 16, color: "#6b7280", marginTop: 8 }}>
              {visita.hospital.ciudad}{visita.hospital.provincia ? `, ${visita.hospital.provincia}` : ""}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
            {[
              { label: "Fecha de visita", value: fechaLarga },
              { label: "Tecnico Palex", value: visita.usuario.nombre },
              { label: "Tipo de visita", value: visita.tipo },
              { label: "Estado", value: ESTADO_LABEL[visita.estado] },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f9fafb", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#f3f4f6", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Completitud del formulario</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: progreso === 100 ? "#10b981" : TEAL }}>
                {progreso}%
              </span>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${progreso}%`,
                backgroundColor: progreso === 100 ? "#10b981" : TEAL,
                borderRadius: 4,
              }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
              {completadas} de {sections.length} secciones completas
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 40px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af" }}>
          <span>Documento confidencial - Uso interno Palex Medical</span>
          <span>Generado el {fechaCorta}</span>
        </div>
      </div>

      {/* SECCIONES */}
      {sections.map((section, idx) => {
        const camposRellenos = section.fields.filter(f => {
          const v = datos[f.id]
          if (Array.isArray(v)) return v.length > 0
          if (typeof v === "number") return v > 0
          return v !== undefined && v !== null && v !== ""
        })
        const fotosSeccion = fotos[section.id] ?? []
        if (camposRellenos.length === 0 && fotosSeccion.length === 0) return null

        return (
          <div key={section.id} className="section-block"
            style={{ marginBottom: 32, pageBreakInside: idx > 3 ? "auto" : "avoid" }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${TEAL}`,
            }}>
              <span style={{ fontSize: 20 }}>{section.icon}</span>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>{section.title}</h2>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>{idx + 1}/{sections.length}</span>
            </div>

            {camposRellenos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {camposRellenos.map((f, fi) => {
                  const v = datos[f.id]
                  const display = Array.isArray(v) ? (v as string[]).join(" · ") : String(v)
                  return (
                    <div key={f.id} style={{
                      display: "flex", gap: 16, padding: "10px 12px",
                      background: fi % 2 === 0 ? "#f9fafb" : "white",
                      borderRadius: fi === 0 ? "8px 8px 0 0" : fi === camposRellenos.length - 1 ? "0 0 8px 8px" : "0",
                    }}>
                      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, width: 200, flexShrink: 0, paddingTop: 1 }}>
                        {f.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#111", flex: 1 }}>{display}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {fotosSeccion.length > 0 && (
              <div className="foto-grid" style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                  Fotografias ({fotosSeccion.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {fotosSeccion.map(foto => (
                    <div key={foto.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foto.data}
                        alt={foto.caption || foto.name}
                        style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }}
                      />
                      {foto.caption && (
                        <p style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>{foto.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* CHECKLIST DE PENDIENTES */}
      {(() => {
        const todos = (datos.todos as TodoItem[] | undefined) ?? []
        if (todos.length === 0) return null
        const pendientes = todos.filter(t => !t.done)
        const hechos = todos.filter(t => t.done)
        return (
          <div className="section-block" style={{ marginBottom: 32, pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${TEAL}` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>Pendientes de la visita</h2>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>
                {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""} · {hechos.length} completado{hechos.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {todos.map((todo, ti) => (
                <div key={todo.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px",
                  background: ti % 2 === 0 ? "#f9fafb" : "white",
                  borderRadius: ti === 0 ? "8px 8px 0 0" : ti === todos.length - 1 ? "0 0 8px 8px" : "0",
                  opacity: todo.done ? 0.6 : 1,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", border: `2px solid ${todo.done ? TEAL : "#d1d5db"}`,
                    backgroundColor: todo.done ? TEAL : "transparent",
                    flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {todo.done && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: 12, flex: 1,
                    textDecoration: todo.done ? "line-through" : "none",
                    color: todo.done ? "#9ca3af" : "#111",
                  }}>{todo.text}</span>
                  <span style={{ fontSize: 10, color: "#d1d5db", flexShrink: 0 }}>
                    {todo.done ? "Hecho" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="page-footer">
        <span>Palex Medical - Informe de visita preproyecto - {visita.hospital.nombre}</span>
        <span>Generado el {fechaCorta}</span>
      </div>
    </div>
  )
}
