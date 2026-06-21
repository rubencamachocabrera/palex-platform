"use client"

import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import type { Proyecto, Tab } from "../types"
import { VISITA_ESTADO_COLOR } from "../types"

export function TabCockpit({ pp, onChangeTab }: { pp: Proyecto; onChangeTab: (t: Tab) => void }) {
  const now = new Date()

  const tareasRaiz = (pp.tareas ?? []).filter(t => !t.parentId)
  const totalFases  = pp.fases.length
  const fasesOk     = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const pctFases    = totalFases  > 0 ? Math.round((fasesOk  / totalFases)  * 100) : 0
  const totalTareas = tareasRaiz.length
  const tareasOk    = tareasRaiz.filter(t => t.estado === "COMPLETADA").length
  const pctTareas   = totalTareas > 0 ? Math.round((tareasOk / totalTareas) * 100) : 0
  const totalHitos  = pp.hitos.length
  const hitosOk     = pp.hitos.filter(h => h.completado).length
  const pctHitos    = totalHitos  > 0 ? Math.round((hitosOk  / totalHitos)  * 100) : 0
  const pctOverall  = Math.round(pctFases * 0.5 + pctTareas * 0.3 + pctHitos * 0.2)

  const diasPlan        = pp.fechaFinPlan ? Math.ceil((new Date(pp.fechaFinPlan).getTime() - now.getTime()) / 86400000) : null
  const diasDesdeInicio = pp.fechaInicio  ? Math.floor((now.getTime() - new Date(pp.fechaInicio).getTime()) / 86400000) : null
  const tareasVencidas  = tareasRaiz.filter(t => !["COMPLETADA","CANCELADA"].includes(t.estado) && t.fechaVencimiento && new Date(t.fechaVencimiento) < now).length
  const fasesRetrasadas = pp.fases.filter(f => f.estado !== "COMPLETADO" && f.fechaPlan && new Date(f.fechaPlan) < now).length
  const hitosVencidos   = pp.hitos.filter(h => !h.completado && new Date(h.fecha) < now).length

  const health: "ok"|"riesgo"|"retrasado" =
    pp.estado === "COMPLETADO"                                                     ? "ok"        :
    fasesRetrasadas > 0 || hitosVencidos > 0 || (diasPlan !== null && diasPlan < 0) ? "retrasado" :
    tareasVencidas > 0  || (diasPlan !== null && diasPlan <= 7)                     ? "riesgo"    : "ok"

  const HM = {
    ok:        { label: "En plazo",  color: "#16a34a", dot: "#16a34a" },
    riesgo:    { label: "En riesgo", color: "#d97706", dot: "#f59e0b" },
    retrasado: { label: "Retrasado", color: "#dc2626", dot: "#ef4444" },
  }[health]

  const hwValor = pp.hardwareUnidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)

  type CA = { label: string; sub: string; dias: number; color: string; tipo: "fase"|"tarea"|"hito" }
  const ca: CA[] = [
    ...pp.fases.filter(f => f.estado !== "COMPLETADO" && f.fechaPlan).map(f => {
      const d = Math.ceil((new Date(f.fechaPlan!).getTime() - now.getTime()) / 86400000)
      return { label: f.nombre, sub: "Fase", dias: d, color: d < 0 ? "#dc2626" : d <= 3 ? "#d97706" : TEAL, tipo: "fase" as const }
    }),
    ...tareasRaiz.filter(t => !["COMPLETADA","CANCELADA"].includes(t.estado) && t.fechaVencimiento).map(t => {
      const d = Math.ceil((new Date(t.fechaVencimiento!).getTime() - now.getTime()) / 86400000)
      return { label: t.titulo, sub: "Tarea", dias: d, color: d < 0 ? "#dc2626" : d <= 3 ? "#d97706" : "#6b7280", tipo: "tarea" as const }
    }),
    ...pp.hitos.filter(h => !h.completado).map(h => {
      const d = Math.ceil((new Date(h.fecha).getTime() - now.getTime()) / 86400000)
      return { label: h.titulo, sub: "Hito", dias: d, color: d < 0 ? "#dc2626" : d <= 7 ? "#d97706" : "#6b7280", tipo: "hito" as const }
    }),
  ].sort((a, b) => a.dias - b.dias).slice(0, 6)

  function PBar({ value, color, label, sub }: { value: number; color: string; label: string; sub: string }) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-gray-700">{label}</span>
          <span className="text-gray-400">{sub}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── KPIs row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Health + ring */}
        <div className="sm:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-center gap-4"
          style={{ borderTop: `3px solid ${HM.color}` }}>
          <div className="relative shrink-0 w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={HM.color} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${(pctOverall / 100) * 201} 201`}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{pctOverall}%</span>
              <span className="text-[9px] text-gray-400">avance</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HM.dot }} />
              <span className="text-base font-bold" style={{ color: HM.color }}>{HM.label}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {health === "ok" && diasPlan !== null && diasPlan > 0 ? `Faltan ${diasPlan} días para el cierre planificado.` : ""}
              {health === "riesgo" ? `${tareasVencidas > 0 ? `${tareasVencidas} tarea${tareasVencidas>1?"s":""} vencida${tareasVencidas>1?"s":""}` : `${diasPlan}d hasta el cierre`}.` : ""}
              {health === "retrasado" ? `${fasesRetrasadas > 0 ? `${fasesRetrasadas} fase${fasesRetrasadas>1?"s":""} atrasada${fasesRetrasadas>1?"s":""}` : ""}${hitosVencidos > 0 ? ` · ${hitosVencidos} hito${hitosVencidos>1?"s":""} sin completar` : ""}` : ""}
              {health === "ok" && (diasPlan === null || diasPlan <= 0) ? "Proyecto al día." : ""}
            </p>
          </div>
        </div>

        {/* Tiempo */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tiempo</p>
          {diasPlan !== null ? (
            <>
              <p className="text-2xl font-bold" style={{ color: diasPlan < 0 ? "#dc2626" : diasPlan <= 7 ? "#d97706" : "#111827" }}>
                {Math.abs(diasPlan)}d
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{diasPlan < 0 ? "de retraso" : "hasta fin plan"}</p>
            </>
          ) : <p className="text-sm text-gray-300 mt-2">Sin fecha fin</p>}
          {diasDesdeInicio !== null && <p className="text-[10px] text-gray-300 mt-1">{diasDesdeInicio}d en curso</p>}
        </div>

        {/* Hardware */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Hardware</p>
          <p className="text-2xl font-bold text-gray-900">{pp.hardwareUnidades.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {hwValor > 0 ? hwValor.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}) : "unidades asignadas"}
          </p>
          {pp.presupuesto && hwValor > 0 && (
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100,(hwValor/pp.presupuesto)*100)}%`,
                backgroundColor: hwValor > pp.presupuesto ? "#dc2626" : TEAL
              }}/>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress bars ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Avance por sección</p>
        <PBar value={pctFases}  label="Fases"  sub={`${fasesOk}/${totalFases} completadas`}   color={pctFases>=70?"#16a34a":pctFases>=40?TEAL:"#9ca3af"}/>
        <PBar value={pctTareas} label="Tareas" sub={`${tareasOk}/${totalTareas} completadas`} color={pctTareas>=70?"#16a34a":pctTareas>=40?TEAL:"#9ca3af"}/>
        <PBar value={pctHitos}  label="Hitos"  sub={`${hitosOk}/${totalHitos} completados`}   color={pctHitos>=70?"#16a34a":pctHitos>=40?"#f59e0b":"#9ca3af"}/>
      </div>

      {/* ── Ruta crítica ── */}
      {ca.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span className="text-sm font-bold text-gray-800">Ruta crítica — próximas acciones</span>
          </div>
          <div className="divide-y divide-gray-50">
            {ca.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                  style={{
                    backgroundColor: a.tipo === "fase" ? `${TEAL}18` : a.tipo === "hito" ? "#fef3c7" : "#f3f4f6",
                    color: a.tipo === "fase" ? TEAL : a.tipo === "hito" ? "#d97706" : "#6b7280",
                  }}>
                  {a.sub}
                </span>
                <span className="flex-1 text-sm text-gray-700 font-medium truncate">{a.label}</span>
                <span className="text-xs font-bold shrink-0" style={{ color: a.color }}>
                  {a.dias === 0 ? "Hoy" : a.dias < 0 ? `${Math.abs(a.dias)}d vencido` : `${a.dias}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Equipo + Visitas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Equipo del proyecto</p>
          <div className="space-y-2.5">
            {pp.responsable && (
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                  {pp.responsable.nombre.charAt(0).toUpperCase()}
                </span>
                <div><p className="font-semibold text-gray-800">{pp.responsable.nombre}</p><p className="text-gray-400">Responsable</p></div>
              </div>
            )}
            {pp.contactos.slice(0,3).map(({contacto: c}) => (
              <div key={c.id} className="flex items-center gap-2.5 text-xs">
                <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <div><p className="font-semibold text-gray-800">{c.nombre}</p><p className="text-gray-400">{c.cargo ?? "Contacto"}</p></div>
              </div>
            ))}
            {pp.contactos.length === 0 && !pp.responsable && <p className="text-sm text-gray-300">Sin equipo asignado</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Últimas visitas</p>
            {pp.visitas.length > 0 && (
              <button onClick={() => onChangeTab("Visitas")} className="text-xs font-semibold hover:underline" style={{ color: TEAL }}>
                Ver todas ({pp.visitas.length}) →
              </button>
            )}
          </div>
          {pp.visitas.length === 0
            ? <p className="text-sm text-gray-300">Sin visitas registradas</p>
            : <div className="space-y-1.5">
              {pp.visitas.slice(0,5).map(v => (
                <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: VISITA_ESTADO_COLOR[v.estado] ?? "#9ca3af" }}/>
                  <span className="text-gray-600 flex-1">{new Date(v.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"2-digit"})}</span>
                  <span className="text-gray-400 truncate max-w-[80px]">{v.usuario.nombre}</span>
                </Link>
              ))}
              {pp.visitas.length > 5 && <p className="text-[10px] text-gray-300 text-center">+{pp.visitas.length-5} más</p>}
            </div>
          }
        </div>
      </div>
    </div>
  )
}

