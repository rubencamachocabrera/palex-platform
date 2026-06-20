import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"

export default async function EquipoPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "ADMIN") redirect("/dashboard")

  const ahora = new Date()
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const finHoy = new Date(inicioHoy.getTime() + 86400000)

  // Start of current week (Monday)
  const diaSemana = ahora.getDay()
  const diffLunes = diaSemana === 0 ? 6 : diaSemana - 1
  const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diffLunes)

  // ── Batch queries (avoid N+1) ──────────────────────────────────────────────

  const [
    usuarios,
    visitasHoy,
    visitasSemana,
    proyActivos,
    tareasPendientes,
    tareasVencidas,
    ultimaVisita,
    ultimoProyecto,
  ] = await Promise.all([
    // All active users with their zones
    db.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        zonas: { include: { zona: { select: { nombre: true } } } },
      },
      orderBy: { nombre: "asc" },
    }),

    // Visitas hoy grouped by user
    db.visita.groupBy({
      by: ["usuarioId"],
      where: { fecha: { gte: inicioHoy, lt: finHoy } },
      _count: { _all: true },
    }),

    // Visitas esta semana grouped by user
    db.visita.groupBy({
      by: ["usuarioId"],
      where: { fecha: { gte: inicioSemana, lt: finHoy } },
      _count: { _all: true },
    }),

    // Proyectos activos (NUEVO, EN_CURSO, PAUSADO) by responsable
    db.proyecto.groupBy({
      by: ["responsableId"],
      where: {
        estado: { in: ["NUEVO", "EN_CURSO", "PAUSADO"] },
        responsableId: { not: null },
      },
      _count: { _all: true },
    }),

    // Tareas pendientes (top-level only, not COMPLETADA/CANCELADA) by proyecto.responsableId
    db.$queryRaw<{ responsableId: string; count: bigint }[]>`
      SELECT p."responsableId", COUNT(t.id)::bigint as count
      FROM tareas t
      JOIN pre_proyectos p ON t."preProyectoId" = p.id
      WHERE t."parentId" IS NULL
        AND t.estado NOT IN ('COMPLETADA', 'CANCELADA')
        AND p."responsableId" IS NOT NULL
      GROUP BY p."responsableId"
    `,

    // Tareas vencidas (top-level, not done, fechaVencimiento < now) by proyecto.responsableId
    db.$queryRaw<{ responsableId: string; count: bigint }[]>`
      SELECT p."responsableId", COUNT(t.id)::bigint as count
      FROM tareas t
      JOIN pre_proyectos p ON t."preProyectoId" = p.id
      WHERE t."parentId" IS NULL
        AND t.estado NOT IN ('COMPLETADA', 'CANCELADA')
        AND t."fechaVencimiento" IS NOT NULL
        AND t."fechaVencimiento" < NOW()
        AND p."responsableId" IS NOT NULL
      GROUP BY p."responsableId"
    `,

    // Most recent visita editadoEn per user
    db.$queryRaw<{ usuarioId: string; ultimo: Date }[]>`
      SELECT "usuarioId", MAX("editadoEn") as ultimo
      FROM visitas
      GROUP BY "usuarioId"
    `,

    // Most recent proyecto editadoEn per responsable
    db.$queryRaw<{ responsableId: string; ultimo: Date }[]>`
      SELECT "responsableId", MAX("editadoEn") as ultimo
      FROM pre_proyectos
      WHERE "responsableId" IS NOT NULL
      GROUP BY "responsableId"
    `,
  ])

  // ── Build lookup maps ──────────────────────────────────────────────────────

  const vhMap = Object.fromEntries(visitasHoy.map(r => [r.usuarioId, r._count._all]))
  const vsMap = Object.fromEntries(visitasSemana.map(r => [r.usuarioId, r._count._all]))
  const paMap = Object.fromEntries(proyActivos.map(r => [r.responsableId!, r._count._all]))
  const tpMap = Object.fromEntries(tareasPendientes.map(r => [r.responsableId, Number(r.count)]))
  const tvMap = Object.fromEntries(tareasVencidas.map(r => [r.responsableId, Number(r.count)]))

  const uvMap = Object.fromEntries(ultimaVisita.map(r => [r.usuarioId, new Date(r.ultimo)]))
  const upMap = Object.fromEntries(ultimoProyecto.map(r => [r.responsableId, new Date(r.ultimo)]))

  // ── Assemble per-user data ─────────────────────────────────────────────────

  const equipo = usuarios.map(u => {
    const lastVisita = uvMap[u.id] ?? null
    const lastProy = upMap[u.id] ?? null
    let ultimaActividad: Date | null = null
    if (lastVisita && lastProy) {
      ultimaActividad = lastVisita > lastProy ? lastVisita : lastProy
    } else {
      ultimaActividad = lastVisita ?? lastProy
    }

    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      zonas: u.zonas.map(z => z.zona.nombre),
      visitasHoy: vhMap[u.id] ?? 0,
      visitasSemana: vsMap[u.id] ?? 0,
      proyectosActivos: paMap[u.id] ?? 0,
      tareasPendientes: tpMap[u.id] ?? 0,
      tareasVencidas: tvMap[u.id] ?? 0,
      ultimaActividad,
    }
  })

  // ── Constants ──────────────────────────────────────────────────────────────

  const ROL_LABEL: Record<string, string> = {
    ADMIN: "Admin",
    VENTAS: "Ventas",
    PROYECTOS: "Proyectos",
    TECNICO: "Tecnico",
  }

  const ROL_COLOR: Record<string, { bg: string; text: string }> = {
    ADMIN:     { bg: "#fef2f2", text: "#dc2626" },
    VENTAS:    { bg: "#fff7ed", text: "#ea580c" },
    PROYECTOS: { bg: "#f0fdfa", text: TEAL },
    TECNICO:   { bg: "#faf5ff", text: "#7c3aed" },
  }

  // Deterministic color from name
  function avatarColor(name: string): string {
    const colors = [TEAL, "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#e11d48"]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  function fmtUltimaActividad(fecha: Date | null): string {
    if (!fecha) return "Sin actividad"
    const mins = Math.floor((ahora.getTime() - fecha.getTime()) / 60000)
    if (mins < 1) return "Ahora"
    if (mins < 60) return `Hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Hace ${hrs}h`
    const d = Math.floor(hrs / 24)
    if (d === 1) return "Ayer"
    if (d < 7) return `Hace ${d} dias`
    return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  }

  // ── KPI totals ─────────────────────────────────────────────────────────────

  const totalVisitasHoy = equipo.reduce((s, u) => s + u.visitasHoy, 0)
  const totalProyActivos = equipo.reduce((s, u) => s + u.proyectosActivos, 0)
  const totalTareasPend = equipo.reduce((s, u) => s + u.tareasPendientes, 0)
  const totalTareasVenc = equipo.reduce((s, u) => s + u.tareasVencidas, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Equipo"
        subtitle={`${equipo.length} usuarios activos`}
        breadcrumb={[{ label: "Admin", href: "/admin/usuarios" }]}
      />

      {/* ── KPIs globales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Visitas hoy", value: totalVisitasHoy, color: TEAL },
          { label: "Proyectos activos", value: totalProyActivos, color: "#6366f1" },
          { label: "Tareas pendientes", value: totalTareasPend, color: ORANGE },
          { label: "Tareas vencidas", value: totalTareasVenc, color: totalTareasVenc > 0 ? "#dc2626" : "#16a34a" },
        ].map(k => (
          <div
            key={k.label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
            style={{ borderTop: `3px solid ${k.color}` }}
          >
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Card grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipo.map(u => {
          const rc = ROL_COLOR[u.rol] ?? { bg: "#f3f4f6", text: "#6b7280" }
          const ac = avatarColor(u.nombre)
          const hasOverdue = u.tareasVencidas > 0

          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border transition-shadow hover:shadow-md ${
                hasOverdue
                  ? "border-red-200 dark:border-red-900/50"
                  : "border-gray-100 dark:border-gray-800"
              }`}
            >
              {/* Header: avatar + name + role */}
              <div className="p-5 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: ac }}
                  >
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {u.nombre}
                      </p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: rc.bg, color: rc.text }}
                      >
                        {ROL_LABEL[u.rol] ?? u.rol}
                      </span>
                    </div>
                    {/* Zones as small tags */}
                    {u.zonas.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {u.zonas.map(z => (
                          <span
                            key={z}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate max-w-[100px]"
                          >
                            {z}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="px-5 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {/* Visitas hoy */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{u.visitasHoy}</p>
                      <p className="text-[10px] text-gray-400">Hoy</p>
                    </div>
                  </div>

                  {/* Visitas esta semana */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{u.visitasSemana}</p>
                      <p className="text-[10px] text-gray-400">Semana</p>
                    </div>
                  </div>

                  {/* Proyectos activos */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{u.proyectosActivos}</p>
                      <p className="text-[10px] text-gray-400">Proyectos</p>
                    </div>
                  </div>

                  {/* Tareas pendientes */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{u.tareasPendientes}</p>
                      <p className="text-[10px] text-gray-400">Pendientes</p>
                    </div>
                  </div>
                </div>

                {/* Tareas vencidas (red alert if > 0) */}
                {hasOverdue && (
                  <div className="mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      {u.tareasVencidas} tarea{u.tareasVencidas > 1 ? "s" : ""} vencida{u.tareasVencidas > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer: ultima actividad */}
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        u.ultimaActividad === null
                          ? "#d1d5db"
                          : ahora.getTime() - u.ultimaActividad.getTime() < 86400000
                            ? "#22c55e"
                            : "#f59e0b",
                    }}
                  />
                  <p className="text-[11px] text-gray-400">
                    {fmtUltimaActividad(u.ultimaActividad)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
