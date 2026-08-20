"use client"

import { useEffect, useState, useMemo } from "react"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { Skeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"

interface Item {
  id: string
  tipo: "visita" | "tarea" | "recordatorio"
  titulo: string
  subtitulo: string | null
  fecha: string
  estado: string
  href: string
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

const TIPO_META: Record<Item["tipo"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  visita: {
    label: "Visita", color: TEAL, bg: TEAL_LIGHT,
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  },
  tarea: {
    label: "Tarea", color: "#4F46E5", bg: "#EEF2FF",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  recordatorio: {
    label: "Recordatorio", color: ORANGE, bg: "#FEF3E5",
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
}

function lunesDeSemana(d: Date): Date {
  const date = new Date(d)
  const dia = date.getDay()
  const offset = dia === 0 ? -6 : 1 - dia
  date.setDate(date.getDate() + offset)
  date.setHours(0, 0, 0, 0)
  return date
}

function fechaKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
}

function fmtISO(d: Date): string {
  return fechaKey(d)
}

export default function AgendaPage() {
  const [lunes, setLunes] = useState(() => lunesDeSemana(new Date()))
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const dias = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(lunes)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [lunes])

  useEffect(() => {
    setLoading(true)
    const desde = fmtISO(dias[0])
    const hasta = fmtISO(dias[4])
    fetch(`/api/agenda?desde=${desde}&hasta=${hasta}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [dias])

  const itemsPorDia = useMemo(() => {
    const mapa: Record<string, Item[]> = {}
    items.forEach(it => {
      const key = it.fecha.slice(0, 10)
      if (!mapa[key]) mapa[key] = []
      mapa[key].push(it)
    })
    return mapa
  }, [items])

  function semanaAnterior() {
    const d = new Date(lunes); d.setDate(d.getDate() - 7); setLunes(d)
  }
  function semanaSiguiente() {
    const d = new Date(lunes); d.setDate(d.getDate() + 7); setLunes(d)
  }
  function irHoy() {
    setLunes(lunesDeSemana(new Date()))
  }

  const hoyKey = fechaKey(new Date())
  const totalItems = items.length

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Agenda semanal"
        subtitle={loading ? "Cargando..." : `${totalItems} elemento${totalItems !== 1 ? "s" : ""} esta semana`}
        actions={
          <div className="flex items-center gap-1.5">
            <button onClick={semanaAnterior} aria-label="Semana anterior" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button onClick={irHoy} className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Esta semana
            </button>
            <button onClick={semanaSiguiente} aria-label="Semana siguiente" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dias.map((d, i) => {
          const key = fechaKey(d)
          const esHoy = key === hoyKey
          const itemsDia = itemsPorDia[key] ?? []
          return (
            <div key={key} className={`rounded-2xl border ${esHoy ? "border-teal-200 dark:border-teal-800" : "border-gray-100 dark:border-gray-800"} bg-white dark:bg-gray-900 overflow-hidden`}>
              <div className="px-3.5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between" style={esHoy ? { backgroundColor: TEAL_LIGHT } : undefined}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: esHoy ? TEAL : "#9ca3af" }}>{DIAS_SEMANA[i]}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{d.getDate()} {d.toLocaleDateString("es-ES", { month: "short" })}</p>
                </div>
                {itemsDia.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{itemsDia.length}</span>
                )}
              </div>
              <div className="p-2 space-y-1.5 min-h-[120px]">
                {loading ? (
                  <>
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </>
                ) : itemsDia.length === 0 ? (
                  <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">Sin elementos</p>
                ) : (
                  itemsDia.map(it => {
                    const meta = TIPO_META[it.tipo]
                    const hora = new Date(it.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                    return (
                      <a key={`${it.tipo}-${it.id}`} href={it.href} className="block rounded-lg px-2.5 py-2 hover:opacity-80 transition-opacity" style={{ backgroundColor: meta.bg }}>
                        <div className="flex items-center gap-1.5 mb-0.5" style={{ color: meta.color }}>
                          {meta.icon}
                          <span className="text-[10px] font-bold uppercase tracking-wide">{meta.label}</span>
                          <span className="text-[10px] ml-auto opacity-70">{hora}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{it.titulo}</p>
                        {it.subtitulo && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{it.subtitulo}</p>}
                      </a>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!loading && totalItems === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Semana libre"
            description="No tienes visitas, tareas ni recordatorios programados esta semana."
          />
        </div>
      )}
    </div>
  )
}
