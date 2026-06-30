import { db } from "@/lib/db"

export interface HospitalScore {
  total: number
  label: "Excelente" | "Buena relación" | "Atención" | "En riesgo"
  color: string
  breakdown: {
    visitas: { score: number; count: number; max: number }
    proyectos: { score: number; enCurso: number; total: number; max: number }
    hardware: { score: number; count: number; max: number }
    seguimiento: { score: number; count: number; max: number }
    penalizacion: number
  }
}

export async function computeHospitalScore(hospitalId: string): Promise<HospitalScore> {
  const now = new Date()
  const d60 = new Date(now.getTime() - 60 * 86_400_000)
  const d30 = new Date(now.getTime() - 30 * 86_400_000)

  const [visitasCount, proyectos, hwCount, llamadasCount, incidenciasCriticas] = await Promise.all([
    db.visita.count({ where: { hospitalId, fecha: { gte: d60 } } }),
    db.proyecto.findMany({
      where: { hospitalId },
      select: { estado: true, fases: { select: { estado: true } } },
    }),
    db.hardwareUnidad.count({ where: { hospitalId } }),
    db.registroLlamada.count({ where: { hospitalId, creadoEn: { gte: d30 } } }),
    db.incidencia.count({
      where: {
        hospitalId,
        prioridad: "CRITICA",
        estado: { notIn: ["RESUELTA", "CERRADA"] },
      },
    }),
  ])

  const proyectosEnCurso = proyectos.filter(p => {
    if (p.estado === "PAUSADO" || p.estado === "CANCELADO") return false
    if (!p.fases.length) return false
    return p.fases.some(f => f.estado === "EN_PROGRESO" || f.estado === "COMPLETADO")
  }).length

  const visitasScore   = Math.min(visitasCount * 10, 30)
  const proyectosScore = proyectosEnCurso > 0 ? 30 : proyectos.length > 0 ? 15 : 0
  const hwScore        = Math.min(hwCount * 5, 20)
  const seguimientoScore = Math.min(llamadasCount * 10, 20)
  const penalizacion   = Math.min(incidenciasCriticas * 5, 15)

  const total = Math.max(0, Math.min(100, visitasScore + proyectosScore + hwScore + seguimientoScore - penalizacion))

  const label: HospitalScore["label"] =
    total >= 80 ? "Excelente" :
    total >= 60 ? "Buena relación" :
    total >= 40 ? "Atención" :
    "En riesgo"

  const color =
    total >= 80 ? "#16a34a" :
    total >= 60 ? "#2563eb" :
    total >= 40 ? "#d97706" :
    "#dc2626"

  return {
    total,
    label,
    color,
    breakdown: {
      visitas:     { score: visitasScore, count: visitasCount, max: 30 },
      proyectos:   { score: proyectosScore, enCurso: proyectosEnCurso, total: proyectos.length, max: 30 },
      hardware:    { score: hwScore, count: hwCount, max: 20 },
      seguimiento: { score: seguimientoScore, count: llamadasCount, max: 20 },
      penalizacion,
    },
  }
}
