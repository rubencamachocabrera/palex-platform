"use client"

/**
 * Página de error global (500 / errores no capturados).
 * Next.js App Router la activa cuando un componente lanza una excepción no capturada.
 * DEBE ser "use client" — recibe la prop `error` y `reset` del runtime.
 */

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-sm w-full">
        {/* Ilustración */}
        <div className="flex justify-center mb-8">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="120" rx="32" fill="#FEF3E5"/>
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
              fontSize="48" fontWeight="700" fill="#F7941D" fontFamily="system-ui">
              500
            </text>
            <circle cx="60" cy="88" r="4" fill="#F7941D" opacity="0.3"/>
          </svg>
        </div>

        {/* Logo Palex */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-teal-500">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="text-gray-700 font-semibold text-sm">Palex Medical</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Se ha producido un error inesperado. Puedes intentar recargar la página
          o volver al dashboard.
          {error.digest && (
            <span className="block mt-2 text-xs text-gray-300 font-mono">ref: {error.digest}</span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium bg-orange-400 hover:bg-orange-500 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium"
          >
            Ir al dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
