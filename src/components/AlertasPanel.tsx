"use client"

import Link from "next/link"
import { useState } from "react"
import { TEAL } from "@/lib/brand"

export interface AlertaItem {
  key: string
  titulo: string
  sub: string
  href: string
  color: string
  bg: string
}

export function AlertasPanel({
  alertas,
  defaultShow = 5,
  variant = "proyectos",
}: {
  alertas: AlertaItem[]
  defaultShow?: number
  variant?: "admin" | "proyectos"
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? alertas : alertas.slice(0, defaultShow)
  const extra = alertas.length - defaultShow

  if (variant === "admin") {
    return (
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alertas.length > 0 ? "#fef3c7" : "#f0fdf4" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={alertas.length > 0 ? "#d97706" : "#16a34a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {alertas.length > 0
                  ? <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                  : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                }
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Acciones recomendadas</h2>
              <p className="text-xs text-gray-400">{alertas.length > 0 ? `${alertas.length} situación${alertas.length !== 1 ? "es" : ""} que requieren atención` : "Todo en orden"}</p>
            </div>
          </div>
          {alertas.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{alertas.length}</span>
          )}
        </div>
        {alertas.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-6 text-center">No hay alertas pendientes. ¡Buen trabajo!</p>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {visible.map(a => (
                <Link key={a.key} href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">{a.titulo}</p>
                    <p className="text-xs text-gray-400 truncate">{a.sub}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: a.bg, color: a.color }}>Ver</span>
                </Link>
              ))}
            </div>
            {extra > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full px-5 py-3 text-xs font-semibold hover:bg-gray-50 transition-colors border-t border-gray-50 flex items-center justify-center gap-1.5"
                style={{ color: TEAL }}
              >
                {expanded
                  ? <><ChevronUp />Ver menos</>
                  : <><ChevronDown />Ver {extra} alerta{extra !== 1 ? "s" : ""} más</>
                }
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  if (alertas.length === 0) return null
  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <p className="text-sm font-semibold text-gray-800">Acciones recomendadas</p>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">{alertas.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {visible.map(a => (
          <Link key={a.key} href={a.href} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
            <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: a.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{a.titulo}</p>
              <p className="text-xs text-gray-400 mt-0.5">{a.sub}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: a.bg, color: a.color }}>Ver</span>
          </Link>
        ))}
      </div>
      {extra > 0 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full px-5 py-3 text-xs font-semibold hover:bg-gray-50 transition-colors border-t border-gray-50 flex items-center justify-center gap-1.5"
          style={{ color: TEAL }}
        >
          {expanded
            ? <><ChevronUp />Ver menos</>
            : <><ChevronDown />Ver {extra} alerta{extra !== 1 ? "s" : ""} más</>
          }
        </button>
      )}
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
function ChevronUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}
