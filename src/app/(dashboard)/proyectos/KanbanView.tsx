"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useDraggable, useDroppable, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core"
import { TEAL, ORANGE } from "@/lib/brand"

interface Hospital { id: string; nombre: string; ciudad: string }
interface Responsable { id: string; nombre: string }
interface FaseResumen { id: string; tipo: string; estado: string; orden: number }
interface Proyecto {
  id: string
  titulo: string
  estado: string
  prioridad: number
  presupuesto: number | null
  fechaInicio: string | null
  fechaFinPlan: string | null
  creadoEn: string
  hospital: Hospital
  responsable: Responsable | null
  fases: FaseResumen[]
  visitas: { id: string }[]
  solicitudes: { id: string }[]
  hardwareUnidades: { id: string }[]
}

const ESTADOS = ["NUEVO", "EN_CURSO", "PAUSADO", "COMPLETADO", "CANCELADO"] as const

const ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado",
  COMPLETADO: "Completado", CANCELADO: "Cancelado",
}
const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  NUEVO:      { bg: "#f0f9ff", text: "#0369a1" },
  EN_CURSO:   { bg: `${TEAL}18`, text: TEAL },
  PAUSADO:    { bg: "#fef3c7", text: "#d97706" },
  COMPLETADO: { bg: "#f0fdf4", text: "#16a34a" },
  CANCELADO:  { bg: "#fef2f2", text: "#dc2626" },
}
const PRIORIDAD_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: "Normal",  color: "#6b7280" },
  1: { label: "Alta",    color: ORANGE },
  2: { label: "Crítica", color: "#dc2626" },
}

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function progreso(fases: FaseResumen[]) {
  if (!fases.length) return 0
  return Math.round((fases.filter(f => f.estado === "COMPLETADO").length / fases.length) * 100)
}

function estadoEfectivo(item: Proyecto): string {
  if (item.estado === "PAUSADO" || item.estado === "CANCELADO") return item.estado
  if (!item.fases.length) return "NUEVO"
  if (item.fases.every(f => f.estado === "COMPLETADO")) return "COMPLETADO"
  if (item.fases.some(f => f.estado === "EN_PROGRESO" || f.estado === "COMPLETADO")) return "EN_CURSO"
  return "NUEVO"
}

function IconGrip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
      <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
    </svg>
  )
}

function CardContent({ item }: { item: Proyecto }) {
  const pct = progreso(item.fases)
  const ef = estadoEfectivo(item)
  const estadoStyle = ESTADO_COLOR[ef] ?? { bg: "#f3f4f6", text: "#6b7280" }
  const prio = PRIORIDAD_LABEL[item.prioridad]
  const retrasado = item.fechaFinPlan && new Date(item.fechaFinPlan) < new Date()
    && ef !== "COMPLETADO" && ef !== "CANCELADO"
  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
          {ESTADO_LABEL[ef]}
        </span>
        {item.prioridad > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50" style={{ color: prio.color }}>{prio.label}</span>
        )}
        {retrasado && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Retrasado</span>}
      </div>
      <p className="text-sm font-bold text-gray-900 leading-snug mb-0.5 line-clamp-2">{item.titulo}</p>
      <p className="text-xs text-gray-500 mb-2 truncate">{item.hospital.nombre}</p>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
      </div>
      <div className="flex gap-3 text-[10px] text-gray-400">
        <span>{item.visitas.length} vis.</span>
        <span>{item.solicitudes.length} sol.</span>
        <span>{item.hardwareUnidades.length} HW</span>
        {item.fechaFinPlan && <span className="ml-auto">{fmtFecha(item.fechaFinPlan)}</span>}
      </div>
    </>
  )
}

function KanbanCard({ item }: { item: Proyecto }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, position: "relative" as const, zIndex: 50 }
    : undefined
  return (
    <div ref={setNodeRef} style={style} className={`group ${isDragging ? "opacity-25" : ""}`}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 card-hover">
        <div className="flex items-center justify-between mb-2">
          <div
            {...listeners} {...attributes}
            className="cursor-grab active:cursor-grabbing p-1 -m-1 text-gray-300 hover:text-gray-500 transition-colors touch-none"
            title="Arrastrar"
          >
            <IconGrip />
          </div>
          <Link href={`/proyectos/${item.id}`} className="text-[10px] font-semibold text-teal-600 hover:text-teal-800 transition-colors">
            Abrir →
          </Link>
        </div>
        <CardContent item={item} />
      </div>
    </div>
  )
}

function KanbanColumn({ estado, items }: { estado: string; items: Proyecto[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  const col = ESTADO_COLOR[estado] ?? { bg: "#f3f4f6", text: "#6b7280" }
  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-2" style={{ backgroundColor: col.bg }}>
        <span className="text-xs font-bold" style={{ color: col.text }}>{ESTADO_LABEL[estado]}</span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/70" style={{ color: col.text }}>{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 min-h-[80px] rounded-xl p-1 transition-colors duration-150"
        style={{ backgroundColor: isOver ? `${TEAL}0a` : "transparent" }}
      >
        {items.map(item => <KanbanCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}

export default function KanbanView({
  items,
  onMove,
}: {
  items: Proyecto[]
  onMove: (id: string, newEstado: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const item = items.find(i => i.id === active.id)
    if (!item || estadoEfectivo(item) === over.id) return
    onMove(active.id as string, over.id as string)
  }

  const activeItem = activeId ? items.find(i => i.id === activeId) ?? null : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {ESTADOS.map(estado => (
          <KanbanColumn
            key={estado}
            estado={estado}
            items={items.filter(i => estadoEfectivo(i) === estado)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="w-72 rotate-1 shadow-2xl">
            <div className="bg-white rounded-2xl border-2 p-4" style={{ borderColor: TEAL }}>
              <CardContent item={activeItem} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
