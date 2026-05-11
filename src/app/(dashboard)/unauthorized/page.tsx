/**
 * Página 403 — acceso denegado.
 * Se accede redirigiendo a /unauthorized cuando el middleware detecta
 * que el usuario no tiene el rol necesario para la ruta solicitada.
 *
 * Ejemplo de uso en middleware.ts:
 *   return NextResponse.redirect(new URL("/unauthorized", req.url))
 */

import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        {/* Ilustración */}
        <div className="flex justify-center mb-8">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="120" rx="32" fill="#FEF2F2"/>
            <circle cx="60" cy="50" r="18" fill="#FECACA"/>
            <rect x="44" y="52" width="32" height="22" rx="4" fill="#FCA5A5"/>
            <rect x="52" y="44" width="16" height="12" rx="8" fill="none" stroke="#F87171" strokeWidth="3"/>
            <circle cx="60" cy="62" r="3" fill="#EF4444"/>
            <line x1="60" y1="64" x2="60" y2="68" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
            <text x="50%" y="86%" dominantBaseline="middle" textAnchor="middle"
              fontSize="13" fontWeight="600" fill="#EF4444" fontFamily="system-ui">
              403
            </text>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          No tienes permisos para acceder a esta sección.
          Si crees que es un error, contacta con el administrador del sistema.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium bg-teal-500 hover:bg-teal-600 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            Ir al dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium"
          >
            ← Volver atrás
          </Link>
        </div>
      </div>
    </div>
  )
}
