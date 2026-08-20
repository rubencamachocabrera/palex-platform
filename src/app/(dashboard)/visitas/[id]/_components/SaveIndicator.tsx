"use client"

import { useEffect, useState } from "react"

// ─── Icono de guardado estilo Google Docs ─────────────────────────────────────
export function SaveIndicator({ saving, pendiente, savedAt, error }: {
  saving: boolean; pendiente: boolean; savedAt: Date | null; error: boolean
}) {
  const [, tick] = useState(0)

  // Re-renderiza cada 15s para actualizar el tiempo relativo
  useEffect(() => {
    if (!savedAt) return
    const t = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(t)
  }, [savedAt])

  function tiempoRelativo() {
    if (!savedAt) return ""
    const s = Math.round((Date.now() - savedAt.getTime()) / 1000)
    if (s < 5)  return "ahora mismo"
    if (s < 60) return `hace ${s}s`
    const m = Math.round(s / 60)
    return m === 1 ? "hace 1 min" : `hace ${m} min`
  }

  if (saving) return (
    <span className="flex items-center gap-1.5 text-gray-400">
      <span className="w-3 h-3 border border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
      <span className="hidden sm:inline">Guardando</span>
    </span>
  )
  if (error) return (
    <span className="flex items-center gap-1 text-red-500 font-medium">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className="hidden sm:inline">Error al guardar</span>
      <span className="sm:hidden">Error</span>
    </span>
  )
  if (pendiente) return <span className="text-amber-500 font-medium">Sin guardar</span>
  if (savedAt) return (
    <span className="flex items-center gap-1 text-green-500 font-medium">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span className="hidden sm:inline">Guardado {tiempoRelativo()}</span>
      <span className="sm:hidden">Guardado</span>
    </span>
  )
  return <span className="text-gray-300">Sin cambios</span>
}
