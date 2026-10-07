"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { InformeInlab } from "@/components/inlab/InformeInlab"
import { NexusLoader } from "@/components/ui/Skeleton"
import { decodificar, type Tarifa } from "@/lib/inlab/analytics"
import type { InlabPayload } from "@/lib/inlab/types"

interface Respuesta {
  hospital: { nombre: string; ciudad: string | null; provincia: string | null; camas: number | null }
  desde: string
  hasta: string
  dataset: InlabPayload
  tarifas: Tarifa[]
  incluirFacturacion: boolean
}

// /share/inlab/[token] — informe InLab público de solo lectura (sin auth; exento en middleware)
export default function ShareInlabPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<Respuesta | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/share/inlab/${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!r.ok) { setError(d?.error ?? "No se pudo cargar el informe"); return }
        setData(d)
      })
      .catch(() => setError("No se pudo cargar el informe"))
  }, [token])

  const ds = useMemo(() => (data ? decodificar(data.dataset) : null), [data])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="max-w-sm text-center">
          <p className="text-lg font-extrabold text-gray-900 dark:text-white">Informe no disponible</p>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      </main>
    )
  }
  if (!data || !ds) return <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><NexusLoader label="Cargando informe" /></main>

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 sm:py-10">
      <InformeInlab
        hospital={{ nombre: data.hospital.nombre, ciudad: data.hospital.ciudad }}
        rango={{ desde: data.desde, hasta: data.hasta }}
        ds={ds}
        tarifas={data.incluirFacturacion ? data.tarifas : null}
      />
    </main>
  )
}
