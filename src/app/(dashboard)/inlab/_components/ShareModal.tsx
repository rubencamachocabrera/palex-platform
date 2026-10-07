"use client"

import { useCallback, useEffect, useState } from "react"
import { useModalA11y } from "@/hooks/useModalA11y"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"
import { IconClipboard, IconMonitorShare, IconTrash, IconX } from "@/components/ui/Icons"
import { fmtDia } from "@/components/inlab/charts"
import type { Rango } from "@/lib/inlab/analytics"

interface Share {
  id: string; token: string; desde: string | null; hasta: string | null; incluirFacturacion: boolean
  expiraEn: string | null; revocado: boolean; vistas: number; ultimaVista: string | null; creadoEn: string; creadoPor?: { nombre: string }
}

export function ShareModal({ abierto, onCerrar, hospitalId, hospitalNombre, rango, puedeFacturacion }: {
  abierto: boolean; onCerrar: () => void; hospitalId: string; hospitalNombre: string; rango: Rango; puedeFacturacion: boolean
}) {
  const toast = useToast()
  const ref = useModalA11y(abierto, onCerrar)
  const [shares, setShares] = useState<Share[]>([])
  const [periodo, setPeriodo] = useState<"rango" | "todo">("rango")
  const [facturacion, setFacturacion] = useState(false)
  const [expira, setExpira] = useState<number | "">(90)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(() => {
    fetch(`/api/inlab/shares?hospitalId=${hospitalId}`).then(r => (r.ok ? r.json() : [])).then(d => setShares(Array.isArray(d) ? d : [])).catch(() => {})
  }, [hospitalId])
  useEffect(() => { if (abierto) cargar() }, [abierto, cargar])

  const url = (t: string) => `${window.location.origin}/share/inlab/${t}`
  const copiar = async (t: string) => {
    try { await navigator.clipboard.writeText(url(t)); toast.success("Enlace copiado") } catch { toast.error("No se pudo copiar") }
  }

  async function crear() {
    setCreando(true)
    try {
      const r = await fetch("/api/inlab/shares", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId, desde: periodo === "rango" ? rango.desde : null, hasta: periodo === "rango" ? rango.hasta : null, incluirFacturacion: facturacion, expiraDias: expira === "" ? null : expira }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d?.error ?? "No se pudo crear el enlace"); return }
      await copiar(d.token)
      cargar()
    } finally { setCreando(false) }
  }

  async function revocar(s: Share) {
    if (!confirm("¿Revocar este enlace? Quien lo tenga dejará de poder ver el informe.")) return
    const r = await fetch(`/api/inlab/shares/${s.id}`, { method: "DELETE" })
    if (!r.ok) { toast.error("No se pudo revocar"); return }
    toast.success("Enlace revocado")
    cargar()
  }

  if (!abierto) return null
  const activos = shares.filter(s => !s.revocado && (!s.expiraEn || new Date(s.expiraEn) > new Date()))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inlab-share-titulo" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl outline-none dark:bg-slate-900 sm:rounded-3xl" style={{ borderTop: `3px solid ${TEAL}` }}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 id="inlab-share-titulo" className="flex items-center gap-2 text-base font-extrabold text-gray-900 dark:text-white"><IconMonitorShare size={18} />Compartir con el cliente</h2>
            <p className="mt-0.5 text-xs text-gray-400">Enlace público de solo lectura · {hospitalNombre}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"><IconX size={17} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <fieldset className="space-y-2">
            <legend className="kpi-label mb-1 text-gray-500">Periodo</legend>
            {([["rango", `Solo el rango actual (${fmtDia(rango.desde)} – ${fmtDia(rango.hasta, { day: "2-digit", month: "short", year: "numeric" })})`], ["todo", "Todos los datos (incluye futuras cargas)"]] as const).map(([v, l]) => (
              <label key={v} className="flex min-h-[40px] items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="radio" name="inlab-share-periodo" checked={periodo === v} onChange={() => setPeriodo(v)} className="accent-teal-600" />{l}</label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">Caduca en
            <select value={expira} onChange={e => setExpira(e.target.value === "" ? "" : Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value={30}>30 días</option><option value={90}>90 días</option><option value={365}>1 año</option><option value="">Nunca</option>
            </select>
          </label>
          {puedeFacturacion && (
            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={facturacion} onChange={e => setFacturacion(e.target.checked)} className="mt-1 accent-teal-600" /><span>Incluir facturación<span className="block text-xs text-gray-400">Muestra tarifas e importes al cliente.</span></span></label>
          )}
          <button type="button" disabled={creando} onClick={() => void crear()} className="btn-teal min-h-[44px] w-full rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>{creando ? "Creando…" : "Crear enlace y copiar"}</button>

          {activos.length > 0 && (
            <div>
              <p className="kpi-label mb-2 text-gray-500">Enlaces activos</p>
              <ul className="space-y-2">
                {activos.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-700">
                    <div className="min-w-0 text-xs">
                      <p className="font-bold text-gray-800 dark:text-white">{s.desde ? `${fmtDia(s.desde)} – ${fmtDia(s.hasta ?? s.desde)}` : "Todos los datos"}{s.incluirFacturacion ? " · con facturación" : ""}</p>
                      <p className="text-gray-400">{s.vistas} vistas · {s.expiraEn ? `caduca ${new Date(s.expiraEn).toLocaleDateString("es-ES")}` : "sin caducidad"} · {s.creadoPor?.nombre}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => void copiar(s.token)} aria-label="Copiar enlace" className="rounded-lg p-2 text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-800"><IconClipboard size={15} /></button>
                      <button type="button" onClick={() => void revocar(s)} aria-label="Revocar enlace" className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><IconTrash size={15} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
