"use client"

/**
 * Informe InLab de solo lectura e imprimible. Lo usan el enlace público
 * (/share/inlab/[token]) y la "Vista imprimible" del dashboard.
 */
import { useState } from "react"
import { BrandLockup } from "@/components/ui/BrandLockup"
import { IconPrint, IconShieldAlert } from "@/components/ui/Icons"
import { FILTROS_VACIOS, type Dataset, type Filtros, type Rango, type Tarifa } from "@/lib/inlab/analytics"
import { fmtDia } from "./charts"
import { Panel } from "./ui"
import { TablaFacturacion, VistaCalidad, VistaConsumo, VistaResumen, VistaTiempos } from "./Vistas"

/** Estilos de impresión: solo se imprime el contenedor .inlab-print. */
export const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 1.2cm; }
  body * { visibility: hidden !important; }
  .inlab-print, .inlab-print * { visibility: visible !important; }
  .inlab-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; overflow: visible !important; background: #fff !important; }
  .inlab-no-print { display: none !important; }
  .inlab-print .card, .inlab-print .stat-card, .inlab-print section { break-inside: avoid; box-shadow: none !important; }
}`

export function InformeInlab({ hospital, rango, ds, tarifas, interactivo = true, acciones, filtrosIniciales }: {
  hospital: { nombre: string; ciudad?: string | null }
  rango: Rango
  ds: Dataset
  tarifas?: Tarifa[] | null
  interactivo?: boolean
  acciones?: React.ReactNode
  /** Filtros con los que se abre (p. ej. las work areas seleccionadas en el dashboard) */
  filtrosIniciales?: Filtros
}) {
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales ?? FILTROS_VACIOS)
  const onFiltro = interactivo ? (p: Partial<Filtros>) => setFiltros(f => ({ ...f, ...p })) : undefined
  const activos = [filtros.areas.length > 0 && `Áreas: ${filtros.areas.join(", ")}`, filtros.consumible && `Tubo o etiqueta: ${filtros.consumible}`, filtros.puesto && `Puesto: ${filtros.puesto}`, filtros.urgencia !== "todas" && `Prioridad: ${filtros.urgencia}`].filter(Boolean) as string[]
  const props = { ds, rango, filtros, onFiltro }

  return (
    <div className="inlab-print mx-auto max-w-6xl space-y-6">
      <style>{PRINT_CSS}</style>
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <BrandLockup />
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700">
            <p className="kpi-label text-teal-700 dark:text-teal-400">Informe Inteligencia InLab</p>
            <h1 className="text-lg font-extrabold tracking-[-0.02em] text-gray-900 dark:text-white">{hospital.nombre}</h1>
            <p className="text-xs text-gray-400">{hospital.ciudad ? `${hospital.ciudad} · ` : ""}{fmtDia(rango.desde, { day: "numeric", month: "long", year: "numeric" })} — {fmtDia(rango.hasta, { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <div className="inlab-no-print flex flex-wrap items-center gap-2">
          {acciones}
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"><IconPrint size={16} />Imprimir / PDF</button>
        </div>
      </header>

      {activos.length > 0 && (
        <div className="inlab-no-print flex flex-wrap items-center gap-2 text-xs">
          {activos.map(a => <span key={a} className="rounded-full bg-teal-50 px-3 py-1 font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">{a}</span>)}
          <button type="button" onClick={() => setFiltros(FILTROS_VACIOS)} className="font-bold text-teal-700 dark:text-teal-300">Quitar filtros</button>
        </div>
      )}

      <VistaResumen {...props} />
      <h2 className="pt-2 text-sm font-extrabold uppercase tracking-[.14em] text-gray-400">Consumo y demanda</h2>
      <VistaConsumo {...props} />
      <h2 className="pt-2 text-sm font-extrabold uppercase tracking-[.14em] text-gray-400">Flujo y tiempos</h2>
      <VistaTiempos {...props} />
      <h2 className="pt-2 text-sm font-extrabold uppercase tracking-[.14em] text-gray-400">Incidencias y calidad</h2>
      <VistaCalidad {...props} />
      {tarifas && tarifas.length > 0 && (
        <Panel eyebrow="Modelo comercial" titulo="Consumo facturable"><TablaFacturacion {...props} tarifas={tarifas} /></Panel>
      )}

      <footer className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 text-[11px] leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
        <IconShieldAlert size={15} className="mt-0.5 shrink-0 text-teal-600" />
        Informe generado por Palex Medical a partir de totales diarios agregados de InLab. No contiene datos identificativos de pacientes. Generado el {new Date().toLocaleString("es-ES")}.
      </footer>
    </div>
  )
}
