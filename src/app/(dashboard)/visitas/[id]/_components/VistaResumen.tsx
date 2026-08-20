"use client"

import { useState } from "react"
import { TEAL } from "@/lib/brand"
import { IconArrowLeft, IconArrowRight, IconClipboard, IconCamera } from "@/components/ui/Icons"
import type { FormSection } from "@/lib/form-schema"
import type { TodoItem } from "@/components/visitas/TodoChecklist"
import { calcProgress, shouldShowField, fmtResumenValue } from "../helpers"
import { SECTION_ICON } from "./SectionIcon"
import { InlineFieldEditor } from "./InlineFieldEditor"
import { ESTADO_COLOR, ESTADO_LABEL } from "../types"
import type { VisitaData, FotosMap } from "../types"

// ─── Vista Resumen ────────────────────────────────────────────────────────────
export function VistaResumen({
  visita, datos, sections, fotosMap, score, scoreColor, scoreLabel,
  completadas, progreso, onClose, onGoToSection, onSetField,
}: {
  visita: VisitaData
  datos: Record<string, unknown>
  sections: FormSection[]
  fotosMap: FotosMap
  score: number; scoreColor: string; scoreLabel: string
  completadas: number; progreso: number
  onClose: () => void
  onGoToSection: (id: string) => void
  onSetField: (fieldId: string, value: unknown) => void
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const totalFotos = Object.values(fotosMap).reduce((a, b) => a + b.length, 0)
  const todos = (datos.todos as TodoItem[]) ?? []
  const todosHechos = todos.filter(t => t.done).length
  const allFotosSample = sections
    .flatMap(s => (fotosMap[s.id] ?? []).map(f => ({ ...f, seccion: s.title })))
    .slice(0, 12)

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors min-h-[36px] px-1"
          >
            <IconArrowLeft size={15} /> Volver al formulario
          </button>
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-sm font-semibold text-gray-800 truncate hidden sm:block">{visita.hospital.nombre}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR[visita.estado]}`}>
            {ESTADO_LABEL[visita.estado]}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-16">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Completado",    value: `${progreso}%`,           color: progreso === 100 ? "#10b981" : TEAL },
            { label: "Secciones",     value: `${completadas}/${sections.length}`, color: "" },
            { label: "Fotos",         value: String(totalFotos),        color: "" },
            { label: scoreLabel + " complejidad", value: String(score), color: scoreColor },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 text-center shadow-sm">
              <div className={`text-2xl font-bold tabular-nums leading-none mb-1 ${kpi.color ? "" : "text-gray-800"}`} style={kpi.color ? { color: kpi.color } : undefined}>{kpi.value}</div>
              <div className="text-xs text-gray-400">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Progreso global */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium">Progreso global</span>
            <span className="tabular-nums">{progreso}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
          </div>
          <div className="flex gap-1 mt-2.5">
            {sections.map(s => {
              const pct = calcProgress(s, datos)
              return (
                <button
                  key={s.id}
                  onClick={() => { onClose(); setTimeout(() => onGoToSection(s.id), 50) }}
                  title={`${s.title} — ${pct}%`}
                  className="flex-1 h-1.5 rounded-full transition-colors hover:opacity-70"
                  style={{ backgroundColor: pct === 100 ? "#10b981" : pct > 0 ? `${TEAL}80` : "#e5e7eb" }}
                />
              )
            })}
          </div>
        </div>

        {/* Grid de secciones */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {sections.map((section, i) => {
            const pct = calcProgress(section, datos)
            const nFotos = (fotosMap[section.id] ?? []).length
            const filledFields = section.fields
              .filter(f => shouldShowField(f, datos) && fmtResumenValue(f.type, datos[f.id]))
              .map(f => ({ label: f.label, value: fmtResumenValue(f.type, datos[f.id]) }))

            return (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                {/* Header tarjeta — click para editar inline */}
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="flex items-center gap-2.5 px-3.5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    pct === 100 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {SECTION_ICON[section.icon] ?? <IconClipboard size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      <span className="text-gray-300 mr-1 font-normal">{i + 1}.</span>{section.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {nFotos > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <IconCamera size={10} />{nFotos}
                      </span>
                    )}
                    <span className={`text-xs font-bold tabular-nums ${pct === 100 ? "text-green-500" : pct > 0 ? "text-amber-500" : "text-gray-300"}`}>
                      {pct}%
                    </span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className="text-gray-300 shrink-0 transition-transform duration-200"
                      style={{ transform: expandedSection === section.id ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {/* Campos rellenos — vista resumida */}
                {expandedSection !== section.id && (
                  <div className="px-3.5 py-3 flex-1 space-y-1.5">
                    {filledFields.length > 0 ? (
                      <>
                        {filledFields.slice(0, 5).map(f => (
                          <div key={f.label} className="flex gap-2 text-xs leading-tight">
                            <span className="text-gray-400 shrink-0 truncate" style={{ maxWidth: "45%" }}>{f.label}</span>
                            <span className="text-gray-700 font-medium flex-1 min-w-0 truncate">{f.value}</span>
                          </div>
                        ))}
                        {filledFields.length > 5 && (
                          <p className="text-xs text-gray-300 pt-0.5">+{filledFields.length - 5} campos más</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Sin datos aún</p>
                    )}
                  </div>
                )}

                {/* Formulario inline — edición rápida */}
                {expandedSection === section.id && (
                  <div className="px-3.5 py-3 flex-1 space-y-3 max-h-80 overflow-y-auto">
                    {section.fields
                      .filter(f => shouldShowField(f, datos))
                      .map(field => {
                        if (field.type === 'subheader') {
                          return <InlineFieldEditor key={field.id} field={field} value={undefined} onChange={() => {}} />
                        }
                        return (
                          <div key={field.id}>
                            <label htmlFor={field.id} className="text-[11px] font-medium text-gray-500 mb-1 block">
                              {field.label}{field.req && <span className="text-red-400 ml-0.5">*</span>}
                            </label>
                            <InlineFieldEditor
                              field={field}
                              value={datos[field.id]}
                              onChange={v => onSetField(field.id, v)}
                            />
                          </div>
                        )
                      })}
                  </div>
                )}

                {/* Footer tarjeta */}
                <button
                  onClick={() => { onClose(); setTimeout(() => onGoToSection(section.id), 50) }}
                  className="flex items-center gap-1 px-3.5 py-2 text-xs border-t border-gray-50 text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  <IconArrowRight size={11} /> Ir a esta sección
                </button>
              </div>
            )
          })}
        </div>

        {/* Pendientes */}
        {todos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
              <p className="text-xs font-semibold text-gray-700">Pendientes</p>
              <span className="ml-auto text-xs text-gray-400">{todosHechos}/{todos.length} hechos</span>
            </div>
            <div className="space-y-1.5">
              {todos.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    t.done ? "bg-green-500 border-green-500" : "border-gray-300"
                  }`}>
                    {t.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  <span className={t.done ? "line-through text-gray-300" : "text-gray-700"}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Galería */}
        {totalFotos > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <IconCamera size={13} />
              </span>
              <p className="text-xs font-semibold text-gray-700">Galería de fotos</p>
              <span className="ml-auto text-xs text-gray-400">{totalFotos} fotos</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {allFotosSample.map(foto => (
                <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.data} alt={foto.caption || foto.name} className="w-full h-full object-cover" />
                  {foto.caption && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                      <p className="text-white text-[9px] leading-tight line-clamp-2">{foto.caption}</p>
                    </div>
                  )}
                </div>
              ))}
              {totalFotos > 12 && (
                <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-medium">
                  +{totalFotos - 12}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
