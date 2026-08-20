"use client"

import { IconCamera } from "@/components/ui/Icons"
import { TEAL, TEAL_DARK } from "@/lib/brand"
import type { FormSection } from "@/lib/form-schema"
import { calcProgress } from "../helpers"
import type { FotosMap } from "../types"

// ─── Navegación lateral de secciones ─────────────────────────────────────────
export function SectionNav({ sections, datos, openSection, onSelect, fotosMap }: {
  sections: FormSection[]
  datos: Record<string, unknown>
  openSection: string
  onSelect: (id: string) => void
  fotosMap: FotosMap
}) {
  return (
    <nav className="space-y-0.5">
      {sections.map((s, i) => {
        const pct = calcProgress(s, datos)
        const isActive = openSection === s.id
        const nFotos = (fotosMap[s.id] ?? []).length
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm"
            style={isActive
              ? { backgroundColor: "#E6F7F6", color: TEAL_DARK }
              : { color: "#6b7280" }}
          >
            {/* Mini progress ring */}
            <span className="shrink-0 relative w-5 h-5">
              <svg width="20" height="20" viewBox="0 0 20 20" className="rotate-[-90deg]">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke={pct === 100 ? "#10b981" : isActive ? TEAL : "#d1d5db"}
                  strokeWidth="2.5"
                  strokeDasharray={`${(pct / 100) * 50.27} 50.27`}
                  strokeLinecap="round"
                />
              </svg>
              {pct === 100 && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </span>
            <span className="flex-1 min-w-0 truncate font-medium text-xs leading-tight">
              <span className="mr-1 opacity-60">{i + 1}.</span>
              {s.title}
            </span>
            {nFotos > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-300 shrink-0">
                <IconCamera size={11} />{nFotos}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
