import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"

const TEAL = "#00A99D"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada"
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

export default async function DashboardPage() {
  const session = await auth()
  const rol = session?.user?.role ?? ""
  const userId = session?.user?.id ?? ""

  if (rol === "ADMIN") {
    const [totalHospitales, totalZonas, totalUsuarios, visitasMes, ultimasVisitas] = await Promise.all([
      db.hospital.count({ where: { activo: true } }),
      db.zona.count(),
      db.usuario.count({ where: { activo: true } }),
      db.visita.count({ where: { creadoEn: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      db.visita.findMany({
        take: 8,
        orderBy: { fecha: "desc" },
        include: {
          hospital: { select: { nombre: true } },
          usuario: { select: { nombre: true, rol: true } },
        },
      }),
    ])

    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Hospitales activos", value: totalHospitales, icon: "🏥" },
            { label: "Zonas",              value: totalZonas,       icon: "🗺" },
            { label: "Usuarios activos",   value: totalUsuarios,    icon: "👥" },
            { label: "Visitas este mes",   value: visitasMes,       icon: "📋" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <span className="text-2xl">{kpi.icon}</span>
              <p className="text-3xl font-bold mt-2" style={{ color: TEAL }}>{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Últimas visitas</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {ultimasVisitas.length === 0 && (
              <p className="text-sm text-gray-400 p-5">Sin visitas aún.</p>
            )}
            {ultimasVisitas.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400">{v.usuario.nombre} · {v.usuario.rol} · {new Date(v.fecha).toLocaleDateString("es-ES")}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                  {ESTADO_LABEL[v.estado]}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <Link href="/dashboard/admin/visitas" className="text-sm font-medium" style={{ color: TEAL }}>
              Ver todas →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard para PROYECTOS y VENTAS
  const [misVisitas, misHospitales] = await Promise.all([
    db.visita.findMany({
      where: { usuarioId: userId },
      take: 6,
      orderBy: { fecha: "desc" },
      include: { hospital: { select: { nombre: true } } },
    }),
    db.hospital.count({
      where: { activo: true, zona: { usuarios: { some: { usuarioId: userId } } } },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">
        Hola, {session?.user?.name} 👋
      </h1>
      <p className="text-sm text-gray-400 mb-6">{rol}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <span className="text-2xl">🏥</span>
          <p className="text-3xl font-bold mt-2" style={{ color: TEAL }}>{misHospitales}</p>
          <p className="text-xs text-gray-400 mt-1">Hospitales en mi zona</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <span className="text-2xl">📋</span>
          <p className="text-3xl font-bold mt-2" style={{ color: TEAL }}>{misVisitas.length}</p>
          <p className="text-xs text-gray-400 mt-1">Mis visitas</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mis últimas visitas</h2>
          <Link href="/dashboard/hospitales" className="text-sm font-medium" style={{ color: TEAL }}>
            Ver hospitales →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {misVisitas.length === 0 && (
            <p className="text-sm text-gray-400 p-5">Aún no has registrado ninguna visita.</p>
          )}
          {misVisitas.map(v => (
            <Link key={v.id} href={`/dashboard/visitas/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{v.hospital.nombre}</p>
                <p className="text-xs text-gray-400">{new Date(v.fecha).toLocaleDateString("es-ES")}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                {ESTADO_LABEL[v.estado]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
