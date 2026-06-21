"use client"

import { useEffect } from "react"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ModuleError({ error, reset }: Props) {
  useEffect(() => { console.error("[Palex]", error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "#FEF3E5" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Error al cargar esta seccion</p>
      <p className="text-xs text-gray-400 mb-6 max-w-xs leading-relaxed">
        Algo salio mal. Puedes reintentar o volver al dashboard.
        {error.digest && <span className="block mt-1 font-mono text-gray-300">ref: {error.digest}</span>}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-colors cursor-pointer"
          style={{ backgroundColor: "#F7941D" }}
        >
          Reintentar
        </button>
        <a href="/dashboard" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Dashboard
        </a>
      </div>
    </div>
  )
}
