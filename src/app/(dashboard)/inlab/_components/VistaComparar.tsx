"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { TEAL } from "@/lib/brand"
import { Skeleton } from "@/components/ui/Skeleton"
import { BarList, fmtMin, fmtN } from "@/components/inlab/charts"
import { Nota, Panel, Segmentado } from "@/components/inlab/ui"
import type { Rango } from "@/lib/inlab/analytics"

interface Fila {
  hospitalId: string; nombre: string; ciudad: string; camas: number | null
  dias: number; registros: number; unidades: number; urgentes: number; ordenes: number | null; eventos: number
  p50Total: number | null; p90Total: number | null
}

const fetcherBenchmark = (url: string): Promise<Fila[]> =>
  fetch(url).then(r => (r.ok ? r.json() : { filas: [] })).then(d => (Array.isArray(d?.filas) ? d.filas : [])).catch(() => [])

type Metrica ="volumenDia" | "porCama" | "urgentes" | "tasa" | "p50"

const METRICAS: { value: Metrica; label: string; desc: string }[] = [
  { value: "volumenDia", label: "Registros/día", desc: "Volumen medio diario (normaliza periodos de distinta duración)." },
  { value: "porCama", label: "Por cama", desc: "Registros por cama y día (solo hospitales con nº de camas informado)." },
  { value: "urgentes", label: "% urgente", desc: "Porcentaje de actividad urgente." },
  { value: "tasa", label: "Incidencias ‰", desc: "Eventos del fichero por cada 1.000 registros." },
  { value: "p50", label: "Ciclo (mediana)", desc: "Mediana del ciclo completo (primer → último hito disponible)." },
]

function valor(f: Fila, m: Metrica): number | null {
  if (!f.dias) return null
  switch (m) {
    case "volumenDia": return f.registros / f.dias
    case "porCama": return f.camas ? f.registros / f.dias / f.camas : null
    case "urgentes": return f.registros ? (f.urgentes / f.registros) * 100 : null
    case "tasa": return f.registros ? (f.eventos / f.registros) * 1000 : null
    case "p50": return f.p50Total
  }
}

const formato = (m: Metrica) => (v: number) => m === "p50" ? fmtMin(v) : m === "urgentes" ? `${fmtN(v, 1)} %` : m === "porCama" || m === "tasa" ? fmtN(v, 2) : fmtN(v)

export function VistaComparar({ rango, seleccionados }: { rango: Rango; seleccionados: string[] }) {
  const [metrica, setMetrica] = useState<Metrica>("volumenDia")
  // SWR: volver a la pestaña o a un periodo ya visto no repite la petición
  const { data } = useSWR(`/api/inlab/benchmark?desde=${rango.desde}&hasta=${rango.hasta}`, fetcherBenchmark, { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 60_000 })
  const filas = data ?? null

  const ordenadas = useMemo(() => (filas ?? [])
    .map(f => ({ f, v: valor(f, metrica) }))
    .filter((x): x is { f: Fila; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v), [filas, metrica])
  const media = ordenadas.length ? ordenadas.reduce((s, x) => s + x.v, 0) / ordenadas.length : null

  if (filas === null) return <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
  const info = METRICAS.find(m => m.value === metrica)!

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="Benchmark"
        titulo="Comparar hospitales"
        texto={`${info.desc} Periodo seleccionado; incluye todos los hospitales de tu ámbito con datos cargados.`}
        accion={<Segmentado etiqueta="Métrica" valor={metrica} onChange={setMetrica} opciones={METRICAS.map(m => ({ value: m.value, label: m.label }))} />}
      >
        {filas.length < 2 && <div className="mb-4"><Nota>Para comparar hace falta cargar datos de al menos dos hospitales. Con uno solo se muestra como referencia.</Nota></div>}
        <BarList
          items={ordenadas.map(({ f, v }) => ({ clave: f.hospitalId, label: `${f.nombre}${f.ciudad ? ` · ${f.ciudad}` : ""}`, valor: v, color: seleccionados.includes(f.hospitalId) ? TEAL : "#94A3B8", sub: `${fmtN(f.dias)} días con datos${f.camas ? ` · ${fmtN(f.camas)} camas` : ""}` }))}
          formato={formato(metrica)}
          limite={20}
        />
        {media !== null && ordenadas.length > 1 && <p className="mt-3 text-[11px] text-gray-400">Media del grupo: <strong className="text-gray-700 dark:text-gray-200">{formato(metrica)(media)}</strong>. En teal, los hospitales seleccionados arriba.</p>}
      </Panel>

      <Panel eyebrow="Detalle" titulo="Tabla comparativa">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wider text-gray-400">
              <tr>
                <th scope="col" className="py-2 pr-3">Hospital</th>
                <th scope="col" className="px-2 py-2 text-right">Días</th>
                <th scope="col" className="px-2 py-2 text-right">Registros/día</th>
                <th scope="col" className="px-2 py-2 text-right">Por cama/día</th>
                <th scope="col" className="px-2 py-2 text-right">% urgente</th>
                <th scope="col" className="px-2 py-2 text-right">Incid. ‰</th>
                <th scope="col" className="px-2 py-2 text-right">Ciclo P50</th>
                <th scope="col" className="px-2 py-2 text-right">Ciclo P90</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.hospitalId} className={`border-t border-slate-100 dark:border-slate-700 ${seleccionados.includes(f.hospitalId) ? "bg-teal-50/40 dark:bg-teal-950/15" : ""}`}>
                  <td className="py-2 pr-3 font-semibold text-gray-800 dark:text-gray-100">{f.nombre}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtN(f.dias)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtN(valor(f, "volumenDia"))}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtN(valor(f, "porCama"), 2)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtN(valor(f, "urgentes"), 1)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtN(valor(f, "tasa"), 2)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtMin(f.p50Total)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtMin(f.p90Total)}</td>
                </tr>
              ))}
              {filas.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-gray-400">Sin hospitales con datos en el periodo</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
