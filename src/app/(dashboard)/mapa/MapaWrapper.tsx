"use client"

import dynamic from "next/dynamic"
import { TEAL } from "@/lib/brand"
import type { HospitalMapa } from "@/components/MapaLeaflet"

const MapaLeaflet = dynamic(() => import("@/components/MapaLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div
        className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin"
        style={{ borderTopColor: TEAL }}
      />
    </div>
  ),
})

export default function MapaWrapper({ hospitales }: { hospitales: HospitalMapa[] }) {
  return <MapaLeaflet hospitales={hospitales} />
}
