import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEuros(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}
function pct(num: number, den: number) {
  return den === 0 ? "—" : `${Math.round((num / den) * 100)}%`
}
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = TEAL }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" style={{ borderTop: `3px solid ${color}` }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold text-gray-700 mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">{children}</h2>
}

function MiniBar({ value, max, color = TEAL }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.max(4, (value / max) * 100)
  return (
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function DatosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rol    = session.user.role
  const userId = session.user.id

  if (rol === "PROYECTOS" || rol === "TECNICO") redirect("/dashboard")

  const ahora       = new Date()
  const inicioMes   = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicio3M    = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1)
  const inicio6M    = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)
  const hace90      = new Date(ahora.getTime() - 90 * 86400000)
  const esAdmin     = rol === "ADMIN"

  // ── Datos base ──────────────────────────────────────────────────────────────
  const [
    totalHospitales,
    visitasMes,
    visitasPrevMes,
    totalOportunidades,
    opsGanadas,
    opsPerdidas,
    valorPipeline,
    valorGanado,
    proximasFechaCierre,
    visitasPorMes6M,
    visitasPorZona,
    topUsuariosVisitas,
    topUsuariosValor,
    proyectosPorEstado,
    hosp90,
    mediaCicloOps,
  ] = await Promise.all([
    db.hospital.count({ where: { activo: true } }),

    db.visita.count({ where: {
      creadoEn: { gte: inicioMes },
      ...(esAdmin ? {} : { usuarioId: userId }),
    }}),

    db.visita.count({ where: {
      creadoEn: {
        gte: new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1),
        lte: new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59),
      },
      ...(esAdmin ? {} : { usuarioId: userId }),
    }}),

    db.oportunidad.count({ where: {
      etapa: { notIn: ["GANADO","PERDIDO"] },
      ...(esAdmin ? {} : { usuarioId: userId }),
    }}),

    db.oportunidad.count({ where: {
      etapa: "GANADO",
      ...(esAdmin ? {} : { usuarioId: userId }),
    }}),

    db.oportunidad.count({ where: {
      etapa: "PERDIDO",
      ...(esAdmin ? {} : { usuarioId: userId }),
    }}),

    db.oportunidad.aggregate({
      where: { etapa: { notIn: ["PERDIDO"] }, ...(esAdmin ? {} : { usuarioId: userId }) },
      _sum: { valorEstimado: true },
    }),

    db.oportunidad.aggregate({
      where: { etapa: "GANADO", ...(esAdmin ? {} : { usuarioId: userId }) },
      _sum: { valorEstimado: true },
    }),

    db.oportunidad.findMany({
      where: {
        etapa: { notIn: ["PERDIDO","GANADO"] },
        fechaCierre: { gte: ahora, lte: new Date(ahora.getTime() + 90*86400000) },
        ...(esAdmin ? {} : { usuarioId: userId }),
      },
      select: { id: true, titulo: true, valorEstimado: true, probabilidad: true, fechaCierre: true, hospital: { select: { nombre: true } } },
      orderBy: { fechaCierre: "asc" }, take: 8,
    }),

    db.visita.findMany({
      where: {
        creadoEn: { gte: inicio6M },
        ...(esAdmin ? {} : { usuarioId: userId }),
      },
      select: { creadoEn: true },
    }),

    esAdmin ? db.zona.findMany({
      select: {
        nombre: true,
        _count: { select: { hospitales: true } },
        hospitales: {
          select: {
            _count: { select: { visitas: true, oportunidades: true } },
          },
          where: { activo: true },
        },
      },
    }) : Promise.resolve([]),

    esAdmin ? db.usuario.findMany({
      where: { activo: true },
      select: {
        id: true, nombre: true,
        _count: { select: { visitas: true } },
      },
      orderBy: { visitas: { _count: "desc" } },
      take: 8,
    }) : Promise.resolve([]),

    esAdmin ? db.oportunidad.groupBy({
      by: ["usuarioId"],
      where: { etapa: "GANADO" },
      _sum: { valorEstimado: true },
      _count: { _all: true },
      orderBy: { _sum: { valorEstimado: "desc" } },
      take: 8,
    }) : Promise.resolve([]),

    db.preProyecto.groupBy({
      by: ["estado"],
      where: { ...(esAdmin ? {} : { responsableId: userId }) },
      _count: { _all: true },
    }),

    esAdmin ? db.hospital.findMany({
      where: { activo: true, visitas: { none: { fecha: { gte: hace90 } } } },
      select: { id: true, nombre: true, ciudad: true },
      orderBy: { nombre: "asc" }, take: 8,
    }) : Promise.resolve([]),

    db.oportunidad.findMany({
      where: { etapa: "GANADO", ...(esAdmin ? {} : { usuarioId: userId }) },
      select: { creadoEn: true, editadoEn: true },
      take: 100,
    }),
  ])

  // ── Cálculos derivados ──────────────────────────────────────────────────────
  const totalOps = totalOportunidades + opsGanadas + opsPerdidas
  const winRate  = pct(opsGanadas, opsGanadas + opsPerdidas)

  const mediaCicloDias = mediaCicloOps.length > 0
    ? Math.round(
        mediaCicloOps.reduce((s, o) => s + (new Date(o.editadoEn).getTime() - new Date(o.creadoEn).getTime()), 0)
        / mediaCicloOps.length / 86400000
      )
    : null

  // Visitas por mes (6 meses)
  const visitasMeses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
    const count = visitasPorMes6M.filter(v => {
      const vd = new Date(v.creadoEn)
      return vd.getFullYear() === d.getFullYear() && vd.getMonth() === d.getMonth()
    }).length
    return { mes: MESES[d.getMonth()], count }
  })
  const maxMes = Math.max(...visitasMeses.map(m => m.count), 1)

  // Previsión cierre (próximos 3 meses, ponderada por probabilidad)
  const prevision3M = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1)
    const sum = proximasFechaCierre
      .filter(o => o.fechaCierre && new Date(o.fechaCierre).getFullYear() === d.getFullYear() && new Date(o.fechaCierre).getMonth() === d.getMonth())
      .reduce((s, o) => s + (o.valorEstimado ?? 0) * ((o.probabilidad ?? 50) / 100), 0)
    return { mes: MESES[d.getMonth()], v: Math.round(sum) }
  })

  // Zonas
  type ZonaRow = { nombre: string; _count: { hospitales: number }; hospitales: { _count: { visitas: number; oportunidades: number } }[] }
  const zonasData = (visitasPorZona as ZonaRow[]).map(z => ({
    nombre: z.nombre,
    hospitales: z._count.hospitales,
    visitas: z.hospitales.reduce((s, h) => s + h._count.visitas, 0),
    oportunidades: z.hospitales.reduce((s, h) => s + h._count.oportunidades, 0),
  })).sort((a, b) => b.visitas - a.visitas)
  const maxZonaVisitas = Math.max(...zonasData.map(z => z.visitas), 1)

  // Proyectos
  const ORDEN_EST = ["EN_CURSO","PENDIENTE","COMPLETADO","EN_ESPERA","CANCELADO"]
  const COLOR_EST: Record<string, string> = {
    EN_CURSO: TEAL, PENDIENTE: "#f59e0b", COMPLETADO: "#16a34a", EN_ESPERA: "#6366f1", CANCELADO: "#9ca3af"
  }
  const LABEL_EST: Record<string, string> = {
    EN_CURSO: "En curso", PENDIENTE: "Pendiente", COMPLETADO: "Completado", EN_ESPERA: "En espera", CANCELADO: "Cancelado"
  }
  const proyEstados = ORDEN_EST
    .map(e => ({ estado: e, count: proyectosPorEstado.find(r => r.estado === e)?._count._all ?? 0 }))
    .filter(r => r.count > 0)
  const maxProy = Math.max(...proyEstados.map(r => r.count), 1)

  // Usuarios con nombre (para top valor)
  type GrupoValor = { usuarioId: string; _sum: { valorEstimado: number | null }; _count: { _all: number } }
  const usuariosValorIds = (topUsuariosValor as GrupoValor[]).map(g => g.usuarioId)
  const usuariosValorNombres = usuariosValorIds.length > 0
    ? await db.usuario.findMany({ where: { id: { in: usuariosValorIds } }, select: { id: true, nombre: true } })
    : []
  const nombreById = Object.fromEntries(usuariosValorNombres.map(u => [u.id, u.nombre]))

  const trendVisitas = visitasPrevMes > 0
    ? Math.round(((visitasMes - visitasPrevMes) / visitasPrevMes) * 100)
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Explotación de datos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            KPIs de rendimiento comercial y operacional · {esAdmin ? "Vista ADMIN" : "Vista personal"}
          </p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
          {ahora.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Hospitales activos"  value={totalHospitales}                                color={TEAL}    sub="en el sistema" />
        <KpiCard label="Visitas este mes"     value={visitasMes}                                    color="#6366f1" sub={trendVisitas !== null ? `${trendVisitas > 0 ? "+" : ""}${trendVisitas}% vs mes anterior` : undefined} />
        <KpiCard label="Pipeline activo"      value={fmtEuros(valorPipeline._sum.valorEstimado ?? 0)} color={ORANGE}  sub={`${totalOportunidades} oportunidades abiertas`} />
        <KpiCard label="Ganado acumulado"     value={fmtEuros(valorGanado._sum.valorEstimado ?? 0)} color="#16a34a" sub={`${opsGanadas} contratos cerrados`} />
      </div>

      {/* ── Fila 2: Conversión + Ciclo de venta ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Tasa de ganancia</p>
          <p className="text-4xl font-bold" style={{ color: TEAL }}>{winRate}</p>
          <p className="text-xs text-gray-500 mt-1">de oportunidades cerradas</p>
          <div className="mt-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-700"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {opsGanadas} ganadas</span>
            <span className="flex items-center gap-1 text-red-500"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {opsPerdidas} perdidas</span>
            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> {totalOportunidades} activas</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Ciclo medio de venta</p>
          {mediaCicloDias !== null ? (
            <>
              <p className="text-4xl font-bold text-gray-900">{mediaCicloDias}<span className="text-base font-medium text-gray-400 ml-1">días</span></p>
              <p className="text-xs text-gray-500 mt-1">desde creación hasta cierre ganado</p>
              <p className="text-[10px] text-gray-300 mt-2">basado en {mediaCicloOps.length} oportunidad{mediaCicloOps.length !== 1 ? "es" : ""} ganada{mediaCicloOps.length !== 1 ? "s" : ""}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-2">Sin oportunidades ganadas aún</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Previsión próximos 3 meses</p>
          {prevision3M.every(m => m.v === 0) ? (
            <p className="text-sm text-gray-400">Sin oportunidades con fecha de cierre próxima</p>
          ) : (
            <div className="space-y-2.5">
              {prevision3M.map(m => (
                <div key={m.mes} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 w-8 shrink-0">{m.mes}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: m.v === 0 ? "3px" : `${Math.max(10, (m.v / Math.max(...prevision3M.map(x => x.v), 1)) * 100)}%`, backgroundColor: ORANGE }} />
                  </div>
                  <span className="text-gray-700 font-semibold shrink-0 w-20 text-right">{fmtEuros(m.v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Actividad por mes ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionTitle>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Visitas — últimos 6 meses
          {!esAdmin && <span className="text-xs text-gray-400 font-normal">· solo las tuyas</span>}
        </SectionTitle>
        <div className="flex items-end gap-2 h-28">
          {visitasMeses.map((m, i) => {
            const h = m.count === 0 ? 4 : Math.max(8, (m.count / maxMes) * 96)
            const esActual = i === 5
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: 96 }}>
                  <div className="w-full rounded-t-md transition-all duration-500 relative group" style={{ height: h, backgroundColor: esActual ? TEAL : `${TEAL}55` }}>
                    {m.count > 0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-600">{m.count}</span>}
                  </div>
                </div>
                <span className="text-[9px] text-gray-400 font-medium">{m.mes}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Por zona (ADMIN) ── */}
      {esAdmin && zonasData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionTitle>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
              Actividad por zona
            </SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Zona</th>
                  <th className="text-center px-4 py-3 font-semibold">Hospitales</th>
                  <th className="px-4 py-3 font-semibold text-left">Visitas</th>
                  <th className="text-center px-4 py-3 font-semibold">Oportunidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {zonasData.map(z => (
                  <tr key={z.nombre} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-800">{z.nombre}</td>
                    <td className="px-4 py-3.5 text-center text-gray-500">{z.hospitales}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <MiniBar value={z.visitas} max={maxZonaVisitas} />
                        <span className="text-xs font-semibold text-gray-700 w-8 text-right shrink-0">{z.visitas}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>{z.oportunidades}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Rendimiento por comercial (ADMIN) ── */}
      {esAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top por visitas */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Top comerciales — visitas
            </SectionTitle>
            {(topUsuariosVisitas as { id: string; nombre: string; _count: { visitas: number } }[]).length === 0
              ? <p className="text-sm text-gray-400">Sin datos</p>
              : <div className="space-y-2.5">
                {(topUsuariosVisitas as { id: string; nombre: string; _count: { visitas: number } }[]).map((u, i) => {
                  const max = (topUsuariosVisitas as { id: string; nombre: string; _count: { visitas: number } }[])[0]._count.visitas
                  return (
                    <div key={u.id} className="flex items-center gap-2.5 text-xs">
                      <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                      <span className="text-gray-700 font-medium w-32 truncate shrink-0">{u.nombre}</span>
                      <MiniBar value={u._count.visitas} max={max} color="#6366f1" />
                      <span className="font-bold text-gray-700 w-8 text-right shrink-0">{u._count.visitas}</span>
                    </div>
                  )
                })}
              </div>
            }
          </div>

          {/* Top por valor ganado */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Top comerciales — valor ganado
            </SectionTitle>
            {(topUsuariosValor as GrupoValor[]).length === 0
              ? <p className="text-sm text-gray-400">Sin oportunidades ganadas aún</p>
              : <div className="space-y-2.5">
                {(topUsuariosValor as GrupoValor[]).map((g, i) => {
                  const maxVal = (topUsuariosValor as GrupoValor[])[0]._sum.valorEstimado ?? 1
                  const val = g._sum.valorEstimado ?? 0
                  return (
                    <div key={g.usuarioId} className="flex items-center gap-2.5 text-xs">
                      <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                      <span className="text-gray-700 font-medium w-32 truncate shrink-0">{nombreById[g.usuarioId] ?? "—"}</span>
                      <MiniBar value={val} max={maxVal} color="#16a34a" />
                      <span className="font-bold text-gray-700 shrink-0 w-20 text-right">{fmtEuros(val)}</span>
                    </div>
                  )
                })}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── Proyectos por estado ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Pre-proyectos por estado
            {!esAdmin && <span className="text-xs text-gray-400 font-normal">· los tuyos</span>}
          </SectionTitle>
          {proyEstados.length === 0
            ? <p className="text-sm text-gray-400">Sin proyectos</p>
            : <div className="space-y-2.5">
              {proyEstados.map(r => (
                <div key={r.estado} className="flex items-center gap-2.5 text-xs">
                  <span className="text-gray-600 w-24 truncate shrink-0">{LABEL_EST[r.estado] ?? r.estado}</span>
                  <MiniBar value={r.count} max={maxProy} color={COLOR_EST[r.estado] ?? TEAL} />
                  <span className="font-bold text-gray-700 w-5 text-right shrink-0">{r.count}</span>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Hospitales sin visitar (ADMIN) o próximas cierres */}
        {esAdmin && (hosp90 as { id: string; nombre: string; ciudad: string }[]).length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Sin visita en +90 días
            </SectionTitle>
            <div className="space-y-2">
              {(hosp90 as { id: string; nombre: string; ciudad: string }[]).map(h => (
                <Link key={h.id} href={`/hospitales/${h.id}`}
                  className="flex items-center gap-2 text-xs hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-gray-700 font-medium truncate flex-1">{h.nombre}</span>
                  <span className="text-gray-400 shrink-0">{h.ciudad}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : proximasFechaCierre.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Oportunidades con fecha de cierre próxima
            </SectionTitle>
            <div className="space-y-2">
              {proximasFechaCierre.map(o => {
                const dias = o.fechaCierre ? Math.ceil((new Date(o.fechaCierre).getTime() - ahora.getTime()) / 86400000) : 0
                return (
                  <div key={o.id} className="flex items-center gap-2 text-xs px-2 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dias <= 14 ? "#ef4444" : "#f59e0b" }} />
                    <span className="text-gray-700 font-medium truncate flex-1">{o.titulo}</span>
                    <span className="font-bold shrink-0" style={{ color: dias <= 14 ? "#ef4444" : "#f59e0b" }}>{dias}d</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

    </div>
  )
}
