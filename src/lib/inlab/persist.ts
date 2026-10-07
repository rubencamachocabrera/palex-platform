/**
 * Persistencia de una carga InLab (solo servidor): deduplicación por días,
 * sustitución u omisión de días solapados e inserción en bloque en una transacción.
 */
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { dateToDia, diaToDate } from "./dates"
import { EVENTO_CATEGORIAS, type Mapeo } from "./mapping"
import { fromSparse } from "./histogram"
import { TRAMOS, type InlabPayload } from "./types"

const CHUNK = 5000

/** Días del hospital (de la lista dada) que ya tienen datos cargados. */
export async function diasYaCargados(hospitalId: string, dias: string[], client: Prisma.TransactionClient = db): Promise<string[]> {
  if (dias.length === 0) return []
  const sorted = [...dias].sort()
  const rows = await client.inlabActividadDiaria.groupBy({
    by: ["fecha"],
    where: { hospitalId, fecha: { gte: diaToDate(sorted[0]), lte: diaToDate(sorted[sorted.length - 1]) } },
  })
  const set = new Set(dias)
  return rows.map(r => dateToDia(r.fecha)).filter(d => set.has(d)).sort()
}

/** Cargas que aportan datos a alguno de esos días. */
export async function cargasConDias(hospitalId: string, dias: string[]) {
  if (dias.length === 0) return []
  const rows = await db.inlabActividadDiaria.groupBy({
    by: ["cargaId"],
    where: { hospitalId, fecha: { in: dias.map(diaToDate) } },
  })
  if (rows.length === 0) return []
  return db.inlabCarga.findMany({
    where: { id: { in: rows.map(r => r.cargaId) } },
    select: { id: true, fichero: true, creadoEn: true, desde: true, hasta: true, usuario: { select: { nombre: true } } },
    orderBy: { creadoEn: "desc" },
  })
}

export interface PersistirInput {
  hospitalId: string
  usuarioId: string
  modo: "NUEVA" | "SUSTITUIR" | "OMITIR"
  meta: { fichero: string; tamanoBytes: number; hash: string; filas: number; filasValidas: number; filasDescartadas: number; avisos: string[] }
  mapeo: Mapeo
  opciones: Record<string, unknown>
  payload: InlabPayload
}

export class SolapeError extends Error {
  constructor(public dias: string[]) { super("La carga solapa días ya cargados") }
}

export class SinDiasNuevosError extends Error {
  constructor() { super("Todos los días del fichero ya estaban cargados: no hay nada nuevo que añadir.") }
}

export async function persistirCarga(input: PersistirInput) {
  const { payload: p, hospitalId } = input
  const fechaDe = p.dias.map(diaToDate)
  const D = p.dic

  return db.$transaction(async tx => {
    // Comprobación de solapes dentro de la transacción (evita carreras entre dos cargas simultáneas)
    const solapados = await diasYaCargados(hospitalId, p.dias, tx)
    if (solapados.length > 0 && input.modo === "NUEVA") throw new SolapeError(solapados)
    const omitir = new Set(input.modo === "OMITIR" ? solapados : [])
    const diasFinales = p.dias.filter(d => !omitir.has(d))
    if (diasFinales.length === 0) throw new SinDiasNuevosError()
    const keep = (r: number[]) => !omitir.has(p.dias[r[0]])

    const afectadas = new Set<string>()
    if (input.modo === "SUSTITUIR" && solapados.length > 0) {
      const whereDias = { hospitalId, fecha: { in: solapados.map(diaToDate) } }
      const previas = await tx.inlabActividadDiaria.groupBy({ by: ["cargaId"], where: whereDias })
      previas.forEach(r => afectadas.add(r.cargaId))
      await tx.inlabConsumoDiario.deleteMany({ where: whereDias })
      await tx.inlabPuestoDiario.deleteMany({ where: whereDias })
      await tx.inlabActividadDiaria.deleteMany({ where: whereDias })
      await tx.inlabTiempoDiario.deleteMany({ where: whereDias })
      await tx.inlabEventoDiario.deleteMany({ where: whereDias })
    }

    const carga = await tx.inlabCarga.create({
      data: {
        hospitalId,
        usuarioId: input.usuarioId,
        fichero: input.meta.fichero,
        tamanoBytes: input.meta.tamanoBytes,
        hash: input.meta.hash,
        desde: diaToDate(diasFinales[0]),
        hasta: diaToDate(diasFinales[diasFinales.length - 1]),
        filas: input.meta.filas,
        filasValidas: input.meta.filasValidas,
        filasDescartadas: input.meta.filasDescartadas,
        dias: diasFinales.length,
        diasSustituidos: input.modo === "SUSTITUIR" ? solapados.length : 0,
        diasOmitidos: omitir.size,
        modo: input.modo,
        mapeo: input.mapeo as Prisma.InputJsonValue,
        opciones: input.opciones as Prisma.InputJsonValue,
        avisos: input.meta.avisos as Prisma.InputJsonValue,
      },
      select: { id: true },
    })
    const base = { cargaId: carga.id, hospitalId }

    const insert = async <T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>) => {
      for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK))
    }

    await insert(p.consumo.filter(keep).map(r => ({
      ...base, fecha: fechaDe[r[0]], area: D.areas[r[1]] ?? "", consumible: D.consumibles[r[2]] ?? "",
      urgente: r[3] === 1, unidades: Math.round(r[4]), registros: Math.round(r[5]),
    })), data => tx.inlabConsumoDiario.createMany({ data }))

    await insert(p.puestos.filter(keep).map(r => ({
      ...base, fecha: fechaDe[r[0]], area: D.areas[r[1]] ?? "", puesto: D.puestos[r[2]] ?? "",
      registros: Math.round(r[3]), unidades: Math.round(r[4]), urgentes: Math.round(r[5]), eventos: Math.round(r[6]),
    })), data => tx.inlabPuestoDiario.createMany({ data }))

    await insert(p.actividad.filter(keep).map(r => ({
      ...base, fecha: fechaDe[r[0]], area: D.areas[r[1]] ?? "",
      registros: Math.round(r[2]), unidades: Math.round(r[3]), urgentes: Math.round(r[4]),
      ordenes: r[5] >= 0 ? Math.round(r[5]) : null, porHora: r.slice(6, 30).map(v => Math.round(v)),
    })), data => tx.inlabActividadDiaria.createMany({ data }))

    await insert(p.tiempos.filter(keep).map(r => ({
      ...base, fecha: fechaDe[r[0]], area: D.areas[r[1]] ?? "", urgente: r[2] === 1, tramo: TRAMOS[r[3]],
      n: Math.round(r[4]), sumaMin: r[5], maxMin: r[6], histograma: fromSparse(r, 7),
    })), data => tx.inlabTiempoDiario.createMany({ data }))

    await insert(p.eventos.filter(keep).map(r => ({
      ...base, fecha: fechaDe[r[0]], area: D.areas[r[1]] ?? "",
      puesto: r[2] >= 0 ? D.puestos[r[2]] ?? "" : "", impresora: r[3] >= 0 ? D.impresoras[r[3]] ?? "" : "",
      tipo: EVENTO_CATEGORIAS[r[4]] ?? "OTRO", detalle: r[5] >= 0 ? D.eventos[r[5]] ?? "" : "", cantidad: Math.round(r[6]),
    })), data => tx.inlabEventoDiario.createMany({ data }))

    // Marca las cargas anteriores que han perdido días al sustituir
    for (const id of afectadas) {
      const restantes = await tx.inlabActividadDiaria.count({ where: { cargaId: id } })
      await tx.inlabCarga.update({ where: { id }, data: { estado: restantes === 0 ? "SUSTITUIDA" : "PARCIAL" } })
    }

    return { id: carga.id, dias: diasFinales.length, diasSustituidos: input.modo === "SUSTITUIR" ? solapados.length : 0, diasOmitidos: omitir.size }
  }, { timeout: 120_000, maxWait: 10_000, isolationLevel: "Serializable" })
}
