/**
 * Zod schemas del módulo Inteligencia InLab (re-exportados desde @/lib/schemas).
 */
import { z } from "zod"
import { CAMPOS } from "./mapping"
import { LIMITES, TRAMOS } from "./types"
import { N_BUCKETS } from "./histogram"
import { EVENTO_CATEGORIAS } from "./mapping"
import { esDiaValido } from "./dates"

const dia = z.string().refine(esDiaValido, { message: "Día inválido (YYYY-MM-DD)" })
const texto = z.string().max(LIMITES.maxTextoDimension)
const dic = z.array(texto).max(LIMITES.maxDiccionario)
const num = z.number().finite()
const nat = z.number().int().min(0)
const filas = (n: number) => z.array(z.array(num).min(n)).max(LIMITES.maxFilasPorTabla)

export const InlabPayloadSchema = z.object({
  v: z.literal(2, { error: "Formato de agregados antiguo: recarga la página e intenta de nuevo la carga." }),
  dic: z.object({ areas: dic, puestos: dic, consumibles: dic, impresoras: dic, eventos: dic }),
  dias: z.array(dia).min(1).max(LIMITES.maxDias),
  consumo: filas(6),
  puestos: filas(7),
  actividad: filas(30),
  tiempos: filas(7),
  eventos: filas(7),
})

const campoKeys = CAMPOS.map(c => c.key) as [string, ...string[]]
export const InlabMapeoSchema = z.partialRecord(z.enum(campoKeys), z.string().max(200).nullable())

export const InlabOpcionesSchema = z.object({
  delimitador: z.enum([";", ",", "\t", "|"]),
  codificacion: z.enum(["utf-8", "windows-1252"]),
  ordenFecha: z.enum(["DMY", "MDY"]),
})

export const InlabCargaCheck = z.object({
  hospitalId: z.string().min(1).max(100),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  dias: z.array(dia).min(1).max(LIMITES.maxDias),
})

export const InlabCargaCreate = z.object({
  hospitalId: z.string().min(1).max(100),
  modo: z.enum(["NUEVA", "SUSTITUIR", "OMITIR"]),
  meta: z.object({
    fichero: z.string().min(1).max(255),
    tamanoBytes: nat,
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    filas: nat,
    filasValidas: nat,
    filasDescartadas: nat,
    avisos: z.array(z.string().max(400)).max(50),
  }),
  mapeo: InlabMapeoSchema,
  opciones: InlabOpcionesSchema,
  guardarMapeo: z.boolean().optional(),
  payload: InlabPayloadSchema,
})

export const InlabMapeoUpsert = z.object({
  mapeo: InlabMapeoSchema,
  opciones: InlabOpcionesSchema.optional(),
})

export const InlabTarifasUpsert = z.object({
  hospitalId: z.string().min(1).max(100),
  tarifas: z.array(z.object({
    consumible: z.string().min(1).max(LIMITES.maxTextoDimension),
    precio: z.number().min(0).max(1_000_000),
    moneda: z.string().length(3).default("EUR"),
    unidad: z.string().max(40).optional().nullable(),
    vigenteDesde: dia.optional().nullable(),
    vigenteHasta: dia.optional().nullable(),
  })).max(500),
})

export const InlabShareCreate = z.object({
  hospitalId: z.string().min(1).max(100),
  desde: dia.optional().nullable(),
  hasta: dia.optional().nullable(),
  incluirFacturacion: z.boolean().optional(),
  expiraDias: z.number().int().min(1).max(365).optional().nullable(),
})

/** Validación semántica de índices (lo que Zod no cubre con tuplas de longitud variable). */
export function validarIndicesPayload(p: z.infer<typeof InlabPayloadSchema>): string | null {
  const nd = p.dias.length
  const { areas, puestos, consumibles, impresoras, eventos } = p.dic
  const ok = (v: number, n: number, opcional = false) => Number.isInteger(v) && (opcional ? v >= -1 : v >= 0) && v < n
  for (const r of p.consumo) if (!ok(r[0], nd) || !ok(r[1], areas.length) || !ok(r[2], consumibles.length) || r[4] < 0 || r[5] < 0) return "consumo: índice fuera de rango"
  for (const r of p.puestos) if (!ok(r[0], nd) || !ok(r[1], areas.length) || !ok(r[2], puestos.length)) return "puestos: índice fuera de rango"
  for (const r of p.actividad) if (!ok(r[0], nd) || !ok(r[1], areas.length) || r.length !== 30) return "actividad: fila inválida"
  for (const r of p.tiempos) {
    if (!ok(r[0], nd) || !ok(r[1], areas.length) || !ok(r[3], TRAMOS.length) || (r.length - 7) % 2 !== 0) return "tiempos: fila inválida"
    for (let i = 7; i < r.length; i += 2) if (!ok(r[i], N_BUCKETS)) return "tiempos: bucket inválido"
  }
  for (const r of p.eventos) if (!ok(r[0], nd) || !ok(r[1], areas.length) || !ok(r[2], puestos.length, true) || !ok(r[3], impresoras.length, true) || !ok(r[4], EVENTO_CATEGORIAS.length) || !ok(r[5], eventos.length, true)) return "eventos: índice fuera de rango"
  return null
}
