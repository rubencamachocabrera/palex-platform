/**
 * Pruebas que se piden juntas — cálculo puro (cliente o servidor, sin BD): de los agregados
 * (parejas, totales por prueba, peticiones) a la respuesta de /api/inlab/pruebas/juntas.
 * La lectura de BD está en juntas.ts. Ver allí el alcance (meses completos, sin prioridad).
 */
export interface Companera {
  prueba: string
  seccion: string
  /** peticiones que incluyen las dos */
  n: number
  /** % de las peticiones con la prueba elegida que incluyen también esta */
  pct: number
  /** % de las peticiones con esta prueba que incluyen también la elegida */
  pctInversa: number | null
  /** veces más de lo esperado si se pidieran por separado (1 = independientes) */
  lift: number | null
}

export interface Pareja {
  a: string
  b: string
  seccionA: string
  seccionB: string
  n: number
  /** % de las peticiones con A que incluyen B */
  pctAB: number
  /** % de las peticiones con B que incluyen A */
  pctBA: number
  lift: number
}

export interface JuntasRespuesta {
  /** meses con parejas cargadas usados en el cálculo ("YYYY-MM"), ordenados */
  meses: string[]
  /** peticiones con al menos una prueba en esos meses y áreas */
  peticiones: number
  prueba: { nombre: string; seccion: string; n: number; companeras: Companera[] } | null
  afines: Pareja[]
  frecuentes: Pareja[]
}

export const JUNTAS_VACIO: JuntasRespuesta = { meses: [], peticiones: 0, prueba: null, afines: [], frecuentes: [] }

/** Mínimo de peticiones con las dos pruebas para considerar una pareja «afín». */
export const SOPORTE_MIN_AFINES = 20
/** Lift mínimo para que una pareja cuente como afín. */
export const LIFT_MIN_AFINES = 2

export interface EntradaJuntas {
  meses: string[]
  /** peticiones con pruebas (prueba "" en inlab_prueba_diaria) */
  peticiones: number
  /** por prueba: peticiones que la incluyen y sección */
  totales: Map<string, { n: number; seccion: string }>
  /** parejas agregadas (a, b en cualquier orden) */
  parejas: { a: string; b: string; n: number }[]
  /** filas de compañeras de la prueba elegida (otra prueba → n), si se pidió */
  deLaPrueba: { nombre: string; filas: { otra: string; n: number }[] } | null
}

const redondear = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d

/** Cálculo puro (testeable sin BD): de los agregados a la respuesta. */
export function calcularJuntas(e: EntradaJuntas, opts: { maxCompaneras?: number; maxAfines?: number; maxFrecuentes?: number } = {}): JuntasRespuesta {
  const { maxCompaneras = 25, maxAfines = 60, maxFrecuentes = 15 } = opts
  const N = e.peticiones
  const tot = (p: string) => e.totales.get(p)?.n ?? 0
  const sec = (p: string) => e.totales.get(p)?.seccion ?? ""
  const liftDe = (n: number, a: number, b: number) => (N && a && b ? (n * N) / (a * b) : null)

  let prueba: JuntasRespuesta["prueba"] = null
  if (e.deLaPrueba) {
    const X = e.deLaPrueba.nombre, nX = tot(X)
    const companeras = e.deLaPrueba.filas
      .filter(f => f.otra !== X && f.n > 0)
      .map(f => {
        const nY = tot(f.otra)
        const l = liftDe(f.n, nX, nY)
        return {
          prueba: f.otra, seccion: sec(f.otra), n: f.n,
          pct: nX ? redondear((f.n / nX) * 100) : 0,
          pctInversa: nY ? redondear((f.n / nY) * 100) : null,
          lift: l === null ? null : redondear(l, 2),
        }
      })
      .sort((a, b) => b.n - a.n || a.prueba.localeCompare(b.prueba, "es"))
      .slice(0, maxCompaneras)
    prueba = { nombre: X, seccion: sec(X), n: nX, companeras }
  }

  const parejas: Pareja[] = []
  for (const p of e.parejas) {
    if (p.a === p.b) continue
    const nA = tot(p.a), nB = tot(p.b)
    if (!nA || !nB) continue
    const l = liftDe(p.n, nA, nB) ?? 0
    // Orden de lectura: primero la prueba menos frecuente («quien pide A, pide también B»)
    const [a, b, na, nb] = nA <= nB ? [p.a, p.b, nA, nB] : [p.b, p.a, nB, nA]
    parejas.push({
      a, b, seccionA: sec(a), seccionB: sec(b), n: p.n,
      pctAB: redondear(Math.min(100, (p.n / na) * 100)), pctBA: redondear(Math.min(100, (p.n / nb) * 100)), lift: redondear(l, 2),
    })
  }
  const soporte = Math.max(SOPORTE_MIN_AFINES, Math.round(N * 0.0005))
  const afines = parejas
    .filter(p => p.n >= soporte && p.lift >= LIFT_MIN_AFINES)
    // Paneles: las dos direcciones fuertes primero; desempate por volumen
    .sort((x, y) => Math.min(y.pctAB, y.pctBA) - Math.min(x.pctAB, x.pctBA) || y.n - x.n)
    .slice(0, maxAfines)
  const frecuentes = [...parejas].sort((x, y) => y.n - x.n).slice(0, maxFrecuentes)
  return { meses: e.meses, peticiones: N, prueba, afines, frecuentes }
}

