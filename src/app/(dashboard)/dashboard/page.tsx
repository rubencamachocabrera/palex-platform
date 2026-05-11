import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { TEAL } from "@/lib/brand"
import {
  IconHospital, IconUsers, IconClipboard, IconTrendingUp,
  IconCheckCircle, IconFileText, IconMap,
} from "@/components/ui/Icons"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"

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

// ─── Subcomponentes ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, trend }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; trend?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend > 0 ? "bg-green-50 text-green-600" : trend < 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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

function AreaChart({ data }: { data: { mes: string; v: number }[] }) {
  const W = 400; const H = 90
  const PAD = { t: 10, r: 12, b: 20, l: 8 }
  const maxV = Math.max(...data.map(d => d.v), 1)
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b
  const pts = data.map((d, i) => ({
    x: PAD.l + (data.length < 2 ? cW / 2 : (i / (data.length - 1)) * cW),
    y: PAD.t + cH - (d.v / maxV) * cH,
    ...d,
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const area = pts.length > 1 ? `${line} L ${pts[pts.length-1].x.toFixed(1)} ${(PAD.t+cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD.t+cH).toFixed(1)} Z` : ""
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {area && <path d={area} fill={TEAL} fillOpacity={0.08} />}
      {pts.length > 1 && <path d={line} fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke={TEAL} strokeWidth={2} />)}
      {pts.map((p, i) => <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize={9} fill="#9ca3af">{p.mes}</text>)}
    </svg>
  )
}

function QuickLink({ href, label, Icon, color }: {
  href: string; label: string; Icon: React.ComponentType<{ size?: number }>; color: string
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}><Icon size={18} /></span>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 leading-tight">{label}</span>
    </Link>
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

// ── Dashboard ADMIN ────────────────────────────────────────────────────────────
async function DashboardAdmin() {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioPrevMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const finPrevMes = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
  const inicioSeisM = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)

  const [totalHospitales, totalUsuarios, visitasMes, visitasPrevMes, ultimasVisitas,
    totalOportunidades, valorPipeline, visitasChart, opCalientes, proximasVisitas] = await Promise.all([
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
  ])
  const trendVisitas = calcTrend(visitasMes, visitasPrevMes)
  const chartData = agruparPorMes(visitasChart.map(v => new Date(v.creadoEn)), 6)
  const opOrdenadas = opCalientes.map(op => ({ ...op, heat: (op.valorEstimado ?? 0) * ((op.probabilidad ?? 50) / 100) })).sort((a, b) => b.heat - a.heat).slice(0, 5)

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Vision general del sistema" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Hospitales activos" value={totalHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Usuarios activos" value={totalUsuarios} icon={<IconUsers size={18} />} />
        <KpiCard label="Visitas este mes" value={visitasMes} sub={trendVisitas !== undefined ? `vs ${visitasPrevMes} el mes pasado` : undefined} icon={<IconClipboard size={18} />} trend={trendVisitas} />
        <KpiCard label="Pipeline activo" value={fmtEuros(valorPipeline._sum.valorEstimado ?? 0)} sub={`${totalOportunidades} oportunidades`} icon={<IconTrendingUp size={18} />} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Actividad mensual</h2>
            <p className="text-xs text-gray-400">Visitas creadas en los ultimos 6 meses</p>
          </div>
          <span className="text-xs text-gray-400">Total: {chartData.reduce((s, d) => s + d.v, 0)}</span>
        </div>
        <AreaChart data={chartData} />
      </div>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Oportunidades calientes" link="/ventas/pipeline" /></div>
          <div className="divide-y divide-gray-50">
            {opOrdenadas.length === 0 ? <EmptyState icon="pipeline" title="Sin oportunidades activas" />
              : opOrdenadas.map(op => <OpCard key={op.id} titulo={op.titulo} hospitalNombre={op.hospital.nombre} etapa={op.etapa} valorEstimado={op.valorEstimado} probabilidad={op.probabilidad} />)}
          </div>
        </div>
      </div>
      {proximasVisitas.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Proximas visitas planificadas" /></div>
          <div className="flex gap-3 p-4 overflow-x-auto">
            {proximasVisitas.map(v => <ProximaCard key={v.id} id={v.id} hospital={v.hospital.nombre} fecha={v.fecha.toString()} usuario={v.usuario.nombre} />)}
          </div>
        </div>
      )}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionHeader title="Accesos rapidos" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink href="/admin/usuarios"   label="Gestionar usuarios" Icon={IconUsers}      color="bg-blue-50 text-blue-700" />
          <QuickLink href="/admin/hospitales" label="Ver hospitales"     Icon={IconHospital}   color="bg-teal-50 text-teal-700" />
          <QuickLink href="/admin/zonas"      label="Configurar zonas"   Icon={IconMap}        color="bg-amber-50 text-amber-700" />
          <QuickLink href="/ventas/pipeline"  label="Pipeline de ventas" Icon={IconTrendingUp} color="bg-purple-50 text-purple-700" />
        </div>
      </div>
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

  const [misOps, misVisitas, misHospitales, visitasPrevMes, visitasChart] = await Promise.all([
    db.oportunidad.findMany({ where: { usuarioId: userId }, orderBy: { editadoEn: "desc" }, take: 8, include: { hospital: { select: { nombre: true, ciudad: true } } } }),
    db.visita.findMany({ where: { usuarioId: userId }, take: 5, orderBy: { fecha: "desc" }, include: { hospital: { select: { nombre: true } } } }),
    db.hospital.count({ where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } } }),
    db.visita.count({ where: { usuarioId: userId, creadoEn: { gte: inicioPrevMes, lte: finPrevMes } } }),
    db.visita.findMany({ where: { usuarioId: userId, creadoEn: { gte: inicioSeisM } }, select: { creadoEn: true } }),
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

  return (
    <div>
      <PageHeader title={`Hola, ${nombre.split(" ")[0]}`} subtitle="Aqui esta tu resumen de hoy" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Pipeline activo" value={fmtEuros(totalPipeline)} sub={`${opsActivas.length} oportunidades`} icon={<IconTrendingUp size={18} />} />
        <KpiCard label="Contratos ganados" value={ganadas.length} sub="en total" icon={<IconCheckCircle size={18} />} />
        <KpiCard label="Hospitales en mi zona" value={misHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Visitas este mes" value={visitasMes} sub={trendVisitas !== undefined ? `vs ${visitasPrevMes} el mes pasado` : undefined} icon={<IconClipboard size={18} />} trend={trendVisitas} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Actividad mensual</h2>
            <p className="text-xs text-gray-400">Visitas creadas en los ultimos 6 meses</p>
          </div>
          <span className="text-xs text-gray-400">Total: {chartData.reduce((s, d) => s + d.v, 0)}</span>
        </div>
        <AreaChart data={chartData} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <QuickLink href="/visitas/nueva"     label="Nueva visita"       Icon={IconClipboard}  color="bg-teal-50 text-teal-700" />
          <QuickLink href="/ventas/pipeline"   label="Pipeline de ventas" Icon={IconTrendingUp} color="bg-purple-50 text-purple-700" />
          <QuickLink href="/ventas/hospitales" label="Mis hospitales"     Icon={IconHospital}   color="bg-blue-50 text-blue-700" />
        </div>
      </div>
    </div>
  )
}

async function DashboardProyectos({ userId, nombre }: { userId: string; nombre: string }) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioPrevMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const finPrevMes = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
  const inicioSeisM = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)

  const [misVisitas, misHospitales, visitasPrevMes, visitasChart, proximasVisitas] = await Promise.all([
    db.visita.findMany({ where: { usuarioId: userId }, take: 6, orderBy: { fecha: "desc" }, include: { hospital: { select: { nombre: true } } } }),
    db.hospital.count({ where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } } }),
    db.visita.count({ where: { usuarioId: userId, creadoEn: { gte: inicioPrevMes, lte: finPrevMes } } }),
    db.visita.findMany({ where: { usuarioId: userId, creadoEn: { gte: inicioSeisM } }, select: { creadoEn: true } }),
    db.visita.findMany({ where: { usuarioId: userId, fecha: { gte: ahora } }, orderBy: { fecha: "asc" }, take: 5, include: { hospital: { select: { nombre: true } } } }),
  ])
  const visitasMes = misVisitas.filter(v => new Date(v.creadoEn) >= inicioMes).length
  const trendVisitas = calcTrend(visitasMes, visitasPrevMes)
  const chartData = agruparPorMes(visitasChart.map(v => new Date(v.creadoEn)), 6)

  return (
    <div>
      <PageHeader title={`Hola, ${nombre.split(" ")[0]}`} subtitle="Aqui esta tu resumen de hoy" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Visitas este mes" value={visitasMes} sub={trendVisitas !== undefined ? `vs ${visitasPrevMes} el mes pasado` : undefined} icon={<IconClipboard size={18} />} trend={trendVisitas} />
        <KpiCard label="Hospitales en mi zona" value={misHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Total visitas" value={misVisitas.length} icon={<IconFileText size={18} />} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Actividad mensual</h2>
            <p className="text-xs text-gray-400">Visitas creadas en los ultimos 6 meses</p>
          </div>
          <span className="text-xs text-gray-400">Total: {chartData.reduce((s, d) => s + d.v, 0)}</span>
        </div>
        <AreaChart data={chartData} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Mis visitas recientes" link="/visitas" /></div>
          <div className="divide-y divide-gray-50">
            {misVisitas.length === 0
              ? <EmptyState icon="clipboard" title="Sin visitas aun" description="Crea tu primera visita preproyecto" action={{ label: "Nueva visita", href: "/visitas/nueva" }} />
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
        {proximasVisitas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50"><SectionHeader title="Proximas visitas" /></div>
            <div className="flex gap-3 p-4 overflow-x-auto">
              {proximasVisitas.map(v => <ProximaCard key={v.id} id={v.id} hospital={v.hospital.nombre} fecha={v.fecha.toString()} href={`/visitas/${v.id}`} />)}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionHeader title="Accesos rapidos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickLink href="/visitas/nueva"      label="Nueva visita"      Icon={IconClipboard} color="bg-teal-50 text-teal-700" />
          <QuickLink href="/visitas"            label="Todas mis visitas" Icon={IconFileText}  color="bg-blue-50 text-blue-700" />
          <QuickLink href="/ventas/hospitales"  label="Mis hospitales"    Icon={IconHospital}  color="bg-amber-50 text-amber-700" />
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

  if (rol === "ADMIN") return <DashboardAdmin />
  if (rol === "VENTAS") return <DashboardVentas userId={userId} nombre={nombre} />
  return <DashboardProyectos userId={userId} nombre={nombre} />
}
