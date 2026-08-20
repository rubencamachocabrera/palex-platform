"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"

function getPosicion(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este dispositivo no soporta geolocalizacion"))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    })
  })
}

function mensajeErrorGeo(err: GeolocationPositionError | Error): string {
  if (!(err instanceof GeolocationPositionError)) return err.message
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Has bloqueado el acceso a tu ubicacion. Activalo en los ajustes del navegador."
    case err.POSITION_UNAVAILABLE:
      return "No se ha podido determinar tu ubicacion."
    case err.TIMEOUT:
      return "La busqueda de ubicacion ha tardado demasiado. Intentalo de nuevo."
    default:
      return "Error al obtener tu ubicacion."
  }
}

export function GeolocationCheckin() {
  const router = useRouter()
  const { success, error: toastError, info } = useToast()
  const [buscando, setBuscando] = useState(false)

  async function checkinCercano() {
    setBuscando(true)
    try {
      const pos = await getPosicion()
      const { latitude, longitude } = pos.coords

      const r = await fetch(`/api/hospitales/cercano?lat=${latitude}&lng=${longitude}`)
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { error?: string }
        info(d.error ?? "No hay ningun hospital cercano")
        return
      }
      const hospital = await r.json() as { id: string; nombre: string; ciudad: string; distanciaKm: number; exacta: boolean }

      const c = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: hospital.id }),
      })
      if (!c.ok) {
        const d = await c.json().catch(() => ({})) as { error?: string }
        toastError(d.error ?? "Error al hacer check-in")
        return
      }

      const precision = hospital.exacta ? `${hospital.distanciaKm} km` : "ubicacion aproximada"
      success(`Check-in en ${hospital.nombre} (${precision})`)
      router.push(`/hospitales/${hospital.id}`)
    } catch (err) {
      toastError(mensajeErrorGeo(err as GeolocationPositionError | Error))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <button
      onClick={checkinCercano}
      disabled={buscando}
      className="w-full flex items-center gap-3 px-4 py-3.5 mb-6 rounded-xl border-2 border-teal-100 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/30 hover:border-teal-200 dark:hover:border-teal-800 transition-all disabled:opacity-60 disabled:cursor-wait text-left"
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: TEAL }}
      >
        {buscando ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
          {buscando ? "Buscando hospital cercano..." : "Check-in por ubicacion"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Detecta automaticamente el hospital mas cercano</p>
      </div>
    </button>
  )
}
