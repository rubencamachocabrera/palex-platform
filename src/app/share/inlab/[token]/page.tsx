"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { BrandLockup } from "@/components/ui/BrandLockup"
import { NexusLoader } from "@/components/ui/Skeleton"
import { IconLock } from "@/components/ui/Icons"
import { decodificar } from "@/lib/inlab/analytics"
import type { InlabPayload } from "@/lib/inlab/types"
import { InformePublico, type DatosInformePublico } from "@/components/inlab/share/InformePublico"
import s from "@/components/inlab/share/share.module.css"

type Respuesta = DatosInformePublico & { dataset: InlabPayload }

// /share/inlab/[token] — informe InLab público, interactivo y de solo lectura (sin auth; exento en middleware)
export default function ShareInlabPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<Respuesta | null>(null)
  const [error, setError] = useState<{ texto: string; motivo?: string } | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/share/inlab/${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        if (!r.ok) { setError({ texto: d?.error ?? "No se pudo cargar el informe", motivo: d?.motivo }); return }
        setData(d)
      })
      .catch(() => { if (vivo) setError({ texto: "No se pudo cargar el informe. Comprueba tu conexión." }) })
    return () => { vivo = false }
  }, [token])

  const ds = useMemo(() => (data ? decodificar(data.dataset) : null), [data])

  if (error) {
    return (
      <main className={`${s.ink} relative flex min-h-screen items-center justify-center px-6 py-12`}>
        <span className={s.aurora} style={{ width: 480, height: 480, left: "-15%", top: "-20%", background: "#00A99D" }} />
        <div className={`${s.rise} max-w-sm text-center`}>
          <div className="flex justify-center"><BrandLockup size="lg" /></div>
          <span className="mx-auto mt-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[.07] text-teal-200"><IconLock size={24} /></span>
          <h1 className="mt-5 text-xl font-extrabold tracking-[-.02em] text-white">{error.motivo ? "Este informe ya no está disponible" : "Informe no disponible"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{error.texto}</p>
          {error.motivo && <p className="mt-4 text-xs leading-5 text-slate-400">Pide un enlace nuevo a tu contacto de Palex Medical.</p>}
        </div>
      </main>
    )
  }
  if (!data || !ds) {
    return <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]"><NexusLoader label="Preparando el informe" /></main>
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-10">
      <InformePublico datos={data} ds={ds} />
    </div>
  )
}
