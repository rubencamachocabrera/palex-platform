import type { FormField, FormSection } from "@/lib/form-schema"
import type { VisitaData, FotosMap } from "./types"
import type { TodoItem } from "@/components/visitas/TodoChecklist"
import type { AudioNota } from "@/components/visitas/VoiceNotes"

// Evalúa si un campo debe mostrarse dado el estado actual del formulario
export function shouldShowField(field: FormField, datos: Record<string, unknown>): boolean {
  if (!field.showIf) return true
  const val = datos[field.showIf.field]
  return field.showIf.values.includes(val as string)
}

// Valida un campo requerido y devuelve el mensaje de error (o "")
export function validateField(field: FormField, value: unknown): string {
  if (!field.req) return ""
  if (Array.isArray(value) && value.length === 0) return "Este campo es obligatorio"
  if (typeof value === "number" && value === 0) return "Este campo es obligatorio"
  if (!value) return "Este campo es obligatorio"
  return ""
}

// ─── Progreso ──────────────────────────────────────────────────────────────────
export function calcProgress(section: FormSection, datos: Record<string, unknown>): number {
  // Solo contar campos visibles (respetando showIf), excluir subheaders
  const visibleFields = section.fields.filter(f => f.type !== 'subheader' && shouldShowField(f, datos))
  const reqFields = visibleFields.filter(f => f.req)
  const toCheck = reqFields.length > 0 ? reqFields : visibleFields
  if (toCheck.length === 0) return 100
  const filled = toCheck.filter(f => {
    const v = datos[f.id]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "number") return v > 0
    return v !== undefined && v !== null && v !== ""
  }).length
  return Math.round((filled / toCheck.length) * 100)
}

// ─── Vista Resumen ────────────────────────────────────────────────────────────
export function fmtResumenValue(type: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (Array.isArray(value)) return value.join(", ")
  if (type === "rating") return `${value}/5 ★`
  if (type === "date") {
    try { return new Date(value as string).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) }
    catch { return String(value) }
  }
  const s = String(value)
  return s.length > 90 ? s.slice(0, 90) + "…" : s
}

// ─── Export JSON ───────────────────────────────────────────────────────────────
export function exportarJSON(visita: VisitaData, datos: Record<string, unknown>, sections: FormSection[]) {
  const payload = {
    exportado: new Date().toISOString(),
    version: "1.0",
    visita: {
      id: visita.id,
      hospital: visita.hospital.nombre,
      ciudad: visita.hospital.ciudad,
      fecha: visita.fecha,
      tipo: visita.tipo,
      estado: visita.estado,
      tecnico: visita.usuario.nombre,
    },
    secciones: sections.map(s => ({
      id: s.id,
      titulo: s.title,
      campos: s.fields.reduce<Record<string, unknown>>((acc, f) => {
        const v = datos[f.id]
        if (v !== undefined && v !== null && v !== "") acc[f.label] = v
        return acc
      }, {}),
      fotos: ((datos.fotos as FotosMap)?.[s.id] ?? []).map(f => ({
        nombre: f.name,
        caption: f.caption,
        data: f.data,
      })),
    })),
    pendientes: ((datos.todos as TodoItem[]) ?? []).map(t => ({
      texto: t.text,
      hecho: t.done,
    })),
    notasDeVoz: ((datos.audioNotas as AudioNota[]) ?? []).map(n => ({
      duracion: n.duration,
      transcripcion: n.transcripcion ?? null,
      creado: new Date(n.createdAt).toISOString(),
      audio: n.blob,
    })),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const fecha = new Date(visita.fecha).toISOString().slice(0, 10)
  a.href = url
  a.download = `visita-${visita.hospital.nombre.replace(/\s+/g, "-").toLowerCase()}-${fecha}.json`
  a.click()
  URL.revokeObjectURL(url)
}
