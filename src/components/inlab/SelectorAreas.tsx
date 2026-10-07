"use client"

/**
 * Selector de work areas de InLab. Filtra TODAS las vistas (resumen, consumo,
 * tiempos, calidad, facturación). Selección vacía = todas las áreas.
 *
 *   · clic en un área       → la añade o la quita de la selección
 *   · doble clic / "solo"   → deja solo esa área
 *   · atajos de grupo       → Extracciones, Urgencias, Plantas…
 */
import { useMemo } from "react"
import { alternarArea, etiquetaArea, grupoArea, volumenPorArea, type Dataset, type Filtros, type GrupoArea, type Rango } from "@/lib/inlab/analytics"
import { fmtN } from "@/components/inlab/charts"
import { IconCheck, IconRefreshCw } from "@/components/ui/Icons"

const fmtK = (n: number) => (n >= 10000 ? `${fmtN(n / 1000, n >= 100000 ? 0 : 1)} k` : fmtN(n))
const ORDEN_GRUPOS: GrupoArea[] = ["Extracciones", "Urgencias", "Plantas", "Laboratorio", "Otras"]

export function SelectorAreas({ ds, rango, filtros, onChange }: {
  ds: Dataset
  rango: Rango
  filtros: Filtros
  onChange: (areas: string[]) => void
}) {
  const vol = useMemo(() => volumenPorArea(ds, rango, filtros), [ds, rango, filtros])
  const total = useMemo(() => [...vol.values()].reduce((n, v) => n + v.registros, 0), [vol])
  const areas = useMemo(
    () => [...ds.areas].sort((a, b) => (vol.get(b)?.registros ?? 0) - (vol.get(a)?.registros ?? 0) || a.localeCompare(b, "es")),
    [ds.areas, vol],
  )
  const grupos = useMemo(() => {
    const m = new Map<GrupoArea, string[]>()
    for (const a of ds.areas) { const g = grupoArea(a); m.set(g, [...(m.get(g) ?? []), a]) }
    return ORDEN_GRUPOS.filter(g => m.has(g)).map(g => ({ grupo: g, areas: m.get(g)! }))
  }, [ds.areas])

  const sel = filtros.areas
  const todas = sel.length === 0
  const grupoActivo = (lista: string[]) => !todas && lista.length === sel.length && lista.every(a => sel.includes(a))
  const resumen = todas ? `Todas (${ds.areas.length})` : `${sel.length} de ${ds.areas.length}`
  const volSel = todas ? total : sel.reduce((n, a) => n + (vol.get(a)?.registros ?? 0), 0)

  return (
    <section aria-label="Work areas" className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="kpi-label text-gray-500">Work areas</span>
          <span className="text-xs font-extrabold text-gray-800 dark:text-white">{resumen}</span>
          <span className="text-[11px] text-gray-400">· {fmtN(volSel)} registros{total ? ` (${fmtN((volSel / total) * 100, 1)} %)` : ""}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Atajos de selección">
          <button type="button" onClick={() => onChange([])} aria-pressed={todas}
            className={`min-h-[32px] rounded-lg px-2.5 text-[11px] font-bold transition-colors ${todas ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-gray-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
            Todas
          </button>
          {grupos.length > 1 && grupos.map(g => (
            <button key={g.grupo} type="button" onClick={() => onChange(grupoActivo(g.areas) ? [] : g.areas)} aria-pressed={grupoActivo(g.areas)}
              title={g.areas.map(etiquetaArea).join(", ")}
              className={`min-h-[32px] rounded-lg px-2.5 text-[11px] font-bold transition-colors ${grupoActivo(g.areas) ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
              {g.grupo}{g.areas.length > 1 ? ` (${g.areas.length})` : ""}
            </button>
          ))}
          {!todas && (
            <button type="button" onClick={() => onChange(ds.areas.filter(a => !sel.includes(a)))} title="Seleccionar las áreas no seleccionadas"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/30">
              <IconRefreshCw size={11} />Invertir
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Áreas (clic para añadir o quitar, doble clic para dejar solo una)">
        {areas.map(a => {
          const v = vol.get(a)?.registros ?? 0
          const activa = !todas && sel.includes(a)
          const incluida = todas || activa
          return (
            <button
              key={a}
              type="button"
              aria-pressed={activa}
              onClick={e => onChange(e.altKey ? [a] : alternarArea(sel, a, ds.areas))}
              onDoubleClick={() => onChange([a])}
              title={`${a}: ${fmtN(v)} registros${total ? ` (${fmtN((v / total) * 100, 1)} %)` : ""}. Clic: ${activa ? "quitar" : "añadir"} · doble clic: solo esta`}
              className={`group inline-flex min-h-[36px] items-center gap-2 rounded-xl border px-2.5 text-left transition-all ${activa
                ? "border-teal-500 bg-teal-50 text-teal-900 shadow-[0_0_0_1px_rgba(0,169,157,.25)] dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-100"
                : todas
                  ? "border-slate-200 bg-white text-gray-700 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  : "border-dashed border-slate-200 bg-transparent text-gray-400 hover:border-teal-300 hover:text-gray-700 dark:border-slate-700 dark:text-slate-500 dark:hover:text-slate-200"} ${v === 0 ? "opacity-50" : ""}`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border ${activa ? "border-teal-600 bg-teal-600 text-white" : incluida ? "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40" : "border-slate-300 dark:border-slate-600"}`}>
                {activa && <IconCheck size={10} />}
              </span>
              <span className="text-xs font-bold">{etiquetaArea(a)}</span>
              <span className="text-[10px] tabular-nums text-gray-400">{fmtK(v)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
