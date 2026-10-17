/**
 * Pruebas que se piden juntas (solo servidor): lee `inlab_prueba_par` (parejas por mes × área,
 * ver InlabPares en types.ts) y calcula, para el periodo y las work areas pedidas:
 *
 *   · compañeras de una prueba X: con qué otras pruebas va X en la misma petición
 *     («de las peticiones con X, el N % incluye también Y») y cuánto más de lo esperado (lift)
 *   · afines: parejas que van juntas mucho más de lo que tocaría por azar (paneles clínicos:
 *     FSH + LH, anti-TPO + anti-TG, C3 + C4…)
 *   · frecuentes: las parejas con más peticiones (la «cesta» básica: urea + creatinina…)
 *
 * Las parejas van por MES: el periodo se amplía a meses completos y solo cuentan los meses que
 * tienen parejas cargadas (las cargas anteriores a esta función no las tienen). Los totales por
 * prueba (denominadores) salen de `inlab_prueba_diaria` en esos mismos meses y áreas, así los %
 * no se diluyen con meses sin parejas. No hay prioridad: las parejas no se separan por urgencia.
 */
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { dateToDia, diaToDate } from "./dates"

export * from "./juntas-calculo"
import { calcularJuntas, JUNTAS_VACIO, SOPORTE_MIN_AFINES, type JuntasRespuesta } from "./juntas-calculo"

/** "2026-03-17" → "2026-03-01" */
const inicioMes = (d: string) => `${d.slice(0, 7)}-01`
function mesSiguiente(d: string): string {
  const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7))
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
}

/**
 * Lee los agregados de BD y calcula la respuesta. `desde`/`hasta` (días) se amplían a meses
 * completos; `areas` vacío = todas.
 */
export async function cargarJuntas(hospitalIds: string[], opts: { desde?: string; hasta?: string; areas?: string[]; prueba?: string | null }): Promise<JuntasRespuesta> {
  if (hospitalIds.length === 0) return JUNTAS_VACIO
  const ini = opts.desde ? diaToDate(inicioMes(opts.desde)) : null
  const fin = opts.hasta ? diaToDate(mesSiguiente(opts.hasta)) : null
  const areas = opts.areas ?? []
  const condPar: Prisma.Sql[] = [Prisma.sql`p.hospital_id IN (${Prisma.join(hospitalIds)})`]
  if (ini) condPar.push(Prisma.sql`p.mes >= ${ini}`)
  if (fin) condPar.push(Prisma.sql`p.mes < ${fin}`)
  if (areas.length) condPar.push(Prisma.sql`p.area IN (${Prisma.join(areas)})`)
  const wherePar = Prisma.join(condPar, " AND ")

  const condDia: Prisma.Sql[] = [Prisma.sql`d.hospital_id IN (${Prisma.join(hospitalIds)})`]
  if (ini) condDia.push(Prisma.sql`d.fecha >= ${ini}`)
  if (fin) condDia.push(Prisma.sql`d.fecha < ${fin}`)
  if (areas.length) condDia.push(Prisma.sql`d.area IN (${Prisma.join(areas)})`)
  const whereDia = Prisma.join(condDia, " AND ")

  // Meses (por hospital) con parejas cargadas: los denominadores solo cuentan esos meses
  const mesesSql = Prisma.sql`SELECT DISTINCT p.hospital_id, p.mes FROM inlab_prueba_par p WHERE ${wherePar}`

  const [meses, totales, parejas, deLaPrueba] = await Promise.all([
    db.$queryRaw<{ mes: Date }[]>`SELECT DISTINCT mes FROM (${mesesSql}) m ORDER BY mes`,
    db.$queryRaw<{ prueba: string; seccion: string; n: number }[]>`
      WITH m AS (${mesesSql})
      SELECT d.prueba, MIN(d.seccion) AS seccion, SUM(d.peticiones)::int AS n
      FROM inlab_prueba_diaria d
      JOIN m ON m.hospital_id = d.hospital_id AND m.mes = date_trunc('month', d.fecha)::date
      WHERE ${whereDia}
      GROUP BY d.prueba`,
    db.$queryRaw<{ a: string; b: string; n: number }[]>`
      SELECT LEAST(p.prueba_a, p.prueba_b) AS a, GREATEST(p.prueba_a, p.prueba_b) AS b, SUM(p.peticiones)::int AS n
      FROM inlab_prueba_par p
      WHERE ${wherePar}
      GROUP BY 1, 2
      HAVING SUM(p.peticiones) >= ${SOPORTE_MIN_AFINES}`,
    opts.prueba
      ? db.$queryRaw<{ otra: string; n: number }[]>`
        SELECT CASE WHEN p.prueba_a = ${opts.prueba} THEN p.prueba_b ELSE p.prueba_a END AS otra, SUM(p.peticiones)::int AS n
        FROM inlab_prueba_par p
        WHERE ${wherePar} AND (p.prueba_a = ${opts.prueba} OR p.prueba_b = ${opts.prueba})
        GROUP BY 1`
      : Promise.resolve(null),
  ])
  if (meses.length === 0) return JUNTAS_VACIO
  const mapa = new Map<string, { n: number; seccion: string }>()
  let peticiones = 0
  for (const t of totales) {
    if (t.prueba === "") peticiones += t.n
    else mapa.set(t.prueba, { n: t.n, seccion: t.seccion })
  }
  return calcularJuntas({
    meses: meses.map(m => dateToDia(m.mes).slice(0, 7)),
    peticiones,
    totales: mapa,
    parejas,
    deLaPrueba: opts.prueba && deLaPrueba ? { nombre: opts.prueba, filas: deLaPrueba } : null,
  })
}
