"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error inesperado</h1>
          <p className="text-gray-500 text-sm mb-6">Se ha producido un error grave. Intenta recargar.</p>
          <button onClick={reset} className="px-5 py-2.5 rounded-xl text-white text-sm font-medium bg-orange-400 hover:bg-orange-500 transition-colors">
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
