"use client"

/**
 * Esqueletos de Inteligencia InLab con la silueta de cada vista (mismas rejillas y alturas
 * que Vistas.tsx): al entrar los datos no salta el layout. Entrada escalonada suave y un
 * NexusLoader discreto que solo aparece si la carga pasa de ~400 ms (CSS, sin JS).
 */
import { NexusLoader } from "@/components/ui/Skeleton"

type Tipo = "resumen" | "consumo" | "tiempos" | "calidad" | "comparar" | "facturacion" | "cargas"

const Bloque = ({ className = "" }: { className?: string }) => <div aria-hidden="true" className={`skeleton-shimmer rounded-md ${className}`} />

function PanelEsq({ alto, lineas = 0, className = "" }: { alto: number; lineas?: number; className?: string }) {
  return (
    <div className={`card p-5 sm:p-6 ${className}`}>
      <Bloque className="mb-2 h-2.5 w-20 rounded-full" />
      <Bloque className="mb-5 h-4 w-48 max-w-full rounded-full" />
      {lineas > 0
        ? <div className="space-y-3">{Array.from({ length: lineas }, (_, i) => <div key={i}><Bloque className="mb-1.5 h-2.5 rounded-full" /><Bloque className="h-2 rounded-full" /></div>)}</div>
        : <div aria-hidden="true" className="skeleton-shimmer w-full rounded-xl" style={{ height: alto }} />}
    </div>
  )
}

function KpisEsq() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card p-4 sm:p-5">
          <Bloque className="mb-4 h-10 w-10 rounded-xl" />
          <Bloque className="h-7 w-24 rounded-lg" />
          <Bloque className="mt-3 h-2.5 w-28 rounded-full" />
          <Bloque className="mt-2 h-2 w-36 max-w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EsqueletoVista({ tipo, etiqueta }: { tipo: Tipo; etiqueta?: string }) {
  let cuerpo: React.ReactNode
  switch (tipo) {
    case "consumo":
      cuerpo = <>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><PanelEsq alto={0} lineas={6} /><PanelEsq alto={0} lineas={6} /></div>
        <PanelEsq alto={220} />
        <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><PanelEsq alto={170} /><PanelEsq alto={170} /></div>
      </>
      break
    case "tiempos":
      cuerpo = <>
        <KpisEsq />
        <div className="grid gap-5 lg:grid-cols-2"><PanelEsq alto={0} lineas={5} /><PanelEsq alto={0} lineas={2} /></div>
        <PanelEsq alto={220} />
      </>
      break
    case "calidad":
      cuerpo = <>
        <KpisEsq />
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><PanelEsq alto={170} /><PanelEsq alto={220} /></div>
        <div className="grid gap-5 lg:grid-cols-3"><PanelEsq alto={0} lineas={4} /><PanelEsq alto={0} lineas={4} /><PanelEsq alto={0} lineas={4} /></div>
      </>
      break
    case "facturacion":
    case "cargas":
    case "comparar":
      cuerpo = <><PanelEsq alto={160} /><PanelEsq alto={0} lineas={6} /></>
      break
    default:
      cuerpo = <>
        <KpisEsq />
        <Bloque className="h-12 w-full rounded-xl" />
        <div aria-hidden="true" className="h-56 rounded-2xl bg-[#102a43]/90 dark:bg-[#102a43]/60" />
        <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><PanelEsq alto={220} /><PanelEsq alto={0} lineas={6} /></div>
      </>
  }
  return (
    <div className="inlab-esqueleto relative space-y-5" aria-busy="true">
      {etiqueta && <div className="inlab-esqueleto-loader"><NexusLoader label={etiqueta} /></div>}
      {cuerpo}
    </div>
  )
}
