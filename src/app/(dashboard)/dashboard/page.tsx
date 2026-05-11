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
  PROPUESTA: "Propuesta", NEGOCIACION: "Negociación",
  GANADO: "Ganado", PERDIDO: "Perdido",
}

function fmtEuros(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

// ── Subcomponentes ──────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
          {icon}
        </span>
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
      {link && (
        <Link href={link} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
          {linkLabel ?? "Ver todos →"}
        </Link>
      )}
    </div>
  )
}

// ── Dashboard ADMIN ─────────────────────────────────────────────────

async function DashboardAdmin() {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [
    totalHospitales, totalZonas, totalUsuarios,
    visitasMes, ultimasVisitas,
    totalOportunidades, valorPipeline,
  ] = await Promise.all([
    db.hospital.count({ where: { activo: true } }),
    db.zona.count(),
    db.usuario.count({ where: { activo: true } }),
    db.visita.count({ where: { creadoEn: { gte: inicioMes } } }),
    db.visita.findMany({
      take: 6, orderBy: { fecha: "desc" },
      include: {
        hospital: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
    db.oportunidad.count({ where: { etapa: { notIn: ["PERDIDO"] } } }),
    db.oportunidad.aggregate({
      where: { etapa: { notIn: ["PERDIDO"] } },
      _sum: { valorEstimado: true },
    }),
  ])

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visión general del sistema" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Hospitales activos"  value={totalHospitales} icon={<IconHospital size={18} />} />
        <KpiCard label="Usuarios activos"    value={totalUsuarios}   icon={<IconUsers size={18} />} />
        <KpiCard label="Visitas este mes"    value={visitasMes}      icon={<IconClipboard size={18} />} />
        <KpiCard label="Pipeline activo"     value={fmtEuros(valorPipeline._sum.valorEstimado ?? 0)} sub={`${totalOportunidades} oportunidades`} icon={<IconTrendingUp size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas visitas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionHeader title="Últimas visitas" link="/admin/visitas" />
          </div>
          <div className="divide-y divide-gray-50">
            {ultimasVisitas.length === 0 ? (
              <p className="text-sm text-gray-400 p-5">Sin visitas aún.</p>
            ) : ultimasVisitas.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400">{v.usuario.nombre} · {new Date(v.fecha).toLocaleDateString("es-ES")}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                  {ESTADO_LABEL[v.estado]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Accesos rápidos" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/admin/usuarios",   label: "Gestionar usuarios",  icon: <IconUsers size={18} />,       color: "bg-blue-50 text-blue-700" },
              { href: "/admin/hospitales", label: "Ver hospitales",      icon: <IconHospital size={18} />,    color: "bg-teal-50 text-teal-700" },
              { href: "/admin/zonas",      label: "Configurar zonas",    icon: <IconMap size={18} />,         color: "bg-amber-50 text-amber-700" },
              { href: "/ventas/pipeline",  label: "Pipeline de ventas",  icon: <IconTrendingUp size={18} />,  color: "bg-purple-50 text-purple-700" },
            ].map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>{a.icon}</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard VENTAS ────────────────────────────────────────────────

async function DashboardVentas({ userId, nombre }: { userId: string; nombre: string }) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [misOps, misVisitas, misHospitales] = await Promise.all([
    db.oportunidad.findMany({
      where: { usuarioId: userId },
      orderBy: { editadoEn: "desc" },
      take: 5,
      include: { hospital: { select: { nombre: true, ciudad: true } } },
    }),
    db.visita.findMany({
      where: { usuarioId: userId },
      take: 5, orderBy: { fecha: "desc" },
      include: { hospital: { select: { nombre: true } } },
    }),
    db.hospital.count({
      where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } },
    }),
  ])

  const opsActivas = misOps.filter(o => o.etapa !== "PERDIDO")
  const totalPipeline = opsActivas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0)
  const visitasMes = misVisitas.filter(v => new Date(v.creadoEn) >= inicioMes).length
  const ganadas = misOps.filter(o => o.etapa === "GANADO")

  return (
    <div>
      <PageHeader title={`Hola, ${nombre.split(" ")[0]} 👋`} subtitle="Aquí está tu resumen de hoy" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Pipeline activo"       value={fmtEuros(totalPipeline)} sub={`${opsActivas.length} oportunidades`} icon={<IconTrendingUp size={18} />} />
        <KpiCard label="Contratos ganados"     value={ganadas.length}           sub="en total"           icon={<IconCheckCircle size={18} />} />
        <KpiCard label="Hospitales en mi zona" value={misHospitales}           icon={<IconHospital size={18} />} />
        <KpiCard label="Visitas este mes"      value={visitasMes}               icon={<IconClipboard size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis oportunidades recientes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionHeader title="Mis oportunidades" link="/ventas/pipeline" />
          </div>
          <div className="divide-y divide-gray-50">
            {misOps.length === 0 ? (
              <EmptyState
                icon="pipeline"
                title="Aún no tienes oportunidades"
                action={{ label: "Crear la primera", href: "/ventas/pipeline", variant: "ghost" }}
              />
            ) : misOps.map(op => (
              <Link key={op.id} href="/ventas/pipeline" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{op.titulo}</p>
                  <p className="text-xs text-gray-400">{op.hospital.nombre} · {op.hospital.ciudad}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ETAPA_COLOR[op.etapa]}`}>
                    {ETAPA_LABEL[op.etapa]}
                  </span>
                  {op.valorEstimado && (
                    <p className="text-xs text-gray-400 mt-0.5">{fmtEuros(op.valorEstimado)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mis visitas recientes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionHeader title="Mis últimas visitas" link="/visitas" />
          </div>
          <div className="divide-y divide-gray-50">
            {misVisitas.length === 0 ? (
              <EmptyState
                icon="document"
                title="Sin visitas registradas"
                action={{ label: "Ver mis hospitales", href: "/hospitales", variant: "ghost" }}
              />
            ) : misVisitas.map(v => (
              <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400">{new Date(v.fecha).toLocaleDateString("es-ES")}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                  {ESTADO_LABEL[v.estado]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard PROYECTOS ─────────────────────────────────────────────

async function DashboardProyectos({ userId, nombre }: { userId: string; nombre: string }) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [misVisitas, misHospitales, visitasMes] = await Promise.all([
    db.visita.findMany({
      where: { usuarioId: userId },
      take: 6, orderBy: { fecha: "desc" },
      include: { hospital: { select: { nombre: true } } },
    }),
    db.hospital.count({
      where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } },
    }),
    db.visita.count({
      where: { usuarioId: userId, creadoEn: { gte: inicioMes } },
    }),
  ])

  const completadas = misVisitas.filter(v => v.estado === "COMPLETADA").length

  return (
    <div>
      <PageHeader title={`Hola, ${nombre.split(" ")[0]} 👋`} subtitle="Tu actividad de campo" />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <KpiCard label="Hospitales en mi zona" value={misHospitales}      icon={<IconHospital size={18} />} />
        <KpiCard label="Visitas este mes"       value={visitasMes}        icon={<IconClipboard size={18} />} />
        <KpiCard label="Total de mis visitas"   value={misVisitas.length} icon={<IconFileText size={18} />} />
        <KpiCard label="Visitas completadas"    value={completadas}  sub="de las últimas 6" icon={<IconCheckCircle size={18} />} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <SectionHeader title="Mis últimas visitas" link="/visitas" />
        </div>
        <div className="divide-y divide-gray-50">
          {misVisitas.length === 0 ? (
            <EmptyState
              icon="hospital"
              title="Aún no has registrado ninguna visita"
              description="Accede a un hospital para comenzar."
              action={{ label: "Ver mis hospitales", href: "/hospitales" }}
            />
          ) : misVisitas.map(v => (
            <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                <p className="text-xs text-gray-400">{new Date(v.fecha).toLocaleDateString("es-ES")}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                {ESTADO_LABEL[v.estado]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  const rol = (session?.user as { role?: string })?.role ?? ""
  const userId = session?.user?.id ?? ""
  const nombre = session?.user?.name ?? "Usuario"

  if (rol === "ADMIN")     return <DashboardAdmin />
  if (rol === "VENTAS")    return <DashboardVentas userId={userId} nombre={nombre} />
  return <DashboardProyectos userId={userId} nombre={nombre} />
}
