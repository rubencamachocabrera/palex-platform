"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
      <div className="text-center max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="120" rx="32" fill="#E6F7F6" className="dark:fill-teal-950/30"/>
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
              fontSize="48" fontWeight="700" fill="#00A99D" fontFamily="system-ui">
              404
            </text>
            <circle cx="60" cy="88" r="4" fill="#00A99D" opacity="0.3"/>
          </svg>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-teal-500">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">Palex Medical</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Página no encontrada</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
          La dirección que intentas acceder no existe o ha sido movida.
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
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-medium cursor-pointer"
          >
            &larr; Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}
