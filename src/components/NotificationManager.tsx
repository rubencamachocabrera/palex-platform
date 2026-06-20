"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconBell({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LS_DISMISSED = "palex_notif_dismissed"
const LS_SHOWN = "palex_notif_shown"
const POLL_INTERVAL = 60_000 // 60 seconds

// ── Helpers ───────────────────────────────────────────────────────────────────

function getShownIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(LS_SHOWN)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveShownIds(ids: Set<string>) {
  if (typeof window === "undefined") return
  try {
    // Keep only the last 200 IDs to avoid unbounded growth
    const arr = [...ids]
    const trimmed = arr.length > 200 ? arr.slice(arr.length - 200) : arr
    localStorage.setItem(LS_SHOWN, JSON.stringify(trimmed))
  } catch { /* localStorage full — ignore */ }
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(LS_DISMISSED) === "true"
  } catch {
    return false
  }
}

// ── Notification Item Type ────────────────────────────────────────────────────

interface NotifItem {
  tipo: string
  id: string
  titulo: string
  href: string
  mensaje: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationManager() {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const shownIdsRef = useRef<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check if Notification API is available
  const isSupported = typeof window !== "undefined" && "Notification" in window

  // ── Poll for notifications and show desktop alerts ──────────────────────────

  const pollNotifications = useCallback(async () => {
    if (!isSupported) return
    if (Notification.permission !== "granted") return

    try {
      const res = await fetch("/api/notificaciones")
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data?.items)) return

      const items: NotifItem[] = data.items
      const currentShown = shownIdsRef.current

      for (const item of items) {
        const key = `${item.tipo}_${item.id}`
        if (currentShown.has(key)) continue

        // Mark as shown immediately to avoid duplicates
        currentShown.add(key)

        // Show desktop notification
        try {
          const notif = new Notification(item.titulo, {
            body: item.mensaje,
            icon: "/logo-palex.png",
            tag: key,
          })
          notif.onclick = () => {
            window.focus()
            router.push(item.href)
            notif.close()
          }
        } catch {
          // Notification constructor can throw in some environments
        }
      }

      // Persist shown IDs
      saveShownIds(currentShown)
    } catch {
      // Network error — silently ignore, will retry next poll
    }
  }, [isSupported, router])

  // ── Start/stop polling ──────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (intervalRef.current) return
    // Run once immediately
    pollNotifications()
    intervalRef.current = setInterval(pollNotifications, POLL_INTERVAL)
  }, [pollNotifications])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSupported) return

    // Load previously shown IDs
    shownIdsRef.current = getShownIds()

    const perm = Notification.permission

    if (perm === "granted") {
      // Already granted — start polling immediately
      startPolling()
    } else if (perm === "default" && !isDismissed()) {
      // Not yet asked and not dismissed — show banner
      setShowBanner(true)
    }
    // If "denied" — do nothing

    return () => {
      stopPolling()
    }
  }, [isSupported, startPolling, stopPolling])

  // ── Handle permission request ───────────────────────────────────────────────

  async function requestPermission() {
    if (!isSupported) return
    try {
      const result = await Notification.requestPermission()
      setShowBanner(false)
      if (result === "granted") {
        startPolling()
      }
    } catch {
      setShowBanner(false)
    }
  }

  function dismissBanner() {
    setShowBanner(false)
    try {
      localStorage.setItem(LS_DISMISSED, "true")
    } catch { /* ignore */ }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-35 max-w-xs w-full animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ zIndex: 35 }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-4">
        <div className="flex items-start gap-3">
          {/* Bell icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#f0fdfa", color: TEAL }}
          >
            <IconBell size={20} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Activar notificaciones
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Recibe alertas de tareas, visitas pendientes y menciones.
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={dismissBanner}
            className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={requestPermission}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 min-h-[44px]"
            style={{ backgroundColor: TEAL }}
          >
            <IconBell size={16} />
            Activar
          </button>
          <button
            onClick={dismissBanner}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            No gracias
          </button>
        </div>
      </div>
    </div>
  )
}
