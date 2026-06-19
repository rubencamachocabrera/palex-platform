import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"

export default async function EquipoPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "ADMIN") redirect("/dashboard")

  const ahora     = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const finMesAnterior    = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
  const hace7  = new Date(ahora.getTime() - 7 * 86400000)
  const hace30 = new Date(ahora.getTime() - 30 * 86400000)

  const usuarios = await db.usuario.findMany({
    where: { activo: true },
    select: {
      id: true, nombre: true, email: true, rol: true, creadoEn: true,
    },
    orderBy: { nombre: "asc" },
  })

  const [visitasMes, visitasMesAnt, visitasRecientes, proyActivos, tareasVenc, oportunidadesActivas] = await Promise.all([
    db.visita.groupBy({ by: ["usuarioId"], where: { creadoEn: { gte: inicioMes } }, _count: { _all: true } }),
    db.visita.groupBy({ by: ["usuarioId"], where: { creadoEn: { gte: inicioMesAnterior, lte: finMesAnterior } }, _count: { _all: true } }),
    db.visita.findMany({ where: { creadoEn: { gte: hace7 } }, select: { usuarioId: true, fecha: true, hospital: { select: { nombre: true } }, estado: true }, orderBy: { creadoEn: "desc" }, take: 50 }),
    db.proyecto.groupBy({ by: ["responsableId"], where: { estado: { notIn: ["COMPLETADO","CANCELADO"] }, responsableId: { not: null } }, _count: { _all: true } }),
    db.tarea.groupBy({ by: ["asignadoA"], where: { fechaVencimiento: { lte: ahora }, estado: { notIn: ["COMPLETADA","CANCELADA"] }, asignadoA: { not: null } }, _count: { _all: true } }),
    db.oportunidad.groupBy({ by: ["usuarioId"], where: { etapa: { notIn: ["GANADO","PERDIDO"] } }, _count: { _all: true }, _sum: { valorEstimado: true } }),
  ])

  const vmMap  = Object.fromEntries(visitasMes.map(r => [r.usuarioId, r._count._all]))
  const vamMap = Object.fromEntries(visitasMesAnt.map(r => [r.usuarioId, r._count._all]))
  const ppMap  = Object.fromEntries(proyActivos.map(r => [r.responsableId!, r._count._all]))
  const tvMap  = Object.fromEntries(tareasVenc.map(r => [r.asignadoA!, r._count._all]))
  const opMap  = Object.fromEntries(oportunidadesActivas.map(r => [r.usuarioId, { count: r._count._all, valor: r._sum.valorEstimado ?? 0 }]))

  const equipo = usuarios.map(u => {
    const visRecientes = visitasRecientes.filter(v => v.usuarioId === u.id)
    const ultimaAct = visRecientes[0]?.fecha ?? null
    const vm  = vmMap[u.id]  ?? 0
    const vam = vamMap[u.id] ?? 0
    const trend = vam > 0 ? Math.round(((vm - vam) / vam) * 100) : null
    return {
      ...u,
      visitasMes: vm,
      visitasMesAnt: vam,
      trend,
      proyectosActivos: ppMap[u.id] ?? 0,
      tareasVencidas: tvMap[u.nombre] ?? 0,
      oportunidades: opMap[u.id] ?? { count: 0, valor: 0 },
      ultimaActividad: ultimaAct,
      visitasRecientes: visRecientes.slice(0, 3),
    }
  })

  const ROL_LABEL: Record<string, string> = { ADMIN: "Admin", VENTAS: "Ventas", PROYECTOS: "Proyectos", TECNICO: "Técnico" }
  const ROL_COLOR: Record<string, { bg: string; text: string }> = {
    ADMIN:     { bg: "#fef2f2", text: "#dc2626" },
    VENTAS:    { bg: `${ORANGE}18`, text: ORANGE },
    PROYECTOS: { bg: `${TEAL}18`, text: TEAL },
    TECNICO:   { bg: "#f5f3ff", text: "#7c3aed" },
  }

  function diasDesde(s: Date | string | null) {
    if (!s) return null
    return Math.floor((ahora.getTime() - new Date(s).getTime()) / 86400000)
  }
  function fmtEuros(n: number) {
    return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
  }

  const totalVisitasMes  = equipo.reduce((s, u) => s + u.visitasMes, 0)
  const totalProyActivos = equipo.reduce((s, u) => s + u.proyectosActivos, 0)
  const totalVencidas    = equipo.reduce((s, u) => s + u.tareasVencidas, 0)
  const totalValorOps    = equipo.reduce((s, u) => s + u.oportunidades.valor, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel del equipo</h1>
        <p className="text-sm text-gray-400 mt-0.5">{equipo.length} usuarios activos · vista de actividad y carga de trabajo</p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Visitas este mes",    value: String(totalVisitasMes),   color: TEAL,      sub: "por todo el equipo" },
          { label: "Proyectos activos",   value: String(totalProyActivos),  color: "#6366f1", sub: "en curso o pendientes" },
          { label: "Tareas vencidas",     value: String(totalVencidas),     color: totalVencidas > 0 ? "#dc2626" : "#16a34a", sub: "sin completar" },
          { label: "Pipeline del equipo", value: fmtEuros(totalValorOps),   color: ORANGE,    sub: "valor activo total" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm" style={{ borderTop: `3px solid ${k.color}` }}>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">{k.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla de equipo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actividad individual</p>
        </div>
        <div className="divide-y divide-gray-50">
          {equipo.map(u => {
            const rc = ROL_COLOR[u.rol] ?? { bg: "#f3f4f6", text: "#6b7280" }
            const dias = diasDesde(u.ultimaActividad)
            const inactivo = dias === null || dias > 14
            return (
              <div key={u.id} className="px-5 py-4 hover:bg-gray-50/40 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: inactivo ? "#9ca3af" : TEAL }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: inactivo ? "#d1d5db" : "#22c55e" }} />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{u.nombre}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: rc.bg, color: rc.text }}>
                        {ROL_LABEL[u.rol] ?? u.rol}
                      </span>
                      {u.tareasVencidas > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          {u.tareasVencidas} tarea{u.tareasVencidas>1?"s":""} vencida{u.tareasVencidas>1?"s":""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>

                    {/* Métricas fila */}
                    <div className="flex items-center gap-5 mt-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span className="font-semibold text-gray-800">{u.visitasMes}</span>
                        <span className="text-gray-400">visitas este mes</span>
                        {u.trend !== null && (
                          <span className={`font-bold text-[10px] ${u.trend > 0 ? "text-green-600" : u.trend < 0 ? "text-red-500" : "text-gray-400"}`}>
                            {u.trend > 0 ? "+" : ""}{u.trend}%
                          </span>
                        )}
                      </div>
                      {u.proyectosActivos > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                          </svg>
                          <span className="font-semibold text-gray-800">{u.proyectosActivos}</span>
                          <span className="text-gray-400">proyecto{u.proyectosActivos>1?"s":""} activo{u.proyectosActivos>1?"s":""}</span>
                        </div>
                      )}
                      {u.oportunidades.count > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          <span className="font-semibold text-gray-800">{fmtEuros(u.oportunidades.valor)}</span>
                          <span className="text-gray-400">pipeline</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs ml-auto">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: inactivo ? "#d1d5db" : "#22c55e" }} />
                        <span className="text-gray-400">
                          {dias === null ? "Sin actividad" : dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : `Hace ${dias}d`}
                        </span>
                      </div>
                    </div>

                    {/* Últimas visitas recientes */}
                    {u.visitasRecientes.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {u.visitasRecientes.map(v => (
                          <span key={v.fecha.toString()} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                            {v.hospital.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acción */}
                  <Link href={`/admin/usuarios`}
                    className="shrink-0 text-xs font-medium px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                    Gestionar
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actividad reciente del equipo */}
      {visitasRecientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actividad reciente (últimos 7 días)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {visitasRecientes.slice(0, 15).map((v, i) => {
              const user = equipo.find(u => u.id === v.usuarioId)
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: v.estado === "COMPLETADA" ? "#16a34a" : v.estado === "BORRADOR" ? "#f59e0b" : "#9ca3af" }} />
                  <span className="text-xs font-medium text-gray-700 flex-1 truncate">{v.hospital.nombre}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{user?.nombre.split(" ")[0]}</span>
                  <span className="text-[10px] text-gray-300 shrink-0">{new Date(v.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
