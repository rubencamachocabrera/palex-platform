"use client"

import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"
import { IconDownload, IconPlus, IconTrash } from "@/components/ui/Icons"
import { Skeleton } from "@/components/ui/Skeleton"
import { TablaFacturacion, type VistaProps } from "@/components/inlab/Vistas"
import { Nota, Panel } from "@/components/inlab/ui"
import { facturacion, porConsumible, type Tarifa } from "@/lib/inlab/analytics"

interface TarifaEdit extends Tarifa { _k: string }

const nuevaClave = () => Math.random().toString(36).slice(2)

export function VistaFacturacion({ ds, rango, filtros, hospitalId, hospitalNombre }: VistaProps & { hospitalId: string | null; hospitalNombre: string }) {
  const toast = useToast()
  const [tarifas, setTarifas] = useState<TarifaEdit[] | null>(null)
  const [editando, setEditando] = useState(false)
  const [copia, setCopia] = useState<TarifaEdit[] | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!hospitalId) return
    let vivo = true
    fetch(`/api/inlab/tarifas?hospitalId=${hospitalId}`).then(r => (r.ok ? r.json() : [])).then(d => {
      if (vivo) setTarifas((Array.isArray(d) ? d : []).map((t: Tarifa) => ({ ...t, _k: nuevaClave() })))
    }).catch(() => vivo && setTarifas([]))
    return () => { vivo = false }
  }, [hospitalId])

  const consumiblesPeriodo = useMemo(() => porConsumible(ds, rango, { ...filtros, consumible: null }).map(c => c.clave), [ds, rango, filtros])

  if (!hospitalId) return <Panel titulo="Facturación por hospital" texto="Selecciona un único hospital para ver y editar sus tarifas."><Nota>Las tarifas son específicas de cada cliente.</Nota></Panel>
  if (tarifas === null) return <Skeleton className="h-64 w-full" />

  const actualizar = (k: string, patch: Partial<Tarifa>) => setTarifas(ts => ts?.map(t => (t._k === k ? { ...t, ...patch } : t)) ?? null)

  async function guardar() {
    if (!tarifas || !hospitalId) return
    setGuardando(true)
    try {
      const r = await fetch("/api/inlab/tarifas", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, tarifas: tarifas.filter(t => t.consumible.trim()).map(({ _k, ...t }) => { void _k; return { ...t, precio: Number(t.precio) || 0, vigenteDesde: t.vigenteDesde || null, vigenteHasta: t.vigenteHasta || null } }) }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d?.error ?? "No se pudieron guardar las tarifas"); return }
      setTarifas(d.map((t: Tarifa) => ({ ...t, _k: nuevaClave() })))
      setEditando(false)
      toast.success("Tarifas guardadas")
    } finally {
      setGuardando(false)
    }
  }

  async function exportar(formato: "xlsx" | "csv") {
    const lineas = facturacion(ds, rango, filtros, tarifas ?? [])
    const filas = lineas.map(l => ({ Mes: l.mes, Consumible: l.consumible, Unidades: l.unidades, "Precio unitario": l.precio ?? "", Importe: l.importe === null ? "" : Math.round(l.importe * 100) / 100 }))
    const nombre = `facturacion-inlab_${hospitalNombre.replace(/[^\w-]+/g, "_").slice(0, 40)}_${rango.desde}_${rango.hasta}`
    if (formato === "csv") {
      const cab = Object.keys(filas[0] ?? { Mes: "", Consumible: "", Unidades: "", "Precio unitario": "", Importe: "" })
      const esc = (v: unknown) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
      const csv = "﻿" + [cab.join(";"), ...filas.map(f => cab.map(c => esc(typeof f[c as keyof typeof f] === "number" ? String(f[c as keyof typeof f]).replace(".", ",") : f[c as keyof typeof f])).join(";"))].join("\r\n")
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
      const a = document.createElement("a"); a.href = url; a.download = `${nombre}.csv`; a.click(); URL.revokeObjectURL(url)
      return
    }
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Facturación")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((tarifas ?? []).map(t => ({ Consumible: t.consumible, Precio: t.precio, Moneda: t.moneda, Unidad: t.unidad ?? "", "Vigente desde": t.vigenteDesde ?? "", "Vigente hasta": t.vigenteHasta ?? "" }))), "Tarifas")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Hospital", hospitalNombre], ["Desde", rango.desde], ["Hasta", rango.hasta], ["Filtros", [filtros.area, filtros.consumible, filtros.urgencia !== "todas" ? filtros.urgencia : null].filter(Boolean).join(", ") || "ninguno"], ["Generado", new Date().toLocaleString("es-ES")], ["Fuente", "Agregados de exportaciones InLab (Palex)"]]), "Info")
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

  const sinTarifa = consumiblesPeriodo.filter(c => !tarifas.some(t => t.consumible === c))

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="Modelo comercial"
        titulo={`Consumo facturable · ${hospitalNombre}`}
        texto="Consumo observado × tarifa vigente el día del consumo. Respeta los filtros activos."
        accion={<div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportar("xlsx")} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"><IconDownload size={14} />Excel</button>
          <button type="button" onClick={() => void exportar("csv")} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"><IconDownload size={14} />CSV</button>
        </div>}
      >
        <TablaFacturacion ds={ds} rango={rango} filtros={filtros} tarifas={tarifas} />
      </Panel>

      <Panel
        eyebrow="Configuración del cliente"
        titulo="Tarifas"
        texto="Precio por unidad de consumible. «*» aplica a cualquier consumible sin tarifa propia. Las vigencias permiten cambios de precio sin alterar el histórico."
        accion={!editando ? <button type="button" onClick={() => { setCopia(tarifas); setEditando(true) }} className="min-h-[40px] rounded-xl px-4 text-xs font-bold text-white" style={{ backgroundColor: TEAL }}>Editar tarifas</button> : undefined}
      >
        {!editando ? (
          tarifas.length === 0 ? <Nota tono="aviso">Este hospital aún no tiene tarifas. Pulsa «Editar tarifas» para configurarlas.</Nota> : (
            <div className="flex flex-wrap gap-2">
              {tarifas.map(t => <span key={t._k} className="rounded-xl border border-slate-100 px-3 py-2 text-xs dark:border-slate-700"><strong className="text-gray-800 dark:text-white">{t.consumible}</strong> · {Number(t.precio).toLocaleString("es-ES", { style: "currency", currency: t.moneda, maximumFractionDigits: 4 })}{t.unidad ? ` / ${t.unidad}` : ""}{t.vigenteDesde || t.vigenteHasta ? <span className="text-gray-400"> · {t.vigenteDesde ?? "…"} → {t.vigenteHasta ?? "…"}</span> : null}</span>)}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <tr><th scope="col" className="py-1.5 pr-2">Consumible</th><th scope="col" className="px-2 py-1.5">Precio</th><th scope="col" className="px-2 py-1.5">Moneda</th><th scope="col" className="px-2 py-1.5">Unidad</th><th scope="col" className="px-2 py-1.5">Desde</th><th scope="col" className="px-2 py-1.5">Hasta</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {tarifas.map(t => (
                    <tr key={t._k}>
                      <td className="py-1 pr-2"><input aria-label="Consumible" list="inlab-consumibles" value={t.consumible} onChange={e => actualizar(t._k, { consumible: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></td>
                      <td className="px-2 py-1"><input aria-label="Precio" type="number" min={0} step="0.0001" value={t.precio} onChange={e => actualizar(t._k, { precio: e.target.value === "" ? 0 : Number(e.target.value) })} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></td>
                      <td className="px-2 py-1"><input aria-label="Moneda" maxLength={3} value={t.moneda} onChange={e => actualizar(t._k, { moneda: e.target.value.toUpperCase() })} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></td>
                      <td className="px-2 py-1"><input aria-label="Unidad" value={t.unidad ?? ""} placeholder="unidad" onChange={e => actualizar(t._k, { unidad: e.target.value })} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></td>
                      <td className="px-2 py-1"><input aria-label="Vigente desde" type="date" value={t.vigenteDesde ?? ""} onChange={e => actualizar(t._k, { vigenteDesde: e.target.value || null })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></td>
                      <td className="px-2 py-1"><input aria-label="Vigente hasta" type="date" value={t.vigenteHasta ?? ""} onChange={e => actualizar(t._k, { vigenteHasta: e.target.value || null })} className="rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></td>
                      <td className="py-1 pl-2"><button type="button" aria-label={`Quitar tarifa ${t.consumible}`} onClick={() => setTarifas(ts => ts?.filter(x => x._k !== t._k) ?? null)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><IconTrash size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="inlab-consumibles">{["*", ...consumiblesPeriodo].map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setTarifas(ts => [...(ts ?? []), { _k: nuevaClave(), consumible: "", precio: 0, moneda: "EUR", unidad: null }])} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-200"><IconPlus size={14} />Añadir tarifa</button>
              {sinTarifa.length > 0 && <button type="button" onClick={() => setTarifas(ts => [...(ts ?? []), ...sinTarifa.map(c => ({ _k: nuevaClave(), consumible: c, precio: 0, moneda: "EUR", unidad: null }))])} className="min-h-[40px] rounded-xl px-3 text-xs font-bold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/30">Añadir los {sinTarifa.length} consumibles del periodo</button>}
              <span className="flex-1" />
              <button type="button" onClick={() => { if (copia) setTarifas(copia); setEditando(false) }} className="min-h-[40px] rounded-xl px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800">Cancelar</button>
              <button type="button" disabled={guardando} onClick={() => void guardar()} className="min-h-[40px] rounded-xl px-4 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>{guardando ? "Guardando…" : "Guardar tarifas"}</button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
