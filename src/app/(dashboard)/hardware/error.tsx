"use client"

import { useEffect } from "react"
import { TEAL } from "@/lib/brand"

export default function HardwareError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[Hardware]", error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FEF3E5" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
          <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
          <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
          <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
          <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar hardware</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudo obtener el inventario. Intenta de nuevo.</p>
        {error.digest && <p className="text-xs text-gray-300 font-mono mt-2">ref: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: TEAL }}>
          Reintentar
        </button>
        <a href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
          Dashboard
        </a>
      </div>
    </div>
  )
}
