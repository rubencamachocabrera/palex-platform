"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { TEAL } from "@/lib/brand"
import type { Ruta } from "../_lib/types"
import { getRutas } from "../_lib/data-service"

const TransporteMapaLeaflet = dynamic(() => import("./MapaLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
    </div>
  ),
})

export function TabMapa() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { getRutas().then(d => { setRutas(d); setLoading(false) }) }, [])

  if (loading) return <div className="h-[560px] bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 560 }}>
      <TransporteMapaLeaflet rutas={rutas} />
    </div>
  )
}
