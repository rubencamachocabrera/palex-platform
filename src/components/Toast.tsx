"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning"

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider")
  return ctx
}

// ─── Item individual ──────────────────────────────────────────────────────────

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(t.id), 280)
  }, [t.id, onRemove])

  useEffect(() => {
    const duration = t.duration ?? 4000
    timerRef.current = setTimeout(dismiss, duration)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [dismiss, t.duration])

  const STYLES: Record<ToastType, { tile: string; icon: string; bar: string }> = {
    success: { tile: "bg-emerald-50 text-emerald-600", icon: checkIcon, bar: "#10b981" },
    error:   { tile: "bg-red-50 text-red-600",         icon: xIcon,     bar: "#ef4444" },
    warning: { tile: "bg-amber-50 text-amber-600",     icon: warnIcon,  bar: "#f59e0b" },
    info:    { tile: "bg-teal-50 text-teal-700",       icon: infoIcon,  bar: "#00A99D" },
  }

  const s = STYLES[t.type]

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        nexus-toast relative overflow-hidden flex items-center gap-3 pl-2.5 pr-3 py-2.5 rounded-2xl
        ${exiting ? "animate-in toast-out duration-300" : "animate-in toast-in duration-400"}
        min-w-[280px] max-w-[380px] cursor-pointer select-none
      `}
      onClick={dismiss}
    >
      <span className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${s.tile}`} dangerouslySetInnerHTML={{ __html: s.icon }} />
      <p className="text-sm font-medium text-gray-800 flex-1 leading-snug">{t.message}</p>
      <button
        onClick={dismiss}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Cerrar"
        dangerouslySetInnerHTML={{ __html: closeIcon }}
      />
      {/* Temporizador visual: se vacía durante la vida del toast */}
      <span
        aria-hidden="true"
        className="toast-timer absolute left-0 bottom-0 h-[2px] w-full"
        style={{ backgroundColor: s.bar, animationDuration: `${t.duration ?? 4000}ms` }}
      />
    </div>
  )
}

// ─── SVG icons inline (stroke, 16x16) ────────────────────────────────────────

const checkIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
const xIcon     = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
const warnIcon  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
const infoIcon  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
const closeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }])
  }, [])

  const value: ToastContextValue = {
    toast:   add,
    success: (m) => add(m, "success"),
    error:   (m) => add(m, "error"),
    info:    (m) => add(m, "info"),
    warning: (m) => add(m, "warning"),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal de toasts — bottom-right */}
      <div
        className="fixed bottom-24 right-3 left-3 sm:left-auto md:bottom-6 sm:right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none"
        aria-label="Notificaciones"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
