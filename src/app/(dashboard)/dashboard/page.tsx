import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"

import {
  IconHospital, IconUsers, IconClipboard, IconTrendingUp,
  IconCheckCircle, IconFileText, IconMap, IconCalendar, IconStar,
  IconShieldAlert,
} from "@/components/ui/Icons"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { AlertasPanel } from "@/components/AlertasPanel"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}
const ETAPA_COLOR: Record<string, string> = {
  IDENTIFICADO: "bg-gray-100 text-gray-600",
  PRIMERA_VISITA: "bg-blue-50 text-blue-600",
  PROPUESTA: "bg-amber-50 text-amber-600",
  NEGOCIACION: "bg-purple-50 text-purple-700",
  GANADO: "bg-green-50 text-green-700",
  PERDIDO: "bg-red-50 text-red-500",
}
const ETAPA_LABEL: Record<string, string> = {
  IDENTIFICADO: "Identificado", PRIMERA_VISITA: "Primera visita",
  PROPUESTA: "Propuesta", NEGOCIACION: "Negociacion",
  GANADO: "Ganado", PERDIDO: "Perdido",
}
const ETAPA_BAR_COLOR: Record<string, string> = {
  IDENTIFICADO: "#94a3b8", PRIMERA_VISITA: "#60a5fa",
  PROPUESTA: "#f59e0b", NEGOCIACION: "#a78bfa", GANADO: "#10b981",
}
const ESTADO_MOD_COLOR: Record<string, string> = {
  PENDIENTE: "#94a3b8", EN_INSTALACION: "#60a5fa",
  INSTALADO: TEAL, FORMACION: "#f59e0b", VALIDADO: "#10b981",
}
const ESTADO_MOD_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente", EN_INSTALACION: "En instalación",
  INSTALADO: "Instalado", FORMACION: "Formación", VALIDADO: "Validado",
}
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

function fmtEuros(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

function calcTrend(curr: number, prev: number): number | undefined {
  if (prev === 0) return undefined
  return Math.round(((curr - prev) / prev) * 100)
}

function agruparPorMes(fechas: Date[], n: number): { mes: string; v: number }[] {
  const ahora = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (n - 1 - i), 1)
    const count = fechas.filter(f => f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth()).length
    return { mes: MESES[d.getMonth()], v: count }
  })
}

function agruparPrevisionPorMes(
  ops: { valorEstimado: number | null; probabilidad: number | null; fechaCierre: Date | null }[],
  n: number
): { mes: string; v: number }[] {
  const ahora = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1)
    const sum = ops
      .filter(o => o.fechaCierre && o.fechaCierre.getFullYear() === d.getFullYear() && o.fechaCierre.getMonth() === d.getMonth())
      .reduce((s, o) => s + (o.valorEstimado ?? 0) * ((o.probabilidad ?? 50) / 100), 0)
    return { mes: MESES[d.getMonth()], v: Math.round(sum) }
  })
}

// ─── Subcomponentes ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, trend }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; trend?: number
}) {
  return (
    <div className="card-hover bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">{icon}</span>
        {trend !== undefined && (
          <span className={`pop-in text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend > 0 ? "bg-green-50 text-green-600" : trend < 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="number-reveal text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-gray-800">{title}</h2>
      {link && <Link href={link} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>{linkLabel ?? "Ver todos"}</Link>}
    </div>
  )
}

function BarChart({ data }: { data: { mes: string; v: number }[] }) {
  const W = 400; const H = 90
  const PAD = { t: 14, r: 8, b: 20, l: 8 }
  const maxV = Math.max(...data.map(d => d.v), 1)
  const n = data.length
  const slotW = (W - PAD.l - PAD.r) / n
  const barW = Math.max(10, slotW * 0.55)
  const cH = H - PAD.t - PAD.b
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {data.map((d, i) => {
        const bH = d.v === 0 ? 2 : Math.max(4, (d.v / maxV) * cH)
        const cx = PAD.l + slotW * i + slotW / 2
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={PAD.t + cH - bH} width={barW} height={bH} rx={3} fill={TEAL} fillOpacity={d.v === 0 ? 0.2 : 0.85} />
            {d.v > 0 && <text x={cx} y={PAD.t + cH - bH - 3} textAnchor="middle" fontSize={9} fill="#374151" fontWeight="600">{d.v}</text>}
            <text x={cx} y={H - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.mes}</text>
          </g>
        )
      })}
    </svg>
  )
}

function FunnelChart({ data }: { data: { etapa: string; label: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.etapa} className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-24 shrink-0 truncate">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: d.count === 0 ? "3px" : `${Math.max(6, (d.count / maxCount) * 100)}%`, backgroundColor: ETAPA_BAR_COLOR[d.etapa] ?? TEAL }} />
          </div>
          <span className="font-semibold text-gray-700 w-5 text-right shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

function PrediccionBars({ data }: { data: { mes: string; v: number }[] }) {
  const W = 400; const H = 90
  const PAD = { t: 16, r: 8, b: 20, l: 8 }
  const maxV = Math.max(...data.map(d => d.v), 1)
  const n = data.length
  const slotW = (W - PAD.l - PAD.r) / n
  const barW = Math.max(10, slotW * 0.55)
  const cH = H - PAD.t - PAD.b
  const fmt = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {data.map((d, i) => {
        const bH = d.v === 0 ? 2 : Math.max(4, (d.v / maxV) * cH)
        const cx = PAD.l + slotW * i + slotW / 2
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={PAD.t + cH - bH} width={barW} height={bH} rx={3} fill={ORANGE} fillOpacity={d.v === 0 ? 0.15 : 0.75} />
            {d.v > 0 && <text x={cx} y={PAD.t + cH - bH - 3} textAnchor="middle" fontSize={8} fill="#92400e">€{fmt(d.v)}</text>}
            <text x={cx} y={H - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.mes}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Top5Chart({ data }: { data: { nombre: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-400 py-6 text-center">Sin datos</p>
  const maxCount = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="text-gray-600 w-28 truncate shrink-0" title={d.nombre}>{d.nombre}</span>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div className="h-full rounded"
              style={{ width: `${Math.max(6, (d.count / maxCount) * 100)}%`, backgroundColor: TEAL, opacity: 0.5 + 0.5 * (1 - i / Math.max(data.length - 1, 1)) }} />
          </div>
          <span className="font-semibold text-gray-600 w-6 text-right shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

function EstadoModulosChart({ data }: { data: { estado: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p className="text-xs text-gray-400 py-6 text-center">Sin módulos asignados</p>
  const maxCount = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.estado} className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-28 shrink-0 truncate">{ESTADO_MOD_LABEL[d.estado] ?? d.estado}</span>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div className="h-full rounded"
              style={{ width: `${Math.max(4, (d.count / maxCount) * 100)}%`, backgroundColor: ESTADO_MOD_COLOR[d.estado] ?? TEAL }} />
          </div>
          <span className="font-semibold text-gray-700 w-6 text-right shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

function QuickLink({ href, label, Icon, color }: {
  href: string; label: string; Icon: React.ComponentType<{ size?: number }>; color: string
}) {
  return (
    <Link href={href} className="card-hover flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all group">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}><Icon size={18} /></span>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 leading-tight">{label}</span>
    </Link>
  )
}

function QuickActionsField() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 md:hidden">Acciones rapidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/visitas"
          className="card-hover group flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-teal-100 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/30 hover:border-teal-200 dark:hover:border-teal-800 transition-all"
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: TEAL }}
          >
            <IconClipboard size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">Nueva visita</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Registrar visita a hospital</p>
          </div>
        </Link>
        <Link
          href="/visitas?fecha=hoy"
          className="card-hover group flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-teal-100 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/30 hover:border-teal-200 dark:hover:border-teal-800 transition-all"
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: TEAL }}
          >
            <IconFileText size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">Mis visitas hoy</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ver agenda del dia</p>
          </div>
        </Link>
        <Link
          href="/visitas/calendario"
          className="card-hover group flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-teal-100 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/30 hover:border-teal-200 dark:hover:border-teal-800 transition-all"
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: TEAL }}
          >
            <IconCalendar size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">Calendario</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Vista mensual de visitas</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function ProximaCard({ id, hospital, fecha: fechaStr, usuario, href }: {
  id: string; hospital: string; fecha: string; usuario?: string; href?: string
}) {
  const fecha = new Date(fechaStr)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dias = Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000)
  const urgente = dias <= 3
  const label = dias === 0 ? "Hoy" : dias === 1 ? "Manana" : `En ${dias} dias`
  const cls = "shrink-0 w-44 bg-gray-50 rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all block"
  const inner = (
    <>
      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: urgente ? "#F7941D" : TEAL }}>{label}</p>
      <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{hospital}</p>
      {usuario && <p className="text-xs text-gray-400 mt-0.5">{usuario}</p>}
      <p className="text-xs text-gray-300 mt-2">{fecha.toLocaleDateString("es-ES")}</p>
    </>
  )
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div key={id} className={cls}>{inner}</div>
}

function OpCard({ titulo, hospitalNombre, etapa, valorEstimado, probabilidad }: {
  titulo: string; hospitalNombre: string; etapa: string; valorEstimado: number | null; probabilidad: number | null
}) {
  const prob = probabilidad ?? 50
  const probCls = prob >= 75 ? "bg-green-50 text-green-600" : prob >= 50 ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
  return (
    <Link href="/ventas/pipeline" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className="w-1 h-8 rounded-full shrink-0 bg-gray-100 overflow-hidden">
        <div className="w-full rounded-full" style={{ height: `${prob}%`, backgroundColor: prob >= 75 ? "#10b981" : prob >= 50 ? "#F7941D" : "#d1d5db" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{titulo}</p>
        <p className="text-xs text-gray-400 truncate">{hospitalNombre}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full block ${probCls}`}>{prob}%</span>
        {(valorEstimado ?? 0) > 0 && <p className="text-xs text-gray-400 mt-0.5">{fmtEuros(valorEstimado!)}</p>}
      </div>
    </Link>
  )
}

// ── Mis Favoritos ─────────────────────────────────────────────────────────────
async function FavoritosSection({ userId }: { userId: string }) {
  const favoritos = await db.favorito.findMany({
    where: { usuarioId: userId },
    orderBy: { creadoEn: "desc" },
    take: 12,
  })

  if (favoritos.length === 0) return null

  const hospitalIds = favoritos.filter(f => f.tipo === "HOSPITAL").map(f => f.entidadId)
  const proyectoIds = favoritos.filter(f => f.tipo === "PROYECTO").map(f => f.entidadId)

  const [hospitales, proyectos] = await Promise.all([
    hospitalIds.length > 0
      ? db.hospital.findMany({
          where: { id: { in: hospitalIds } },
          select: { id: true, nombre: true, ciudad: true, tipo: true },
        })
      : Promise.resolve([]),
    proyectoIds.length > 0
      ? db.proyecto.findMany({
          where: { id: { in: proyectoIds } },
          select: { id: true, titulo: true, estado: true, hospital: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
  ])

  const hospitalMap = new Map(hospitales.map(h => [h.id, h]))
  const proyectoMap = new Map(proyectos.map(p => [p.id, p]))

  const items: { key: string; tipo: "HOSPITAL" | "PROYECTO"; href: string; titulo: string; sub: string }[] = []
  for (const f of favoritos) {
    if (f.tipo === "HOSPITAL") {
      const h = hospitalMap.get(f.entidadId)
      if (h) items.push({ key: f.id, tipo: "HOSPITAL", href: `/hospitales/${h.id}`, titulo: h.nombre, sub: h.ciudad })
    } else {
      const p = proyectoMap.get(f.entidadId)
      if (p) items.push({ key: f.id, tipo: "PROYECTO", href: `/proyectos/${p.id}`, titulo: p.titulo, sub: p.hospital.nombre })
    }
  }

  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <IconStar size={16} filled className="text-amber-400" />
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Mis favoritos</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(item => (
          <Link
            key={item.key}
            href={item.href}
            className="card-hover flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 transition-all group"
          >
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={item.tipo === "HOSPITAL"
                ? { backgroundColor: "#f0fdfa", color: TEAL }
                : { backgroundColor: "#f0fdf4", color: "#16a34a" }
              }
            >
              {item.tipo === "HOSPITAL" ? <IconHospital size={16} /> : <IconCheckCircle size={16} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                {item.titulo}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.sub}</p>
            </div>
            <IconStar size={14} filled className="text-amber-400 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ADMIN ────────────────────────────────────────────────────────────
async function DashboardAdmin({ userId }: { userId: string }) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioPrevMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const finPrevMes = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
  const inicioSeisM = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)
  const en14dias = new Date(ahora.getTime() + 14 * 86400000)

  const configApp = await db.configApp.findFirst()
  const crmActivo = configApp?.crmActivo ?? true

  const [
    totalHospitales, totalUsuarios, visitasMes, visitasPrevMes, ultimasVisitas,
    totalOportunidades, valorPipeline, visitasChart, opCalientes, proximasVisitas,
    funnelRaw, opsPrevRaw, top5Raw,
    proyectosActivos, proximasCitas,
    hwGarantiaVencidaCount, hwMantenimientoVencidoCount,
  ] = await Promise.all([
    db.hospital.count({ where: { activo: true } }),
    db.usuario.count({ where: { activo: true } }),
    db.visita.count({ where: { creadoEn: { gte: inicioMes } } }),
    db.visita.count({ where: { creadoEn: { gte: inicioPrevMes, lte: finPrevMes } } }),
    db.visita.findMany({ take: 6, orderBy: { fecha: "desc" }, include: { hospital: { select: { nombre: true } }, usuario: { select: { nombre: true } } } }),
    db.oportunidad.count({ where: { etapa: { notIn: ["PERDIDO"] } } }),
    db.oportunidad.aggregate({ where: { etapa: { notIn: ["PERDIDO"] } }, _sum: { valorEstimado: true } }),
    db.visita.findMany({ where: { creadoEn: { gte: inicioSeisM } }, select: { creadoEn: true } }),
    db.oportunidad.findMany({ where: { etapa: { notIn: ["PERDIDO", "GANADO"] } }, orderBy: [{ valorEstimado: "desc" }], take: 8, include: { hospital: { select: { nombre: true } } } }),
    db.visita.findMany({ where: { fecha: { gte: ahora } }, orderBy: { fecha: "asc" }, take: 5, include: { hospital: { select: { nombre: true } }, usuario: { select: { nombre: true } } } }),
    db.oportunidad.groupBy({ by: ["etapa"], where: { etapa: { notIn: ["PERDIDO"] } }, _count: { _all: true } }),
    db.oportunidad.findMany({ where: { etapa: { notIn: ["PERDIDO", "GANADO"] }, fechaCierre: { not: null } }, select: { valorEstimado: true, probabilidad: true, fechaCierre: true } }),
    db.hospital.findMany({ where: { activo: true }, orderBy: { visitas: { _count: "desc" } }, take: 5, select: { nombre: true, _count: { select: { visitas: true } } } }),
    db.proyecto.findMany({
      where: { estado: { notIn: ["COMPLETADO", "CANCELADO"] } },
      select: { id: true, titulo: true, estado: true, fechaFinPlan: true, hospital: { select: { nombre: true } }, fases: { select: { estado: true } } },
      orderBy: { fechaFinPlan: "asc" }, take: 8,
    }),
    db.entradaTimeline.findMany({
      where: { tipo: "CITA", fechaCita: { gte: ahora, lte: en14dias } },
      select: { id: true, titulo: true, fechaCita: true, personaCita: true, lugarCita: true, importanciaCita: true, proyecto: { select: { id: true, titulo: true, hospital: { select: { nombre: true } } } } },
      orderBy: { fechaCita: "asc" }, take: 6,
    }),
    db.hardwareUnidad.count({
      where: { fechaGarantia: { lt: ahora }, estado: { notIn: ["BAJA", "RETIRADO"] } },
    }),
    db.hardwareUnidad.count({
      where: { proximoMantenimiento: { lt: ahora }, estado: { notIn: ["BAJA", "RETIRADO"] } },
    }),
  ])

  const trendVisitas = calcTrend(visitasMes, visitasPrevMes)
  const chartData = agruparPorMes(visitasChart.map(v => new Date(v.creadoEn)), 6)
  const opOrdenadas = opCalientes.map(op => ({ ...op, heat: (op.valorEstimado ?? 0) * ((op.probabilidad ?? 50) / 100) })).sort((a, b) => b.heat - a.heat).slice(0, 5)

  const proyectosCon = proyectosActivos.map(p => {
    const total = p.fases.length; const ok = p.fases.filter(f => f.estado === "COMPLETADO").length
    const pct = total ? Math.round((ok / total) * 100) : 0
    const dias = p.fechaFinPlan ? Math.ceil((new Date(p.fechaFinPlan).getTime() - ahora.getTime()) / 86400000) : null
    return { ...p, pct, dias }
  })
  const promedioProgreso = proyectosCon.length ? Math.round(proyectosCon.reduce((s, p) => s + p.pct, 0) / proyectosCon.length) : 0

  const ETAPAS_FUNNEL = ["IDENTIFICADO", "PRIMERA_VISITA", "PROPUESTA", "NEGOCIACION", "GANADO"]
  const funnelData = ETAPAS_FUNNEL.map(etapa => ({
    etapa, label: ETAPA_LABEL[etapa],
    count: funnelRaw.find(r => r.etapa === etapa)?._count._all ?? 0,
  }))
  const previsionData = agruparPrevisionPorMes(opsPrevRaw.map(o => ({ ...o, fechaCierre: o.fechaCierre ? new Date(o.fechaCierre) : null })), 6)
  const top5Data = top5Raw.map(h => ({ nombre: h.nombre, count: h._count.visitas }))

  // ── Alertas proactivas ─────────────────────────────────────────────────────
  const hace60 = new Date(ahora.getTime() - 60 * 86400000)
  const hace30 = new Date(ahora.getTime() - 30 * 86400000)
  const en7dias = new Date(ahora.getTime() + 7 * 86400000)
  const en60dias = new Date(ahora.getTime() + 60 * 86400000)

  const hConVisitaReciente = await db.visita.findMany({
    where: { fecha: { gte: hace60 } },
    select: { hospitalId: true },
    distinct: ["hospitalId"],
  })
  const idsConVisita = new Set(hConVisitaReciente.map(v => v.hospitalId))

  const [proyectosVenc, opEstancadas, hwHuerfano, hospitalesInactivos, fasesRetrasadasGlobal, hitosRetrasadosGlobal, hwGarantia] = await Promise.all([
    db.proyecto.findMany({
      where: { estado: { notIn: ["COMPLETADO", "CANCELADO"] }, fechaFinPlan: { gte: ahora, lte: en7dias } },
      select: { id: true, titulo: true, fechaFinPlan: true, hospital: { select: { nombre: true } } },
      orderBy: { fechaFinPlan: "asc" },
      take: 5,
    }),
    db.oportunidad.findMany({
      where: { etapa: { notIn: ["GANADO", "PERDIDO"] }, editadoEn: { lte: hace30 } },
      select: { id: true, titulo: true, etapa: true, editadoEn: true, hospital: { select: { nombre: true } } },
      orderBy: { editadoEn: "asc" },
      take: 5,
    }),
    db.hardwareUnidad.findMany({
      where: { estado: "ASIGNADO", proyecto: { estado: "COMPLETADO" } },
      select: { id: true, catalogo: { select: { marca: true, modelo: true } }, proyecto: { select: { id: true, titulo: true } } },
      take: 5,
    }),
    db.hospital.findMany({
      where: { activo: true, id: { notIn: Array.from(idsConVisita) } },
      select: { id: true, nombre: true, ciudad: true },
      orderBy: { nombre: "asc" },
      take: 5,
    }),
    db.faseProyecto.findMany({
      where: { fechaPlan: { lt: ahora }, estado: { not: "COMPLETADO" }, proyecto: { estado: { notIn: ["COMPLETADO", "CANCELADO"] } } },
      select: { id: true, nombre: true, fechaPlan: true, proyecto: { select: { id: true, titulo: true } } },
      orderBy: { fechaPlan: "asc" }, take: 5,
    }),
    db.hito.findMany({
      where: { fecha: { lt: ahora }, completado: false, proyecto: { estado: { notIn: ["COMPLETADO", "CANCELADO"] } } },
      select: { id: true, titulo: true, fecha: true, proyecto: { select: { id: true, titulo: true } } },
      orderBy: { fecha: "asc" }, take: 5,
    }),
    db.hardwareUnidad.findMany({
      where: { estado: { notIn: ["BAJA", "RETIRADO"] }, fechaGarantia: { gte: ahora, lte: en60dias } },
      select: { id: true, numSerie: true, fechaGarantia: true, catalogo: { select: { marca: true, modelo: true } }, proyecto: { select: { id: true, titulo: true } }, hospital: { select: { nombre: true } } },
      orderBy: { fechaGarantia: "asc" }, take: 5,
    }),
  ])

  type AlertaItem = { key: string; titulo: string; sub: string; href: string; color: string; bg: string }
  const alertas: AlertaItem[] = []

  proyectosVenc.forEach(p => {
    const dias = p.fechaFinPlan ? Math.ceil((new Date(p.fechaFinPlan).getTime() - ahora.getTime()) / 86400000) : 0
    alertas.push({
      key: `pv-${p.id}`,
      titulo: p.titulo,
      sub: `${p.hospital.nombre} · vence en ${dias} día${dias !== 1 ? "s" : ""}`,
      href: `/proyectos/${p.id}`,
      color: "#dc2626", bg: "#fef2f2",
    })
  })
  opEstancadas.forEach(o => {
    const dias = Math.floor((ahora.getTime() - new Date(o.editadoEn).getTime()) / 86400000)
    alertas.push({
      key: `oe-${o.id}`,
      titulo: o.titulo,
      sub: `${o.hospital.nombre} · sin cambios hace ${dias} días`,
      href: "/ventas/pipeline",
      color: "#d97706", bg: "#fef3c7",
    })
  })
  hwHuerfano.forEach(u => {
    alertas.push({
      key: `hw-${u.id}`,
      titulo: `${u.catalogo.marca} ${u.catalogo.modelo}`,
      sub: `Asignado a proyecto completado: ${u.proyecto?.titulo ?? "—"}`,
      href: u.proyecto ? `/proyectos/${u.proyecto.id}` : "/hardware",
      color: "#7c3aed", bg: "#f5f3ff",
    })
  })
  hospitalesInactivos.forEach(h => {
    alertas.push({
      key: `hi-${h.id}`,
      titulo: h.nombre,
      sub: `${h.ciudad} · sin visitas en más de 60 días`,
      href: `/hospitales/${h.id}`,
      color: "#6b7280", bg: "#f3f4f6",
    })
  })
  fasesRetrasadasGlobal.forEach(f => {
    alertas.push({
      key: `frg-${f.id}`,
      titulo: f.proyecto.titulo,
      sub: `Fase "${f.nombre}" vencida el ${new Date(f.fechaPlan!).toLocaleDateString("es-ES")}`,
      href: `/proyectos/${f.proyecto.id}`,
      color: "#dc2626", bg: "#fef2f2",
    })
  })
  hitosRetrasadosGlobal.forEach(h => {
    alertas.push({
      key: `hrg-${h.id}`,
      titulo: h.proyecto.titulo,
      sub: `Hito "${h.titulo}" sin completar desde ${new Date(h.fecha).toLocaleDateString("es-ES")}`,
      href: `/proyectos/${h.proyecto.id}`,
      color: "#f97316", bg: "#fff7ed",
    })
  })
  hwGarantia.forEach(u => {
    const dias = u.fechaGarantia ? Math.ceil((new Date(u.fechaGarantia).getTime() - ahora.getTime()) / 86400000) : 0
    const contexto = u.proyecto ? u.proyecto.titulo : (u.hospital?.nombre ?? "Sin asignar")
    alertas.push({
      key: `hg-${u.id}`,
      titulo: `${u.catalogo.marca} ${u.catalogo.modelo}${u.numSerie ? ` (S/N ${u.numSerie})` : ""}`,
      sub: `Garantía vence en ${dias} día${dias !== 1 ? "s" : ""} · ${contexto}`,
      href: u.proyecto ? `/proyectos/${u.proyecto.id}` : "/hardware",
      color: "#0369a1", bg: "#f0f9ff",
    })
  })

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Vision general del sistema" />

      <QuickActionsField />

      <FavoritosSection userId={userId} />

      {/* KPIs */}
      <div className="stagger-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Hospitales activos" value={totalHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Usuarios activos" value={totalUsuarios} icon={<IconUsers size={18} />} />
        <KpiCard label="Visitas este mes" value={visitasMes} sub={trendVisitas !== undefined ? `vs ${visitasPrevMes} el mes pasado` : undefined} icon={<IconClipboard size={18} />} trend={trendVisitas} />
        {crmActivo
          ? <KpiCard label="Pipeline activo" value={fmtEuros(valorPipeline._sum.valorEstimado ?? 0)} sub={`${totalOportunidades} oportunidades`} icon={<IconTrendingUp size={18} />} />
          : <KpiCard label="Proyectos activos" value={proyectosActivos.length} sub={`${promedioProgreso}% progreso medio`} icon={<IconCheckCircle size={18} />} />
        }
      </div>

      {/* Alertas hardware */}
      {(hwGarantiaVencidaCount > 0 || hwMantenimientoVencidoCount > 0) && (
        <Link
          href="/hardware"
          className="card-hover flex items-center gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-800 transition-all mb-6 group"
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: ORANGE }}
          >
            <IconShieldAlert size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              Alertas de hardware
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {[
                hwGarantiaVencidaCount > 0 && `${hwGarantiaVencidaCount} garantía${hwGarantiaVencidaCount !== 1 ? "s" : ""} vencida${hwGarantiaVencidaCount !== 1 ? "s" : ""}`,
                hwMantenimientoVencidoCount > 0 && `${hwMantenimientoVencidoCount} mantenimiento${hwMantenimientoVencidoCount !== 1 ? "s" : ""} vencido${hwMantenimientoVencidoCount !== 1 ? "s" : ""}`,
              ].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span
            className="text-lg font-black shrink-0 tabular-nums"
            style={{ color: ORANGE }}
          >
            {hwGarantiaVencidaCount + hwMantenimientoVencidoCount}
          </span>
        </Link>
      )}

      {/* Accesos rápidos */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { label: "Hospitales", href: "/hospitales", icon: <IconHospital size={14} /> },
          { label: "Visitas", href: "/visitas", icon: <IconClipboard size={14} /> },
          { label: "Proyectos", href: "/proyectos", icon: <IconCheckCircle size={14} /> },
          { label: "Hardware", href: "/hardware", icon: <IconFileText size={14} /> },
          { label: "Mapa", href: "/mapa", icon: <IconMap size={14} /> },
          { label: "Usuarios", href: "/admin/usuarios", icon: <IconUsers size={14} /> },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shrink-0">
            <span className="text-gray-400 dark:text-gray-500">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Fila 1: Visitas por mes + Funnel/Proyectos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Visitas por mes</h2>
              <p className="text-xs text-gray-400">Últimos 6 meses</p>
            </div>
            <span className="text-xs text-gray-400">{chartData.reduce((s, d) => s + d.v, 0)} total</span>
          </div>
          <BarChart data={chartData} />
        </div>
        {crmActivo ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Funnel del pipeline</h2>
            <p className="text-xs text-gray-400 mb-4">Oportunidades activas por etapa</p>
            <FunnelChart data={funnelData} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Progreso de proyectos</h2>
            <p className="text-xs text-gray-400 mb-3">Cobertura media: <span className="font-bold" style={{ color: TEAL }}>{promedioProgreso}%</span></p>
            <div className="space-y-2.5">
              {proyectosCon.slice(0, 5).map(p => (
                <div key={p.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 truncate max-w-[160px]">{p.hospital.nombre}</span>
                    <span className="font-bold shrink-0 ml-2" style={{ color: p.pct === 100 ? "#16a34a" : TEAL }}>{p.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: p.pct === 100 ? "#16a34a" : TEAL }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fila 2: Previsión/Próximas citas + Top 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {crmActivo ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Previsión de cierre</h2>
            <p className="text-xs text-gray-400 mb-4">Pipeline ponderado (valor × prob.) próximos 6 meses</p>
            <PrediccionBars data={previsionData} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Próximas citas (14 días)" link="/proyectos" /></div>
            {proximasCitas.length === 0 ? (
              <p className="text-sm text-gray-400 p-5 text-center">Sin citas próximas</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {proximasCitas.map(c => {
                  const dias = c.fechaCita ? Math.ceil((new Date(c.fechaCita).getTime() - ahora.getTime()) / 86400000) : 0
                  return (
                    <Link key={c.id} href={`/proyectos/${c.proyecto.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white text-[10px] font-bold" style={{ backgroundColor: dias <= 1 ? "#dc2626" : dias <= 3 ? "#f97316" : TEAL }}>
                        <span className="text-sm font-black leading-none">{dias <= 0 ? "Hoy" : dias}</span>
                        {dias > 0 && <span>d</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.titulo}</p>
                        <p className="text-xs text-gray-400 truncate">{c.proyecto.hospital.nombre}{c.personaCita ? ` · ${c.personaCita}` : ""}</p>
                      </div>
                      {c.lugarCita && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>{c.lugarCita === "PRESENCIAL" ? "Presencial" : c.lugarCita === "TEAMS" ? "Teams" : c.lugarCita === "ZOOM" ? "Zoom" : "Meet"}</span>}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Top 5 hospitales</h2>
          <p className="text-xs text-gray-400 mb-4">Por número de visitas</p>
          <Top5Chart data={top5Data} />
        </div>
      </div>

      {/* Proyectos activos (siempre visible) */}
      <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <SectionHeader title="Proyectos activos" link="/proyectos" />
        </div>
        {proyectosCon.length === 0 ? (
          <p className="text-sm text-gray-400 p-5 text-center">Sin proyectos activos</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {proyectosCon.map(p => (
              <Link key={p.id} href={`/proyectos/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-teal-700 transition-colors">{p.hospital.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{p.titulo}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.pct === 100 ? "#16a34a" : TEAL }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{p.pct}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {p.dias !== null && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={p.dias <= 7 ? { backgroundColor: "#fef2f2", color: "#dc2626" } : p.dias <= 30 ? { backgroundColor: "#fff7ed", color: "#f97316" } : { backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                      {p.dias <= 0 ? "Vencido" : `${p.dias}d`}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Ultimas visitas" link="/admin/visitas" /></div>
          <div className="divide-y divide-gray-50">
            {ultimasVisitas.length === 0 ? <p className="text-sm text-gray-400 p-5">Sin visitas aun.</p>
              : ultimasVisitas.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                    <p className="text-xs text-gray-400">{v.usuario.nombre} · {new Date(v.fecha).toLocaleDateString("es-ES")}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
                </div>
              ))}
          </div>
        </div>
        {crmActivo && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Oportunidades calientes" link="/ventas/pipeline" /></div>
            <div className="divide-y divide-gray-50">
              {opOrdenadas.length === 0 ? <EmptyState icon="pipeline" title="Sin oportunidades activas" />
                : opOrdenadas.map(op => <OpCard key={op.id} titulo={op.titulo} hospitalNombre={op.hospital.nombre} etapa={op.etapa} valorEstimado={op.valorEstimado} probabilidad={op.probabilidad} />)}
            </div>
          </div>
        )}
      </div>

      {proximasVisitas.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Proximas visitas planificadas" /></div>
          <div className="flex gap-3 p-4 overflow-x-auto">
            {proximasVisitas.map(v => <ProximaCard key={v.id} id={v.id} hospital={v.hospital.nombre} fecha={v.fecha.toString()} usuario={v.usuario.nombre} />)}
          </div>
        </div>
      )}

      <AlertasPanel alertas={alertas} variant="admin" />
    </div>
  )
}

// ── Dashboard VENTAS ───────────────────────────────────────────────────────────
async function DashboardVentas({ userId, nombre }: { userId: string; nombre: string }) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioPrevMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const finPrevMes = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
  const inicioSeisM = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
  const en7dias = new Date(ahora.getTime() + 7 * 86400000)

  const [misOps, misVisitas, misHospitales, visitasPrevMes, visitasChart, funnelRaw, opsPrevRaw, visitasHoy, opsProximas, recordatoriosHoyVentas, llamadasHoyVentas] = await Promise.all([
    db.oportunidad.findMany({ where: { usuarioId: userId }, orderBy: { editadoEn: "desc" }, take: 8, include: { hospital: { select: { nombre: true, ciudad: true } } } }),
    db.visita.findMany({ where: { usuarioId: userId }, take: 5, orderBy: { fecha: "desc" }, include: { hospital: { select: { nombre: true } } } }),
    db.hospital.count({ where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } } }),
    db.visita.count({ where: { usuarioId: userId, creadoEn: { gte: inicioPrevMes, lte: finPrevMes } } }),
    db.visita.findMany({ where: { usuarioId: userId, creadoEn: { gte: inicioSeisM } }, select: { creadoEn: true } }),
    db.oportunidad.groupBy({ by: ["etapa"], where: { usuarioId: userId, etapa: { notIn: ["PERDIDO"] } }, _count: { _all: true } }),
    db.oportunidad.findMany({ where: { usuarioId: userId, etapa: { notIn: ["PERDIDO", "GANADO"] }, fechaCierre: { not: null } }, select: { valorEstimado: true, probabilidad: true, fechaCierre: true } }),
    db.visita.findMany({ where: { usuarioId: userId, fecha: { gte: inicioDia, lt: finDia } }, include: { hospital: { select: { nombre: true } } }, take: 8 }),
    db.oportunidad.findMany({ where: { usuarioId: userId, etapa: { notIn: ["GANADO", "PERDIDO"] }, fechaCierre: { gte: ahora, lte: en7dias } }, include: { hospital: { select: { nombre: true } } }, orderBy: { fechaCierre: "asc" }, take: 5 }),
    db.recordatorio.findMany({ where: { usuarioId: userId, completado: false, fecha: { gte: inicioDia, lt: finDia } }, select: { id: true, titulo: true, fecha: true }, orderBy: { fecha: "asc" }, take: 5 }),
    db.registroLlamada.count({ where: { usuarioId: userId, fecha: { gte: inicioDia, lt: finDia } } }),
  ])

  const opsActivas = misOps.filter(o => o.etapa !== "PERDIDO")
  const totalPipeline = opsActivas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0)
  const visitasMes = misVisitas.filter(v => new Date(v.creadoEn) >= inicioMes).length
  const ganadas = misOps.filter(o => o.etapa === "GANADO")
  const trendVisitas = calcTrend(visitasMes, visitasPrevMes)
  const chartData = agruparPorMes(visitasChart.map(v => new Date(v.creadoEn)), 6)
  const opCalientes = opsActivas.filter(o => o.etapa !== "GANADO")
    .map(op => ({ ...op, heat: (op.valorEstimado ?? 0) * ((op.probabilidad ?? 50) / 100) }))
    .sort((a, b) => b.heat - a.heat).slice(0, 5)

  const ETAPAS_FUNNEL = ["IDENTIFICADO", "PRIMERA_VISITA", "PROPUESTA", "NEGOCIACION", "GANADO"]
  const funnelData = ETAPAS_FUNNEL.map(etapa => ({
    etapa, label: ETAPA_LABEL[etapa],
    count: funnelRaw.find(r => r.etapa === etapa)?._count._all ?? 0,
  }))
  const previsionData = agruparPrevisionPorMes(opsPrevRaw.map(o => ({ ...o, fechaCierre: o.fechaCierre ? new Date(o.fechaCierre) : null })), 6)
  const hayPrevision = previsionData.some(d => d.v > 0)

  const hayMiDiaVentas = visitasHoy.length > 0 || opsProximas.length > 0 || recordatoriosHoyVentas.length > 0 || llamadasHoyVentas > 0

  return (
    <div>
      <PageHeader title={`Hola, ${nombre.split(" ")[0]}`} subtitle="Aqui esta tu resumen de hoy" />

      <QuickActionsField />

      <FavoritosSection userId={userId} />

      {hayMiDiaVentas && (
        <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-bold text-gray-800">Mi día</span>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {visitasHoy.map(v => (
              <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <IconClipboard size={13} className="text-teal-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400">Visita de hoy</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
              </Link>
            ))}
            {opsProximas.map(o => {
              const dias = o.fechaCierre ? Math.ceil((new Date(o.fechaCierre).getTime() - ahora.getTime()) / 86400000) : 0
              return (
                <Link key={o.id} href="/ventas/pipeline" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: dias <= 2 ? "#fef2f2" : "#fef3c7", color: dias <= 2 ? "#ef4444" : "#f59e0b" }}>
                    <IconTrendingUp size={13} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{o.titulo}</p>
                    <p className="text-xs text-gray-400 truncate">{o.hospital.nombre}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: dias <= 2 ? "#fef2f2" : "#fef3c7", color: dias <= 2 ? "#ef4444" : "#f59e0b" }}>
                    {dias <= 0 ? "Hoy" : `En ${dias}d`}
                  </span>
                </Link>
              )
            })}
            {recordatoriosHoyVentas.map(r => (
              <Link key={r.id} href="/recordatorios" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-gray-400">Recordatorio de hoy</p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                  {new Date(r.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            ))}
            {llamadasHoyVentas > 0 && (
              <Link href="/llamadas" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/>
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">Llamadas de hoy</p>
                  <p className="text-xs text-gray-400">{llamadasHoyVentas} llamada{llamadasHoyVentas !== 1 ? "s" : ""} registrada{llamadasHoyVentas !== 1 ? "s" : ""}</p>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                  {llamadasHoyVentas}
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Pipeline activo" value={fmtEuros(totalPipeline)} sub={`${opsActivas.length} oportunidades`} icon={<IconTrendingUp size={18} />} />
        <KpiCard label="Contratos ganados" value={ganadas.length} sub="en total" icon={<IconCheckCircle size={18} />} />
        <KpiCard label="Hospitales en mi zona" value={misHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Visitas este mes" value={visitasMes} sub={trendVisitas !== undefined ? `vs ${visitasPrevMes} el mes pasado` : undefined} icon={<IconClipboard size={18} />} trend={trendVisitas} />
      </div>

      {/* Accesos rápidos */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { label: "Hospitales", href: "/hospitales", icon: <IconHospital size={14} /> },
          { label: "Visitas", href: "/visitas", icon: <IconClipboard size={14} /> },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shrink-0">
            <span className="text-gray-400">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Fila: Visitas por mes + Funnel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Mis visitas por mes</h2>
              <p className="text-xs text-gray-400">Últimos 6 meses</p>
            </div>
            <span className="text-xs text-gray-400">{chartData.reduce((s, d) => s + d.v, 0)} total</span>
          </div>
          <BarChart data={chartData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Mi funnel</h2>
          <p className="text-xs text-gray-400 mb-4">Mis oportunidades activas por etapa</p>
          <FunnelChart data={funnelData} />
        </div>
      </div>

      {/* Previsión (solo si hay datos) */}
      {hayPrevision && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Previsión de cierre</h2>
          <p className="text-xs text-gray-400 mb-4">Pipeline ponderado (valor × prob.) próximos 6 meses</p>
          <PrediccionBars data={previsionData} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Mis visitas recientes" link="/visitas" /></div>
          <div className="divide-y divide-gray-50">
            {misVisitas.length === 0 ? <p className="text-sm text-gray-400 p-5">Sin visitas aun.</p>
              : misVisitas.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                    <p className="text-xs text-gray-400">{new Date(v.fecha).toLocaleDateString("es-ES")}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Oportunidades calientes" link="/ventas/pipeline" /></div>
          <div className="divide-y divide-gray-50">
            {opCalientes.length === 0 ? <EmptyState icon="pipeline" title="Sin oportunidades activas" />
              : opCalientes.map(op => <OpCard key={op.id} titulo={op.titulo} hospitalNombre={op.hospital.nombre} etapa={op.etapa} valorEstimado={op.valorEstimado} probabilidad={op.probabilidad} />)}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionHeader title="Accesos rapidos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickLink href="/visitas?abrir=1"    label="Nueva visita"       Icon={IconClipboard}  color="bg-teal-50 text-teal-700" />
          <QuickLink href="/ventas/pipeline"   label="Pipeline de ventas" Icon={IconTrendingUp} color="bg-purple-50 text-purple-700" />
          <QuickLink href="/hospitales"        label="Mis hospitales"     Icon={IconHospital}   color="bg-blue-50 text-blue-700" />
        </div>
      </div>
    </div>
  )
}

// ── Dashboard PROYECTOS / TECNICO ──────────────────────────────────────────────
async function DashboardProyectos({ userId, nombre }: { userId: string; nombre: string }) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioPrevMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const finPrevMes = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
  const inicioSeisM = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)
  const en7dias = new Date(ahora.getTime() + 7 * 86400000)
  const en14dias = new Date(ahora.getTime() + 14 * 86400000)
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)

  const [
    misVisitasRecientes, misHospitales, visitasPrevMes, visitasChart,
    proximasVisitas, estadoModulosRaw, totalVisitas,
    misProyectos, fasesRetrasadas, proyectosVenc, proximasCitas, hitosRetrasados,
    visitasHoy, tareasVencidas, recordatoriosHoy, llamadasHoy,
  ] = await Promise.all([
    db.visita.findMany({ where: { usuarioId: userId }, take: 6, orderBy: { fecha: "desc" }, include: { hospital: { select: { nombre: true } } } }),
    db.hospital.count({ where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } } }),
    db.visita.count({ where: { usuarioId: userId, creadoEn: { gte: inicioPrevMes, lte: finPrevMes } } }),
    db.visita.findMany({ where: { usuarioId: userId, creadoEn: { gte: inicioSeisM } }, select: { creadoEn: true } }),
    db.visita.findMany({ where: { usuarioId: userId, fecha: { gte: ahora } }, orderBy: { fecha: "asc" }, take: 5, include: { hospital: { select: { nombre: true } } } }),
    db.proyectoModulo.groupBy({ by: ["estado"], _count: { _all: true } }),
    db.visita.count({ where: { usuarioId: userId } }),
    db.proyecto.findMany({
      where: { responsableId: userId, estado: { notIn: ["COMPLETADO", "CANCELADO"] } },
      include: { hospital: { select: { nombre: true } }, fases: { select: { estado: true } } },
      orderBy: { fechaFinPlan: "asc" },
    }),
    db.faseProyecto.findMany({
      where: {
        fechaPlan: { lt: ahora },
        estado: { not: "COMPLETADO" },
        proyecto: { responsableId: userId, estado: { notIn: ["COMPLETADO", "CANCELADO"] } },
      },
      select: { id: true, nombre: true, fechaPlan: true, proyecto: { select: { id: true, titulo: true } } },
      orderBy: { fechaPlan: "asc" },
      take: 5,
    }),
    db.proyecto.findMany({
      where: { responsableId: userId, estado: { notIn: ["COMPLETADO", "CANCELADO"] }, fechaFinPlan: { gte: ahora, lte: en7dias } },
      select: { id: true, titulo: true, fechaFinPlan: true, hospital: { select: { nombre: true } } },
      orderBy: { fechaFinPlan: "asc" },
    }),
    db.entradaTimeline.findMany({
      where: { tipo: "CITA", fechaCita: { gte: ahora, lte: en14dias }, proyecto: { responsableId: userId } },
      select: { id: true, titulo: true, fechaCita: true, personaCita: true, lugarCita: true, importanciaCita: true, proyecto: { select: { id: true, hospital: { select: { nombre: true } } } } },
      orderBy: { fechaCita: "asc" }, take: 5,
    }),
    db.hito.findMany({
      where: { fecha: { lt: ahora }, completado: false, proyecto: { responsableId: userId, estado: { notIn: ["COMPLETADO", "CANCELADO"] } } },
      select: { id: true, titulo: true, fecha: true, proyecto: { select: { id: true, titulo: true } } },
      orderBy: { fecha: "asc" }, take: 5,
    }),
    db.visita.findMany({ where: { usuarioId: userId, fecha: { gte: inicioDia, lt: finDia } }, include: { hospital: { select: { nombre: true } } }, take: 8 }),
    db.tarea.findMany({ where: { fechaVencimiento: { lte: ahora }, estado: { notIn: ["COMPLETADA", "CANCELADA"] }, proyecto: { responsableId: userId, estado: { notIn: ["COMPLETADO", "CANCELADO"] } } }, include: { proyecto: { select: { id: true, titulo: true } } }, orderBy: { fechaVencimiento: "asc" }, take: 5 }),
    db.recordatorio.findMany({ where: { usuarioId: userId, completado: false, fecha: { gte: inicioDia, lt: finDia } }, select: { id: true, titulo: true, fecha: true }, orderBy: { fecha: "asc" }, take: 5 }),
    db.registroLlamada.count({ where: { usuarioId: userId, fecha: { gte: inicioDia, lt: finDia } } }),
  ])

  const visitasMes = misVisitasRecientes.filter(v => new Date(v.creadoEn) >= inicioMes).length
  const trendVisitas = calcTrend(visitasMes, visitasPrevMes)
  const chartData = agruparPorMes(visitasChart.map(v => new Date(v.creadoEn)), 6)

  const ORDEN_ESTADO = ["PENDIENTE", "EN_INSTALACION", "INSTALADO", "FORMACION", "VALIDADO"]
  const estadoModulosData = ORDEN_ESTADO
    .map(estado => ({ estado, count: estadoModulosRaw.find(r => r.estado === estado)?._count._all ?? 0 }))
    .filter(d => d.count > 0)

  // Alertas
  type AlertaItem = { key: string; titulo: string; sub: string; href: string; color: string; bg: string }
  const alertas: AlertaItem[] = []
  proyectosVenc.forEach(p => {
    const dias = p.fechaFinPlan ? Math.ceil((new Date(p.fechaFinPlan).getTime() - ahora.getTime()) / 86400000) : 0
    alertas.push({ key: `pv-${p.id}`, titulo: p.titulo, sub: `Vence en ${dias} día${dias !== 1 ? "s" : ""} · ${p.hospital.nombre}`, href: `/proyectos/${p.id}`, color: "#f97316", bg: "#fff7ed" })
  })
  fasesRetrasadas.forEach(f => {
    alertas.push({ key: `fr-${f.id}`, titulo: f.proyecto.titulo, sub: `Fase "${f.nombre}" — debía completarse el ${new Date(f.fechaPlan!).toLocaleDateString("es-ES")}`, href: `/proyectos/${f.proyecto.id}`, color: "#dc2626", bg: "#fef2f2" })
  })
  hitosRetrasados.forEach(h => {
    alertas.push({ key: `hr-${h.id}`, titulo: h.proyecto.titulo, sub: `Hito "${h.titulo}" sin completar desde ${new Date(h.fecha).toLocaleDateString("es-ES")}`, href: `/proyectos/${h.proyecto.id}`, color: "#f97316", bg: "#fff7ed" })
  })

  const hayMiDia = visitasHoy.length > 0 || tareasVencidas.length > 0 || recordatoriosHoy.length > 0 || llamadasHoy > 0

  return (
    <div>
      <PageHeader title={`Hola, ${nombre.split(" ")[0]}`} subtitle="Aqui esta tu resumen de hoy" />

      <QuickActionsField />

      <FavoritosSection userId={userId} />

      {hayMiDia && (
        <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-bold text-gray-800">Mi día</span>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {visitasHoy.map(v => (
              <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <IconClipboard size={13} className="text-teal-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400">Visita de hoy</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
              </Link>
            ))}
            {tareasVencidas.map(t => (
              <Link key={t.id} href={`/proyectos/${t.proyecto.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{t.proyecto.titulo} · Tarea vencida</p>
                </div>
                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full shrink-0">Vencida</span>
              </Link>
            ))}
            {recordatoriosHoy.map(r => (
              <Link key={r.id} href="/recordatorios" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-gray-400">Recordatorio de hoy</p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                  {new Date(r.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            ))}
            {llamadasHoy > 0 && (
              <Link href="/llamadas" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/>
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">Llamadas de hoy</p>
                  <p className="text-xs text-gray-400">{llamadasHoy} llamada{llamadasHoy !== 1 ? "s" : ""} registrada{llamadasHoy !== 1 ? "s" : ""}</p>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                  {llamadasHoy}
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Visitas este mes" value={visitasMes} sub={trendVisitas !== undefined ? `vs ${visitasPrevMes} el mes pasado` : undefined} icon={<IconClipboard size={18} />} trend={trendVisitas} />
        <KpiCard label="Hospitales en mi zona" value={misHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Total visitas" value={totalVisitas} icon={<IconFileText size={18} />} />
        <KpiCard label="Proyectos activos" value={misProyectos.length} icon={<IconCheckCircle size={18} />} />
      </div>

      {/* Accesos rápidos */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { label: "Hospitales", href: "/hospitales", icon: <IconHospital size={14} /> },
          { label: "Visitas", href: "/visitas", icon: <IconClipboard size={14} /> },
          { label: "Calendario", href: "/visitas/calendario", icon: <IconFileText size={14} /> },
          { label: "Proyectos", href: "/proyectos", icon: <IconCheckCircle size={14} /> },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shrink-0">
            <span className="text-gray-400">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Fila: gráficos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Mis visitas por mes</h2>
              <p className="text-xs text-gray-400">Últimos 6 meses</p>
            </div>
            <span className="text-xs text-gray-400">{chartData.reduce((s, d) => s + d.v, 0)} total</span>
          </div>
          <BarChart data={chartData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Estado instalaciones</h2>
          <p className="text-xs text-gray-400 mb-4">Módulos por fase</p>
          <EstadoModulosChart data={estadoModulosData} />
        </div>
      </div>

      <AlertasPanel alertas={alertas} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis visitas recientes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Mis visitas recientes" link="/visitas" /></div>
          <div className="divide-y divide-gray-50">
            {misVisitasRecientes.length === 0
              ? <EmptyState icon="clipboard" title="Sin visitas aun" description="Crea tu primera visita preproyecto" action={{ label: "Nueva visita", href: "/visitas?abrir=1" }} />
              : misVisitasRecientes.map(v => (
                <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                    <p className="text-xs text-gray-400">{new Date(v.fecha).toLocaleDateString("es-ES")}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
                </Link>
              ))}
          </div>
        </div>

        {/* Mis proyectos activos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Mis proyectos activos" link="/proyectos" /></div>
          {misProyectos.length === 0 ? (
            <EmptyState icon="folder" title="Sin proyectos asignados" description="No tienes proyectos activos asignados" />
          ) : (
            <div className="divide-y divide-gray-50">
              {misProyectos.slice(0, 5).map(p => {
                const pct = p.fases.length ? Math.round((p.fases.filter(f => f.estado === "COMPLETADO").length / p.fases.length) * 100) : 0
                return (
                  <Link key={p.id} href={`/proyectos/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-teal-700 transition-colors">{p.hospital.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-gray-300 text-sm group-hover:text-teal-400 transition-colors">›</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {proximasVisitas.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Proximas visitas" /></div>
          <div className="flex gap-3 p-4 overflow-x-auto">
            {proximasVisitas.map(v => <ProximaCard key={v.id} id={v.id} hospital={v.hospital.nombre} fecha={v.fecha.toString()} href={`/visitas/${v.id}`} />)}
          </div>
        </div>
      )}

      {proximasCitas.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionHeader title="Próximas citas (14 días)" link="/proyectos" />
          </div>
          <div className="divide-y divide-gray-50">
            {proximasCitas.map(c => {
              const dias = c.fechaCita ? Math.ceil((new Date(c.fechaCita).getTime() - ahora.getTime()) / 86400000) : 0
              return (
                <Link key={c.id} href={`/proyectos/${c.proyecto.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white text-[10px] font-bold" style={{ backgroundColor: dias <= 1 ? "#dc2626" : dias <= 3 ? "#f97316" : TEAL }}>
                    <span className="text-sm font-black leading-none">{dias <= 0 ? "!" : dias}</span>
                    {dias > 0 && <span>d</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.titulo}</p>
                    <p className="text-xs text-gray-400 truncate">{c.proyecto.hospital.nombre}{c.personaCita ? ` · ${c.personaCita}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.lugarCita && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>{c.lugarCita === "PRESENCIAL" ? "Presencial" : c.lugarCita === "TEAMS" ? "Teams" : c.lugarCita === "ZOOM" ? "Zoom" : "Meet"}</span>}
                    {(c.importanciaCita ?? 0) >= 2 && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={c.importanciaCita === 3 ? { backgroundColor: "#fef2f2", color: "#dc2626" } : { backgroundColor: "#fff7ed", color: "#f97316" }}>{c.importanciaCita === 3 ? "Crítica" : "Importante"}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionHeader title="Accesos rapidos" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink href="/visitas?abrir=1" label="Nueva visita"      Icon={IconClipboard}   color="bg-teal-50 text-teal-700" />
          <QuickLink href="/visitas"         label="Mis visitas"       Icon={IconFileText}    color="bg-blue-50 text-blue-700" />
          <QuickLink href="/hospitales"      label="Mis hospitales"    Icon={IconHospital}    color="bg-amber-50 text-amber-700" />
          <QuickLink href="/proyectos"   label="Proyectos"         Icon={IconCheckCircle} color="bg-green-50 text-green-700" />
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) return null
  const rol = session.user.role
  const userId = session.user.id
  const nombre = session.user.name ?? "Usuario"

  if (rol === "ADMIN") return <DashboardAdmin userId={userId} />
  if (rol === "VENTAS") return <DashboardVentas userId={userId} nombre={nombre} />
  return <DashboardProyectos userId={userId} nombre={nombre} />
}
