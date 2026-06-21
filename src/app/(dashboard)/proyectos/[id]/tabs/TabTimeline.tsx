"use client"

import { useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto, Fase, Hito, EntradaTimeline } from "../types"
import { fmtFecha, fmtFechaInput, FASE_ESTADO_COLOR } from "../types"

function GanttFases({ pp }: { pp: Proyecto }) {
  const now = new Date()
  const dateCandidates: Date[] = []
  if (pp.fechaInicio) dateCandidates.push(new Date(pp.fechaInicio))
  if (pp.fechaFinPlan) dateCandidates.push(new Date(pp.fechaFinPlan))
  pp.fases.forEach(f => {
    if (f.fechaPlan) dateCandidates.push(new Date(f.fechaPlan))
    if (f.fechaReal) dateCandidates.push(new Date(f.fechaReal))
  })
  pp.hitos.forEach(h => dateCandidates.push(new Date(h.fecha)))

  if (dateCandidates.length === 0) {
    return <p className="text-sm text-gray-400 py-10 text-center">Añade fechas a las fases para ver el Gantt</p>
  }

  const earliest = new Date(Math.min(...dateCandidates.map(d => d.getTime())))
  const latest = new Date(Math.max(...dateCandidates.map(d => d.getTime())))
  const rangeStart = new Date(earliest.getTime() - 7 * 86400000)
  const rangeEnd = new Date(Math.max(latest.getTime(), now.getTime()) + 14 * 86400000)
  const totalMs = rangeEnd.getTime() - rangeStart.getTime()

  const LABEL_W = 148
  const ROW_H = 38
  const BAR_MARGIN = 10
  const BAR_H = ROW_H - BAR_MARGIN * 2
  const VB_W = 700
  const chartW = VB_W - LABEL_W

  const xOf = (d: Date) => LABEL_W + ((d.getTime() - rangeStart.getTime()) / totalMs) * chartW
  const todayX = xOf(now)

  const faseColor = (estado: string) => {
    if (estado === "COMPLETADO") return "#16a34a"
    if (estado === "EN_PROGRESO") return TEAL
    if (estado === "BLOQUEADO") return "#dc2626"
    return "#9ca3af"
  }

  const faseRows = pp.fases.map((f, i) => {
    const endDate = f.fechaPlan ? new Date(f.fechaPlan) : null
    const startDate = pp.fases[i - 1]?.fechaPlan
      ? new Date(pp.fases[i - 1].fechaPlan!)
      : pp.fechaInicio
        ? new Date(pp.fechaInicio)
        : endDate ? new Date(endDate.getTime() - 21 * 86400000) : null
    return { fase: f, startDate, endDate }
  })

  const ticks: { xv: number; label: string }[] = []
  const cur = new Date(rangeStart); cur.setDate(1)
  while (cur <= rangeEnd) {
    ticks.push({ xv: xOf(cur), label: cur.toLocaleDateString("es-ES", { month: "short", year: "numeric" }) })
    cur.setMonth(cur.getMonth() + 1)
  }

  const hitoYOffset = pp.fases.length * ROW_H + 28
  const totalH = hitoYOffset + (pp.hitos.length > 0 ? pp.hitos.length * ROW_H + 4 : 0) + 8

  return (
    <div className="overflow-x-auto pb-2">
      <svg viewBox={`0 0 ${VB_W} ${totalH}`} className="w-full" style={{ minWidth: 480, height: totalH }}>
        <defs>
          <pattern id="hatch-overdue" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(220,38,38,0.35)" strokeWidth={3}/>
          </pattern>
        </defs>

        {/* Grid lines + month labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.xv} y1={16} x2={t.xv} y2={totalH - 4} stroke="#f3f4f6" strokeWidth={1}/>
            {t.xv >= LABEL_W && <text x={t.xv + 3} y={14} fontSize={9} fill="#d1d5db" fontWeight="600">{t.label}</text>}
          </g>
        ))}

        {/* Fase rows */}
        {faseRows.map((row, i) => {
          const y = 20 + i * ROW_H
          const color = faseColor(row.fase.estado)
          const x1 = row.startDate ? Math.max(xOf(row.startDate), LABEL_W) : LABEL_W
          const x2 = row.endDate ? xOf(row.endDate) : Math.min(todayX, VB_W - 4)
          const bw = Math.max(6, x2 - x1)
          const overdue = row.endDate && row.fase.estado !== "COMPLETADO" && row.endDate < now
          return (
            <g key={row.fase.id}>
              <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11}
                fill="#374151" fontWeight={row.fase.estado === "EN_PROGRESO" ? "700" : "400"}>
                {row.fase.nombre.length > 16 ? row.fase.nombre.slice(0, 16) + "…" : row.fase.nombre}
              </text>
              <rect x={LABEL_W} y={y + BAR_MARGIN} width={chartW - 4} height={BAR_H} rx={3} fill="#f9fafb"/>
              {(row.startDate || row.endDate) && (
                <rect x={x1} y={y + BAR_MARGIN} width={bw} height={BAR_H} rx={3} fill={color} fillOpacity={0.78}/>
              )}
              {overdue && <rect x={x1} y={y + BAR_MARGIN} width={bw} height={BAR_H} rx={3} fill="url(#hatch-overdue)"/>}
              {row.fase.fechaReal && (
                <line x1={xOf(new Date(row.fase.fechaReal))} y1={y + BAR_MARGIN - 2}
                  x2={xOf(new Date(row.fase.fechaReal))} y2={y + ROW_H - BAR_MARGIN + 2}
                  stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round"/>
              )}
              {row.endDate && xOf(row.endDate) < VB_W - 18 && (
                <text x={Math.min(xOf(row.endDate) + 4, VB_W - 28)} y={y + ROW_H / 2 + 4}
                  fontSize={9} fill={overdue ? "#dc2626" : "#9ca3af"}>
                  {row.endDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </text>
              )}
            </g>
          )
        })}

        {/* Hitos section */}
        {pp.hitos.length > 0 && (
          <>
            <line x1={LABEL_W} y1={hitoYOffset - 6} x2={VB_W - 4} y2={hitoYOffset - 6} stroke="#f3f4f6" strokeWidth={1}/>
            <text x={LABEL_W - 6} y={hitoYOffset + 10} textAnchor="end" fontSize={9} fill="#9ca3af" fontWeight="700">HITOS</text>
            {pp.hitos.map((h, i) => {
              const y = hitoYOffset + 16 + i * ROW_H
              const hx = xOf(new Date(h.fecha))
              const lateH = !h.completado && new Date(h.fecha) < now
              return (
                <g key={h.id}>
                  <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11} fill="#374151">
                    {h.titulo.length > 16 ? h.titulo.slice(0, 16) + "…" : h.titulo}
                  </text>
                  <rect x={LABEL_W} y={y + BAR_MARGIN} width={chartW - 4} height={BAR_H} rx={3} fill="#f9fafb"/>
                  <polygon
                    points={`${hx},${y + BAR_MARGIN - 2} ${hx + 7},${y + ROW_H / 2} ${hx},${y + ROW_H - BAR_MARGIN + 2} ${hx - 7},${y + ROW_H / 2}`}
                    fill={h.completado ? "#16a34a" : lateH ? "#dc2626" : "#d97706"} opacity={0.85}/>
                  <text x={hx + 10} y={y + ROW_H / 2 + 4} fontSize={9} fill={lateH ? "#dc2626" : "#9ca3af"}>
                    {new Date(h.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </text>
                </g>
              )
            })}
          </>
        )}

        {/* Today line */}
        {todayX >= LABEL_W && todayX <= VB_W && (
          <>
            <line x1={todayX} y1={16} x2={todayX} y2={totalH - 4} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,3"/>
            <text x={todayX} y={13} textAnchor="middle" fontSize={9} fill="#f97316" fontWeight="700">Hoy</text>
          </>
        )}
      </svg>

      <div className="flex flex-wrap gap-3 mt-1 px-2 text-xs text-gray-400">
        {[{ color: "#9ca3af", label: "Pendiente" }, { color: TEAL, label: "En progreso" }, { color: "#16a34a", label: "Completado" }, { color: "#dc2626", label: "Bloqueado" }].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ backgroundColor: item.color, opacity: 0.78 }}/>
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded-full bg-orange-400 shrink-0"/>Hoy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded-full bg-green-600 shrink-0"/>Fecha real
        </span>
      </div>
    </div>
  )
}

export function TabTimeline({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()

  const [viewMode, setViewMode] = useState<"lista" | "gantt">("lista")
  const [editFaseId, setEditFaseId] = useState<string | null>(null)
  const [fasePatch, setFasePatch] = useState({ estado: "", fechaPlan: "", fechaReal: "", notas: "" })
  const [guardando, setGuardando] = useState(false)
  const [addTipo, setAddTipo] = useState<"EVENTO" | "COMENTARIO" | "CITA" | "HITO" | null>(null)
  const [addForm, setAddForm] = useState({ titulo: "", contenido: "", fechaCita: "", horaCita: "", personaCita: "", fechaEntrada: "", lugarCita: "", motivoCita: "", importanciaCita: "" })
  const [hitoForm, setHitoForm] = useState({ titulo: "", descripcion: "", fecha: "" })
  const [editEntradaId, setEditEntradaId] = useState<string | null>(null)
  const [editEntradaForm, setEditEntradaForm] = useState({ titulo: "", contenido: "", fechaEntrada: "", fechaCita: "", horaCita: "", personaCita: "", lugarCita: "", motivoCita: "", importanciaCita: "" })
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    setCollapsedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleMonth(month: string) {
    setCollapsedMonths(prev => { const n = new Set(prev); n.has(month) ? n.delete(month) : n.add(month); return n })
  }

  const [editHitoId, setEditHitoId] = useState<string | null>(null)
  const [editHitoForm, setEditHitoForm] = useState({ titulo: "", descripcion: "", fecha: "", fechaReal: "" })

  function abrirEditFase(f: Fase) {
    setEditFaseId(f.id)
    setFasePatch({ estado: f.estado, fechaPlan: fmtFechaInput(f.fechaPlan), fechaReal: fmtFechaInput(f.fechaReal), notas: f.notas ?? "" })
  }

  async function guardarFase(faseId: string) {
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/fases/${faseId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fasePatch),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      let updatedFases = pp.fases.map(f => f.id === faseId ? { ...f, ...updated } : f)
      if (fasePatch.estado === "COMPLETADO") {
        const currentFase = pp.fases.find(f => f.id === faseId)
        if (currentFase) {
          const nextFase = pp.fases.find(f => f.orden === currentFase.orden + 1 && f.estado === "BLOQUEADO")
          if (nextFase) {
            try {
              const r2 = await fetch(`/api/proyectos/${pp.id}/fases/${nextFase.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: "PENDIENTE" }),
              })
              if (r2.ok) {
                const updatedNext = await r2.json()
                updatedFases = updatedFases.map(f => f.id === nextFase.id ? { ...f, ...updatedNext } : f)
              }
            } catch { /* silencioso */ }
          }
        }
      }
      onUpdate({ ...pp, fases: updatedFases })
      setEditFaseId(null); success("Fase actualizada")
    } catch { toastError("Error al guardar fase") }
    finally { setGuardando(false) }
  }

  async function toggleHito(hito: Hito) {
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/hitos/${hito.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: !hito.completado }),
      })
      if (!r.ok) throw new Error()
      onUpdate({ ...pp, hitos: pp.hitos.map(h => h.id === hito.id ? { ...h, completado: !h.completado } : h) })
    } catch { toastError("Error") }
  }

  async function eliminarHito(hitoId: string) {
    try {
      await fetch(`/api/proyectos/${pp.id}/hitos/${hitoId}`, { method: "DELETE" })
      onUpdate({ ...pp, hitos: pp.hitos.filter(h => h.id !== hitoId) })
      success("Hito eliminado")
    } catch { toastError("Error") }
  }

  async function crearHito() {
    if (!hitoForm.titulo || !hitoForm.fecha) return
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/hitos`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(hitoForm),
      })
      if (!r.ok) throw new Error()
      const nuevo = await r.json()
      onUpdate({ ...pp, hitos: [...pp.hitos, nuevo].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) })
      setHitoForm({ titulo: "", descripcion: "", fecha: "" }); setAddTipo(null); success("Hito añadido")
    } catch { toastError("Error al crear hito") }
    finally { setGuardando(false) }
  }

  async function crearEntrada() {
    if (!addTipo || addTipo === "HITO") return
    if (addTipo === "CITA" && !addForm.fechaCita) { toastError("La cita necesita una fecha"); return }
    if (addTipo === "COMENTARIO" && !addForm.contenido.trim()) { toastError("El comentario no puede estar vacío"); return }
    if ((addTipo === "EVENTO" || addTipo === "CITA") && !addForm.titulo.trim()) { toastError("El título es obligatorio"); return }
    setGuardando(true)
    try {
      const fechaCitaStr = addForm.fechaCita ? `${addForm.fechaCita}T${addForm.horaCita || "09:00"}:00` : null
      const r = await fetch(`/api/proyectos/${pp.id}/entradas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: addTipo,
          titulo: addTipo === "COMENTARIO" ? (addForm.titulo || "Nota") : addForm.titulo,
          contenido: addForm.contenido || null,
          fechaCita: fechaCitaStr,
          personaCita: addForm.personaCita || null,
          lugarCita: addTipo === "CITA" ? (addForm.lugarCita || null) : null,
          motivoCita: addTipo === "CITA" ? (addForm.motivoCita || null) : null,
          importanciaCita: addTipo === "CITA" ? (addForm.importanciaCita ? Number(addForm.importanciaCita) : null) : null,
          fechaEntrada: (addTipo === "EVENTO" || addTipo === "COMENTARIO") ? (addForm.fechaEntrada || null) : null,
        }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, entradas: [...(pp.entradas ?? []), nueva] })
      setAddForm({ titulo: "", contenido: "", fechaCita: "", horaCita: "", personaCita: "", fechaEntrada: "", lugarCita: "", motivoCita: "", importanciaCita: "" }); setAddTipo(null)
      success(addTipo === "CITA" ? "Cita creada" : addTipo === "EVENTO" ? "Evento registrado" : "Nota añadida")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  async function eliminarEntrada(entradaId: string) {
    try {
      await fetch(`/api/proyectos/${pp.id}/entradas/${entradaId}`, { method: "DELETE" })
      onUpdate({ ...pp, entradas: (pp.entradas ?? []).filter(e => e.id !== entradaId) })
      success("Eliminado")
    } catch { toastError("Error") }
  }

  function abrirEditHito(h: Hito) {
    setEditHitoId(h.id)
    setEditHitoForm({
      titulo: h.titulo,
      descripcion: h.descripcion ?? "",
      fecha: fmtFechaInput(h.fecha),
      fechaReal: fmtFechaInput(h.fechaReal),
    })
    setAddTipo(null)
  }

  async function guardarHito(hitoId: string) {
    if (!editHitoForm.titulo.trim() || !editHitoForm.fecha) { toastError("Título y fecha son obligatorios"); return }
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/hitos/${hitoId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editHitoForm.titulo.trim(),
          descripcion: editHitoForm.descripcion || null,
          fecha: editHitoForm.fecha,
          fechaReal: editHitoForm.fechaReal || null,
        }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, hitos: pp.hitos.map(h => h.id === hitoId ? { ...h, ...updated } : h) })
      setEditHitoId(null)
      success("Hito actualizado")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  function abrirEditEntrada(e: EntradaTimeline) {
    setEditEntradaId(e.id)
    const fechaCitaBase = e.fechaCita ? new Date(e.fechaCita) : null
    setEditEntradaForm({
      titulo: e.titulo === "Nota" ? "" : e.titulo,
      contenido: e.contenido ?? "",
      fechaEntrada: e.tipo !== "CITA" ? fmtFechaInput(e.fechaEntrada) : "",
      fechaCita: fechaCitaBase ? fmtFechaInput(e.fechaCita) : "",
      horaCita: fechaCitaBase ? fechaCitaBase.toTimeString().slice(0, 5) : "",
      personaCita: e.personaCita ?? "",
      lugarCita: e.lugarCita ?? "",
      motivoCita: e.motivoCita ?? "",
      importanciaCita: e.importanciaCita ? String(e.importanciaCita) : "",
    })
    setAddTipo(null)
  }

  async function guardarEntrada(entradaId: string, tipo: string) {
    setGuardando(true)
    try {
      const body: Record<string, unknown> = {
        titulo: editEntradaForm.titulo || (tipo === "COMENTARIO" ? "Nota" : ""),
        contenido: editEntradaForm.contenido || null,
      }
      if (tipo === "CITA") {
        body.fechaCita = editEntradaForm.fechaCita
          ? `${editEntradaForm.fechaCita}T${editEntradaForm.horaCita || "09:00"}:00`
          : null
        body.personaCita = editEntradaForm.personaCita || null
        body.lugarCita = editEntradaForm.lugarCita || null
        body.motivoCita = editEntradaForm.motivoCita || null
        body.importanciaCita = editEntradaForm.importanciaCita ? Number(editEntradaForm.importanciaCita) : null
      } else {
        body.fechaEntrada = editEntradaForm.fechaEntrada || null
      }
      const r = await fetch(`/api/proyectos/${pp.id}/entradas/${entradaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, entradas: (pp.entradas ?? []).map(e => e.id === entradaId ? { ...e, ...updated } : e) })
      setEditEntradaId(null)
      success("Guardado")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  const now = Date.now()

  type MergedItem =
    | { kind: "fase"; data: Fase; sortKey: number }
    | { kind: "hito"; data: Hito; sortKey: number }
    | { kind: "entrada"; data: EntradaTimeline; sortKey: number }

  const merged: MergedItem[] = [
    ...pp.fases.map(f => ({ kind: "fase" as const, data: f, sortKey: f.fechaPlan ? new Date(f.fechaPlan).getTime() : Infinity })),
    ...pp.hitos.map(h => ({ kind: "hito" as const, data: h, sortKey: new Date(h.fecha).getTime() })),
    ...(pp.entradas ?? []).map(e => ({
      kind: "entrada" as const, data: e,
      sortKey: e.tipo === "CITA" && e.fechaCita ? new Date(e.fechaCita).getTime() : new Date(e.fechaEntrada).getTime(),
    })),
  ].sort((a, b) => a.sortKey - b.sortKey)

  const citasFuturas = (pp.entradas ?? [])
    .filter(e => e.tipo === "CITA" && e.fechaCita && new Date(e.fechaCita).getTime() > now)
    .sort((a, b) => new Date(a.fechaCita!).getTime() - new Date(b.fechaCita!).getTime())

  type RenderItem =
    | { rType: "header"; month: string; rKey: string }
    | { rType: "item"; item: MergedItem; rKey: string }

  const renderList: RenderItem[] = []
  let lastMonth = ""
  for (const item of merged) {
    const d = new Date(isFinite(item.sortKey) ? item.sortKey : now)
    const month = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    if (month !== lastMonth) {
      renderList.push({ rType: "header", month, rKey: `hdr-${month}` })
      lastMonth = month
    }
    renderList.push({ rType: "item", item, rKey: `${item.kind}-${item.data.id}` })
  }

  // Compute status for each month header: 'warning' | 'ok' | 'empty'
  const monthStatus = new Map<string, "warning" | "ok" | "empty">()
  {
    let mKey = ""
    let hasItems = false
    let hasIssues = false
    const flush = () => { if (mKey) monthStatus.set(mKey, hasIssues ? "warning" : hasItems ? "ok" : "empty") }
    for (const ri of renderList) {
      if (ri.rType === "header") { flush(); mKey = ri.month; hasItems = false; hasIssues = false }
      else {
        hasItems = true
        const { item } = ri
        if (item.kind === "fase") {
          if (item.data.estado === "BLOQUEADO") hasIssues = true
          else if (item.data.fechaPlan && new Date(item.data.fechaPlan).getTime() < now && item.data.estado !== "COMPLETADO") hasIssues = true
        } else if (item.kind === "hito") {
          if (!item.data.completado && new Date(item.data.fecha).getTime() < now) hasIssues = true
        }
      }
    }
    flush()
  }

  const ADD_BTNS = [
    { tipo: "EVENTO" as const, label: "Evento", color: "#f97316" },
    { tipo: "COMENTARIO" as const, label: "Nota", color: "#6b7280" },
    { tipo: "CITA" as const, label: "Cita", color: "#3b82f6" },
    { tipo: "HITO" as const, label: "Hito", color: ORANGE },
  ]

  return (
    <div className="space-y-4">
      {/* Barra de añadir + toggle de vista */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 mr-1">Añadir</span>
        {ADD_BTNS.map(({ tipo, label, color }) => (
          <button
            key={tipo}
            onClick={() => setAddTipo(addTipo === tipo ? null : tipo)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              addTipo === tipo ? "text-white" : "bg-white text-gray-700 border-gray-200"
            }`}
            style={addTipo === tipo
              ? { backgroundColor: color, borderColor: color }
              : undefined}
          >
            {tipo === "EVENTO" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            )}
            {tipo === "COMENTARIO" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            )}
            {tipo === "CITA" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            {tipo === "HITO" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            )}
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-1 p-0.5 bg-gray-100 rounded-xl">
          {(["lista", "gantt"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={viewMode === mode ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#9ca3af" }}>
              {mode === "lista" ? "Lista" : "Gantt"}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt view */}
      {viewMode === "gantt" && <GanttFases pp={pp} />}

      {/* Formulario: Evento, Comentario o Cita */}
      {addTipo && addTipo !== "HITO" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">
            {addTipo === "EVENTO" ? "Registrar evento" : addTipo === "COMENTARIO" ? "Añadir nota" : "Nueva cita"}
          </p>
          {(addTipo === "EVENTO" || addTipo === "CITA") && (
            <input value={addForm.titulo} onChange={e => setAddForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder={addTipo === "EVENTO" ? "¿Qué ha ocurrido?" : "Título de la reunión"}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          )}
          {addTipo === "CITA" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                  <input type="date" value={addForm.fechaCita} onChange={e => setAddForm(p => ({ ...p, fechaCita: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hora</label>
                  <input type="time" value={addForm.horaCita} onChange={e => setAddForm(p => ({ ...p, horaCita: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              </div>
              <input value={addForm.personaCita} onChange={e => setAddForm(p => ({ ...p, personaCita: e.target.value }))}
                placeholder="Con quién (persona, cargo…)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              {/* Lugar */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tipo de reunión</label>
                <div className="flex flex-wrap gap-2">
                  {[{ v: "PRESENCIAL", l: "Presencial", dot: "#6b7280" }, { v: "TEAMS", l: "Teams", dot: "#7c3aed" }, { v: "ZOOM", l: "Zoom", dot: "#2563eb" }, { v: "GOOGLE_MEET", l: "Meet", dot: "#16a34a" }].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => setAddForm(p => ({ ...p, lugarCita: p.lugarCita === opt.v ? "" : opt.v }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        addForm.lugarCita === opt.v ? "text-white" : "bg-white text-gray-700 border-gray-200"
                      }`}
                      style={addForm.lugarCita === opt.v ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6" } : undefined}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: addForm.lugarCita === opt.v ? "white" : opt.dot }} />
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Motivo */}
              <input value={addForm.motivoCita} onChange={e => setAddForm(p => ({ ...p, motivoCita: e.target.value }))}
                placeholder="Motivo de la cita (opcional)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              {/* Importancia */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 shrink-0">Importancia:</span>
                {[{ v: "1", l: "Normal", bg: "#f3f4f6", col: "#374151" }, { v: "2", l: "Importante", bg: "#fff7ed", col: "#f97316" }, { v: "3", l: "Crítica", bg: "#fef2f2", col: "#dc2626" }].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => setAddForm(p => ({ ...p, importanciaCita: p.importanciaCita === opt.v ? "" : opt.v }))}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={addForm.importanciaCita === opt.v ? { backgroundColor: opt.col, color: "white", borderColor: opt.col } : { backgroundColor: opt.bg, color: opt.col, borderColor: "#e5e7eb" }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </>
          )}
          {(addTipo === "EVENTO" || addTipo === "COMENTARIO") && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 shrink-0">
                {addTipo === "EVENTO" ? "Fecha del evento" : "Fecha de la nota"}
              </label>
              <input type="date" value={addForm.fechaEntrada}
                onChange={e => setAddForm(p => ({ ...p, fechaEntrada: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              {addForm.fechaEntrada && (
                <button type="button" onClick={() => setAddForm(p => ({ ...p, fechaEntrada: "" }))}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">
                  hoy
                </button>
              )}
            </div>
          )}
          <textarea value={addForm.contenido} onChange={e => setAddForm(p => ({ ...p, contenido: e.target.value }))}
            placeholder={addTipo === "COMENTARIO" ? "Escribe tu nota o comentario…" : "Notas adicionales (opcional)"}
            rows={addTipo === "COMENTARIO" ? 3 : 2}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setAddTipo(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={crearEntrada} disabled={guardando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "…" : addTipo === "EVENTO" ? "Registrar" : addTipo === "COMENTARIO" ? "Añadir" : "Crear cita"}
            </button>
          </div>
        </div>
      )}

      {/* Formulario: Hito */}
      {addTipo === "HITO" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Nuevo hito</p>
          <input value={hitoForm.titulo} onChange={e => setHitoForm(p => ({ ...p, titulo: e.target.value }))}
            placeholder="Título del hito"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <input value={hitoForm.descripcion} onChange={e => setHitoForm(p => ({ ...p, descripcion: e.target.value }))}
            placeholder="Descripción (opcional)"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <input type="date" value={hitoForm.fecha} onChange={e => setHitoForm(p => ({ ...p, fecha: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <div className="flex gap-2">
            <button onClick={() => setAddTipo(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={crearHito} disabled={guardando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "…" : "Añadir hito"}
            </button>
          </div>
        </div>
      )}

      {viewMode === "lista" && <>

      {/* Próximas citas */}
      {citasFuturas.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Próximas citas</p>
          {citasFuturas.slice(0, 4).map(c => {
            const dias = Math.ceil((new Date(c.fechaCita!).getTime() - now) / 86400000)
            return (
              <div key={c.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900 leading-tight">{c.titulo}</p>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-xs text-blue-500">
                    <span>{new Date(c.fechaCita!).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    {c.personaCita && <span>· Con: {c.personaCita}</span>}
                  </div>
                  {c.contenido && <p className="text-xs text-blue-600 mt-0.5 line-clamp-1">{c.contenido}</p>}
                </div>
                <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                  {dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Timeline principal */}
      {renderList.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Timeline vacío. Usa los botones de arriba para añadir eventos, notas o citas.
        </div>
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-100" />
          {(() => {
            let currentMonth = ""
            return renderList.map(ri => {
            if (ri.rType === "header") {
              currentMonth = ri.month
              const st = monthStatus.get(ri.month) ?? "empty"
              const dotColor = st === "warning" ? "#dc2626" : st === "ok" ? "#16a34a" : "#d1d5db"
              const collapsed = collapsedMonths.has(ri.month)
              return (
                <div key={ri.rKey}
                  className="relative -ml-8 flex items-center gap-2 my-4 cursor-pointer select-none group"
                  onClick={() => toggleMonth(ri.month)}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 transition-colors" style={{ backgroundColor: dotColor }} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest capitalize group-hover:text-gray-600 transition-colors">{ri.month}</span>
                  <div className="flex-1 h-px bg-gray-100 ml-1" />
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-150"
                    style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              )
            }

            if (collapsedMonths.has(currentMonth)) return null

            const { item } = ri

            if (item.kind === "fase") {
              const f = item.data
              const s = FASE_ESTADO_COLOR[f.estado] ?? FASE_ESTADO_COLOR.PENDIENTE
              const editing = editFaseId === f.id
              return (
                <div key={ri.rKey} className="relative mb-3">
                  <div className="absolute -left-[22px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10"
                    style={{ backgroundColor: s.dot }} />
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                            {f.estado === "PENDIENTE" ? "Pendiente" : f.estado === "EN_PROGRESO" ? "En progreso" : f.estado === "COMPLETADO" ? "Completado" : "Bloqueado"}
                          </span>
                          <span className="text-xs text-gray-400">Fase {f.orden}</span>
                          {f.fechaPlan && !editing && (
                            <span className="text-xs text-gray-400">{fmtFecha(f.fechaPlan)}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mt-1">{f.nombre}</h4>
                        {!editing && f.estado === "BLOQUEADO" && (() => {
                          const prevFase = pp.fases.find(p => p.orden === f.orden - 1)
                          return prevFase && prevFase.estado !== "COMPLETADO" ? (
                            <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <span>Esperando: {prevFase.nombre}</span>
                            </div>
                          ) : null
                        })()}
                        {!editing && !collapsedItems.has(f.id) && f.fechaReal && (
                          <span className="text-xs text-green-600">Real: {fmtFecha(f.fechaReal)}</span>
                        )}
                        {!editing && !collapsedItems.has(f.id) && f.notas && <p className="text-xs text-gray-500 mt-1 italic">{f.notas}</p>}
                      </div>
                      {!editing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => abrirEditFase(f)}
                            className="text-gray-300 hover:text-teal-600 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => toggleCollapse(f.id)}
                            className="p-1 rounded-lg hover:bg-gray-50 transition-colors text-gray-300 hover:text-gray-500">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: collapsedItems.has(f.id) ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {editing && (
                      <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                        <select value={fasePatch.estado} onChange={e => setFasePatch(p => ({ ...p, estado: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_PROGRESO">En progreso</option>
                          <option value="COMPLETADO">Completado</option>
                          <option value="BLOQUEADO">Bloqueado</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha plan</label>
                            <input type="date" value={fasePatch.fechaPlan} onChange={e => setFasePatch(p => ({ ...p, fechaPlan: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha real</label>
                            <input type="date" value={fasePatch.fechaReal} onChange={e => setFasePatch(p => ({ ...p, fechaReal: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                          </div>
                        </div>
                        <textarea value={fasePatch.notas} onChange={e => setFasePatch(p => ({ ...p, notas: e.target.value }))} rows={2}
                          placeholder="Notas…"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => setEditFaseId(null)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button onClick={() => guardarFase(f.id)} disabled={guardando}
                            className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: TEAL }}>
                            {guardando ? "…" : "Guardar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            if (item.kind === "hito") {
              const h = item.data
              const editingHito = editHitoId === h.id
              return (
                <div key={ri.rKey} className="relative mb-3">
                  <div className="absolute -left-[24px] top-3.5 w-4 h-4 rotate-45 border-2 border-white shadow-sm z-10 rounded-sm"
                    style={{ backgroundColor: editingHito ? TEAL : h.completado ? "#16a34a" : ORANGE }} />
                  <div className={`rounded-2xl border p-4 ${editingHito ? "bg-teal-50 border-teal-200" : "bg-amber-50 border-amber-100"}`}>
                    {editingHito ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Hito</span>
                          <span className="text-[10px] text-teal-600 font-semibold">Editando</span>
                        </div>
                        <input
                          autoFocus
                          value={editHitoForm.titulo}
                          onChange={e => setEditHitoForm(p => ({ ...p, titulo: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Escape") setEditHitoId(null) }}
                          placeholder="Título del hito"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                        <input
                          value={editHitoForm.descripcion}
                          onChange={e => setEditHitoForm(p => ({ ...p, descripcion: e.target.value }))}
                          placeholder="Descripción (opcional)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha planificada *</label>
                            <input type="date" value={editHitoForm.fecha}
                              onChange={e => setEditHitoForm(p => ({ ...p, fecha: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha real</label>
                            <input type="date" value={editHitoForm.fechaReal}
                              onChange={e => setEditHitoForm(p => ({ ...p, fechaReal: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => guardarHito(h.id)} disabled={guardando}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: TEAL }}>
                            {guardando ? "Guardando…" : "Guardar"}
                          </button>
                          <button onClick={() => setEditHitoId(null)}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-teal-100 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => toggleCollapse(h.id)}>
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Hito</span>
                            <span className="text-xs text-gray-400">{fmtFecha(h.fecha)}</span>
                            {h.completado && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Completado</span>}
                            <span className="font-semibold text-gray-900 text-sm truncate">{h.titulo}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleHito(h)} title={h.completado ? "Marcar pendiente" : "Marcar completado"}
                            className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors text-amber-600">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          <button onClick={() => abrirEditHito(h)} title="Editar hito"
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-gray-300 hover:text-blue-500">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => eliminarHito(h.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className="transition-transform duration-200" style={{ transform: collapsedItems.has(h.id) ? "rotate(-90deg)" : "rotate(0deg)" }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>
                      {!collapsedItems.has(h.id) && (
                        <div className="mt-2 pt-2 border-t border-amber-100 space-y-0.5">
                          {h.descripcion && <p className="text-xs text-gray-500">{h.descripcion}</p>}
                          {h.fechaReal && !h.completado && <p className="text-xs text-gray-400">Fecha real: {fmtFecha(h.fechaReal)}</p>}
                          {h.completado && h.fechaReal && <p className="text-xs text-green-600">Completado el {fmtFecha(h.fechaReal)}</p>}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              )
            }

            if (item.kind === "entrada") {
              const e = item.data
              const isFutureCita = e.tipo === "CITA" && e.fechaCita && new Date(e.fechaCita).getTime() > now
              const cardStyle: Record<string, { bg: string; border: string; dotColor: string; labelColor: string; label: string }> = {
                EVENTO:     { bg: "bg-orange-50",  border: "border-orange-100", dotColor: "#f97316", labelColor: "text-orange-600", label: "Evento" },
                COMENTARIO: { bg: "bg-gray-50",    border: "border-gray-200",   dotColor: "#9ca3af", labelColor: "text-gray-500",   label: "Nota" },
                CITA:       { bg: isFutureCita ? "bg-blue-50"  : "bg-slate-50",
                               border: isFutureCita ? "border-blue-100" : "border-slate-200",
                               dotColor: isFutureCita ? "#3b82f6" : "#94a3b8",
                               labelColor: isFutureCita ? "text-blue-600" : "text-slate-500", label: "Cita" },
              }
              const cs = cardStyle[e.tipo] ?? cardStyle.COMENTARIO
              const fechaDisplay = e.tipo === "CITA" && e.fechaCita
                ? new Date(e.fechaCita).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : new Date(e.fechaEntrada).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
              const editing = editEntradaId === e.id
              return (
                <div key={ri.rKey} className="relative mb-3">
                  <div className="absolute -left-[22px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10"
                    style={{ backgroundColor: editing ? TEAL : cs.dotColor }} />
                  <div className={`rounded-2xl border p-4 ${cs.bg} ${editing ? "border-teal-300" : cs.border}`}>
                    {editing ? (
                      /* ── Modo edición ── */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${cs.labelColor}`}>{cs.label}</span>
                          <span className="text-[10px] text-teal-600 font-semibold">Editando</span>
                        </div>
                        {(e.tipo === "EVENTO" || e.tipo === "CITA") && (
                          <input
                            autoFocus
                            value={editEntradaForm.titulo}
                            onChange={ev => setEditEntradaForm(p => ({ ...p, titulo: ev.target.value }))}
                            placeholder={e.tipo === "EVENTO" ? "¿Qué ocurrió?" : "Título de la reunión"}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                          />
                        )}
                        {e.tipo === "CITA" && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                                <input type="date" value={editEntradaForm.fechaCita}
                                  onChange={ev => setEditEntradaForm(p => ({ ...p, fechaCita: ev.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Hora</label>
                                <input type="time" value={editEntradaForm.horaCita}
                                  onChange={ev => setEditEntradaForm(p => ({ ...p, horaCita: ev.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                              </div>
                            </div>
                            <input value={editEntradaForm.personaCita}
                              onChange={ev => setEditEntradaForm(p => ({ ...p, personaCita: ev.target.value }))}
                              placeholder="Con quién (persona, cargo…)"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5">Tipo de reunión</label>
                              <div className="flex flex-wrap gap-2">
                                {[{ v: "PRESENCIAL", l: "Presencial" }, { v: "TEAMS", l: "Teams" }, { v: "ZOOM", l: "Zoom" }, { v: "GOOGLE_MEET", l: "Meet" }].map(opt => (
                                  <button key={opt.v} type="button"
                                    onClick={() => setEditEntradaForm(p => ({ ...p, lugarCita: p.lugarCita === opt.v ? "" : opt.v }))}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                      editEntradaForm.lugarCita === opt.v ? "text-white" : "bg-white text-gray-700 border-gray-200"
                                    }`}
                                    style={editEntradaForm.lugarCita === opt.v ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6" } : undefined}>
                                    {opt.l}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input value={editEntradaForm.motivoCita}
                              onChange={ev => setEditEntradaForm(p => ({ ...p, motivoCita: ev.target.value }))}
                              placeholder="Motivo de la cita (opcional)"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500 shrink-0">Importancia:</span>
                              {[{ v: "1", l: "Normal", col: "#374151" }, { v: "2", l: "Importante", col: "#f97316" }, { v: "3", l: "Crítica", col: "#dc2626" }].map(opt => (
                                <button key={opt.v} type="button"
                                  onClick={() => setEditEntradaForm(p => ({ ...p, importanciaCita: p.importanciaCita === opt.v ? "" : opt.v }))}
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all"
                                  style={editEntradaForm.importanciaCita === opt.v ? { backgroundColor: opt.col, color: "white", borderColor: opt.col } : { backgroundColor: "white", color: opt.col, borderColor: "#e5e7eb" }}>
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {(e.tipo === "EVENTO" || e.tipo === "COMENTARIO") && (
                          <div className="flex items-center gap-3">
                            <label className="text-xs text-gray-500 shrink-0">
                              {e.tipo === "EVENTO" ? "Fecha del evento" : "Fecha de la nota"}
                            </label>
                            <input type="date" value={editEntradaForm.fechaEntrada}
                              onChange={ev => setEditEntradaForm(p => ({ ...p, fechaEntrada: ev.target.value }))}
                              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                          </div>
                        )}
                        <textarea
                          value={editEntradaForm.contenido}
                          onChange={ev => setEditEntradaForm(p => ({ ...p, contenido: ev.target.value }))}
                          placeholder={e.tipo === "COMENTARIO" ? "Escribe tu nota…" : "Notas adicionales (opcional)"}
                          rows={e.tipo === "COMENTARIO" ? 3 : 2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white resize-none"
                          {...(e.tipo === "COMENTARIO" ? { autoFocus: true } : {})}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => guardarEntrada(e.id, e.tipo)} disabled={guardando}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                            style={{ backgroundColor: TEAL }}>
                            {guardando ? "Guardando…" : "Guardar"}
                          </button>
                          <button onClick={() => setEditEntradaId(null)}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-white/60 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Modo lectura ── */
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${cs.labelColor}`}>{cs.label}</span>
                            <span className="text-xs text-gray-400">{fechaDisplay}</span>
                            {isFutureCita && (() => {
                              const dias = Math.ceil((new Date(e.fechaCita!).getTime() - now) / 86400000)
                              return (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                  {dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
                                </span>
                              )
                            })()}
                          </div>
                          {e.titulo && e.titulo !== "Nota" && (
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">{e.titulo}</h4>
                          )}
                          {e.contenido && (
                            <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{e.contenido}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 flex-wrap">
                            {e.personaCita && (
                              <span>Con: <span className="font-medium text-gray-600">{e.personaCita}</span></span>
                            )}
                            {e.lugarCita && (
                              <span className="px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
                                {e.lugarCita === "PRESENCIAL" ? "Presencial" : e.lugarCita === "TEAMS" ? "Teams" : e.lugarCita === "ZOOM" ? "Zoom" : "Meet"}
                              </span>
                            )}
                            {e.motivoCita && <span className="text-gray-500 italic">{e.motivoCita}</span>}
                            {(e.importanciaCita ?? 0) >= 2 && (
                              <span className="px-2 py-0.5 rounded-full font-bold"
                                style={e.importanciaCita === 3 ? { backgroundColor: "#fef2f2", color: "#dc2626" } : { backgroundColor: "#fff7ed", color: "#f97316" }}>
                                {e.importanciaCita === 3 ? "Crítica" : "Importante"}
                              </span>
                            )}
                            <span>— {e.autor}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => abrirEditEntrada(e)}
                            className="p-1.5 rounded-lg hover:bg-white/70 transition-colors text-gray-300 hover:text-blue-500"
                            title="Editar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => eliminarEntrada(e.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
                            title="Eliminar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return null
          })
          })()}
        </div>
      )}

      </>}
    </div>
  )
}
