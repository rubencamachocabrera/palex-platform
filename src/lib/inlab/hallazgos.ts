/**
 * «Lo que dicen los datos»: hallazgos escritos a partir de los cálculos ya verificados del
 * dashboard (analytics.ts, pruebas-analytics.ts, pulso.ts, juntas.ts). Reglas fijas, sin IA:
 * cada regla solo habla si hay datos suficientes y la diferencia es relevante, y su `peso`
 * decide el orden (los avisos primero). Las tendencias de volumen no llevan juicio de valor.
 *
 * Umbrales en HALLAZGOS (único sitio). Formato de cifras: el mismo que el resto del dashboard.
 */
import { diaSemana } from "./dates"
import {
  esSospechosa, etiquetaArea, eventosPor, grupoArea, kpis, peticionesDisponibles, porDiaSemana, tendencias,
  tiemposPorTramo, validacionesRapidas, VALIDACION_RAPIDA, type Dataset, type Filtros, type Rango,
} from "./analytics"
import { EVENTO_LABEL } from "./mapping"
import { cambiosPruebas, kpisPruebas, rankingPruebas, type DatasetPruebas } from "./pruebas-analytics"
import { fmtHora, rankingAreas, relojDia } from "./pulso"
import type { JuntasRespuesta } from "./juntas-calculo"
import { fmtDia, fmtMin, fmtN } from "@/components/inlab/charts"

export const HALLAZGOS = {
  /** desviación mínima (%) de un día de la semana frente a la media de lunes a viernes */
  minDiaSemana: 8,
  /** variación mínima (%) de volumen por día para comentarla */
  minTendencia: 5,
  /** días con datos mínimos para buscar el día récord y cuánto debe superar a su media (%) */
  minDiasRecord: 14,
  minRecord: 25,
  /** % mínimo de un área para decir que «concentra» la actividad */
  minConcentra: 35,
  /** variación mínima y máxima (%) y volumen mínimo (en los dos periodos) de una prueba que sube o baja */
  minCambioPrueba: 15,
  minVolumenCambio: 100,
  maxCambioPrueba: 300,
  /** peticiones mínimas con las dos pruebas para destacar una pareja */
  minPareja: 50,
  /** veces más de lo esperado mínimas para destacar una pareja */
  minLiftPareja: 5,
  /** mediciones mínimas para comentar un tiempo */
  minTiempos: 30,
} as const

export type IconoHallazgo = "aviso" | "reloj" | "calendario" | "tendencia" | "area" | "prueba" | "tiempo" | "calidad" | "juntas"

export type DestinoHallazgo =
  | { tab: "consumo" | "pruebas" | "tiempos" | "calidad" | "resumen"; areas?: string[]; prueba?: string }
  | { dia: string }

export interface Hallazgo {
  id: string
  tono: "aviso" | "neutro"
  icono: IconoHallazgo
  /** cifra grande de la tarjeta */
  cifra: string
  titulo: string
  texto: string
  ir?: DestinoHallazgo
  /** orden: mayor primero */
  peso: number
}

const DOW_PLURAL = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"]
const DOW_SING = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
const mayuscula = (t: string) => t.charAt(0).toLocaleUpperCase("es") + t.slice(1)
const signo = (v: number, dec = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtN(Math.abs(v), dec)} %`
/** 61 % → «6 de cada 10»; por debajo de 15 % → «el 12 %» */
const deCadaDiez = (pct: number) => (pct >= 15 && pct <= 95 ? `${Math.round(pct / 10)} de cada 10` : `el ${fmtN(pct, 0)} %`)

const enRango = (d: string, r: Rango) => d >= r.desde && d <= r.hasta
const okArea = (area: string, f: Filtros) => f.areas.length === 0 || f.areas.includes(area)

export interface ContextoHallazgos {
  ds: Dataset
  dp: DatasetPruebas | null
  rango: Rango
  filtros: Filtros
  juntas?: JuntasRespuesta | null
}

export function hallazgos({ ds, dp, rango: r, filtros: f, juntas }: ContextoHallazgos, max = 9): Hallazgo[] {
  const H = HALLAZGOS
  const out: Hallazgo[] = []
  const conPet = peticionesDisponibles(ds, f)
  const nombre = conPet ? "peticiones" : "tubos y etiquetas"

  // 1 · Validaciones sospechosamente rápidas (aviso: siempre primero). Primero un área con
  // circuito donde parte se valida sin extraer (práctica a revisar); si no, las que validan
  // casi todo sin circuito (urgencias, plantas: su tiempo no mide la extracción)
  const vr = validacionesRapidas(ds, r, f)
  // Por nº de validaciones rápidas (impacto), no por %: un área pequeña con 68 de 163 no
  // debe tapar a Extracciones con 2.137 de 14.300
  const porImpacto = (a: { rapidas: number }, b: { rapidas: number }) => b.rapidas - a.rapidas
  const enAviso = vr.areas.filter(a => a.nivel === "aviso").sort(porImpacto)
  const sinCircuito = vr.areas.filter(a => a.nivel === "sinCircuito").sort(porImpacto)
  const tv0 = enAviso[0] ?? sinCircuito[0]
  if (tv0) {
    const otras = sinCircuito.filter(a => a !== tv0)
    out.push({
      id: "validaciones", tono: "aviso", icono: "aviso", peso: enAviso.length ? 100 : 90,
      cifra: `${fmtN(tv0.pct, 0)} %`,
      titulo: `${etiquetaArea(tv0.clave)} valida en menos de ${VALIDACION_RAPIDA.umbralMin} minuto`,
      texto: `${fmtN(Math.round(tv0.rapidas))} de ${fmtN(tv0.n)} peticiones se validan sin tiempo para extraer${tv0.nivel === "sinCircuito" ? ": aquí el tiempo no mide la extracción" : ", sin ver al paciente"}.${otras.length ? ` ${otras.length === 1 ? `${etiquetaArea(otras[0].clave)} valida` : `Otras ${otras.length} áreas validan`} casi todo sin circuito.` : ""}`,
      ir: { tab: "tiempos", areas: [tv0.clave] },
    })
  }

  // 2 · Hora punta de un día laborable
  const ranking = rankingAreas(ds, r, f).map(x => x.area)
  const reloj = relojDia(ds, r, f, { tipo: "laborable" }, ranking)
  if (reloj.dias >= 3 && reloj.ventanaPico && reloj.total > 0) {
    const h = reloj.ventanaPico.desde
    out.push({
      id: "hora-punta", tono: "neutro", icono: "reloj", peso: 80,
      cifra: `${fmtN(reloj.ventanaPico.pct, 0)} %`,
      titulo: `Entre las ${h}:00 y las ${h + 2}:00`,
      texto: `se imprime el ${fmtN(reloj.ventanaPico.pct, 0)} % de los tubos y etiquetas de un día laborable. A las ${fmtHora(reloj.mitadA)} ya está hecha la mitad del trabajo del día.`,
      ir: { tab: "consumo" },
    })
  }

  // 3 · Tiempo de extracción en las áreas de Extracciones
  const extr = ds.areas.filter(a => grupoArea(a) === "Extracciones" && okArea(a, f))
  if (extr.length) {
    const fe = { ...f, areas: extr }
    const st = tiemposPorTramo(ds, r, fe).find(t => t.clave === "EXTRACCION")
    if (st && st.n >= H.minTiempos && st.p50 !== null) {
      const v = validacionesRapidas(ds, r, fe).total
      const sinRapidas = esSospechosa(v) && v.p50SinRapidas !== null ? ` Sin las validadas en < ${VALIDACION_RAPIDA.umbralMin} min (${fmtN(v.pct, 1)} %), la mitad tarda menos de ${fmtMin(v.p50SinRapidas)}.` : ""
      out.push({
        id: "extraccion", tono: "neutro", icono: "tiempo", peso: 62,
        cifra: fmtMin(st.p50),
        titulo: extr.length === 1 ? `Extracción en ${etiquetaArea(extr[0])}` : "Extracción en las áreas de extracciones",
        texto: `la mitad de las peticiones se extrae en menos de ${fmtMin(st.p50)}; 9 de cada 10, en menos de ${fmtMin(st.p90)}.${sinRapidas}`,
        ir: { tab: "tiempos", areas: extr },
      })
    }
  }

  // 4 · Día de la semana que se sale de lo normal (frente a la media de lunes a viernes)
  const porDow = porDiaSemana(ds, r, f, conPet ? "peticiones" : "unidades")
  const nDow = new Array(7).fill(0)
  for (const d of ds.dias) if (enRango(d, r)) nDow[diaSemana(d)]++
  if (nDow.slice(0, 5).every(n => n >= 2)) {
    const media = porDow.slice(0, 5).reduce((s, v) => s + v, 0) / 5
    if (media > 0) {
      let mejor = -1, dev = 0
      for (let i = 0; i < 5; i++) { const x = ((porDow[i] - media) / media) * 100; if (Math.abs(x) > Math.abs(dev)) { dev = x; mejor = i } }
      if (mejor >= 0 && Math.abs(dev) >= H.minDiaSemana) {
        out.push({
          id: "dia-semana", tono: "neutro", icono: "calendario", peso: 60 + Math.min(20, Math.abs(dev) / 2),
          cifra: signo(dev),
          titulo: `Los ${DOW_PLURAL[mejor]}, ${dev > 0 ? "más" : "menos"} ${nombre}`,
          texto: `${fmtN(porDow[mejor], 0)} de media, frente a ${fmtN(media, 0)} de un día laborable normal.`,
          ir: { tab: "consumo" },
        })
      }
    }
  }

  // 5 · Tendencia de volumen frente al periodo anterior (sin juicio de valor)
  const t = tendencias(ds, r, f)
  const tv = conPet ? t.peticiones : t.unidades
  if (tv !== null && Math.abs(tv) >= H.minTendencia) {
    out.push({
      id: "tendencia", tono: "neutro", icono: "tendencia", peso: 55 + Math.min(25, Math.abs(tv)),
      cifra: signo(tv, 1),
      titulo: `${tv > 0 ? "Más" : "Menos"} ${nombre} al día`,
      texto: `que en el periodo anterior (${fmtDia(t.cmp.anterior.desde)} – ${fmtDia(t.cmp.anterior.hasta)}), con los mismos filtros y comparando por día con datos.`,
      ir: { tab: "resumen" },
    })
  }

  // 6 · Día récord del periodo frente a su día de la semana
  const porDia = new Map<string, number>()
  for (const a of ds.actividad) {
    if (!enRango(a.d, r) || !okArea(a.area, f)) continue
    porDia.set(a.d, (porDia.get(a.d) ?? 0) + (conPet ? a.ordenes ?? 0 : a.unidades))
  }
  if (porDia.size >= H.minDiasRecord) {
    let dMax = "", vMax = 0
    for (const [d, v] of porDia) if (v > vMax) { vMax = v; dMax = d }
    const dow = diaSemana(dMax)
    const otros = [...porDia.entries()].filter(([d]) => d !== dMax && diaSemana(d) === dow).map(([, v]) => v)
    const media = otros.length >= 2 ? otros.reduce((s, v) => s + v, 0) / otros.length : 0
    const dev = media ? ((vMax - media) / media) * 100 : 0
    if (dev >= H.minRecord) {
      out.push({
        id: "record", tono: "neutro", icono: "calendario", peso: 50,
        cifra: fmtN(vMax),
        titulo: `${mayuscula(fmtDia(dMax, { weekday: "long", day: "numeric", month: "long" }))}, el día con más ${nombre}`,
        texto: `un ${fmtN(dev, 0)} % más que un ${DOW_SING[dow]} normal del periodo.`,
        ir: { dia: dMax },
      })
    }
  }

  // 7 · Área que concentra la actividad (solo con varias áreas en juego)
  if (f.areas.length !== 1) {
    const rk = rankingAreas(ds, r, f)
    const tot = rk.reduce((s, x) => s + x.v, 0)
    const top = rk[0]
    if (top && tot && rk.length > 1 && (top.v / tot) * 100 >= H.minConcentra) {
      out.push({
        id: "area", tono: "neutro", icono: "area", peso: 35,
        cifra: `${fmtN((top.v / tot) * 100, 0)} %`,
        titulo: `${etiquetaArea(top.area)} concentra la actividad`,
        texto: `de las ${nombre} del periodo, entre ${rk.length} work areas.`,
        ir: { tab: "consumo" },
      })
    }
  }

  // 8 · Pruebas: la más pedida, las que más cambian, pruebas por petición
  if (dp) {
    const rkP = rankingPruebas(dp, r, f)
    const top = rkP[0]
    if (top && top.pct !== null) {
      out.push({
        id: "prueba-top", tono: "neutro", icono: "prueba", peso: 58,
        cifra: `${fmtN(top.pct, 0)} %`,
        titulo: `${top.prueba}, la prueba más pedida`,
        texto: `va en ${deCadaDiez(top.pct)} de las peticiones con pruebas (${fmtN(top.n)} peticiones).`,
        ir: { tab: "pruebas", prueba: top.prueba },
      })
    }
    // Volumen suficiente en LOS DOS periodos: una prueba nueva o renombrada en el catálogo
    // (p. ej. un código nuevo de troponina) daría «+4.600 %», que no es un cambio de demanda
    // Más de maxCambioPrueba suele ser un cambio de código en el catálogo, no de demanda
    const comparables = rkP.filter(x => x.delta !== null && Math.abs(x.delta) <= H.maxCambioPrueba && x.n >= H.minVolumenCambio && x.n / (1 + x.delta / 100) >= H.minVolumenCambio)
    const { suben, bajan } = cambiosPruebas(comparables, 1)
    for (const it of [suben[0], bajan[0]]) {
      if (!it || it.delta === null || Math.abs(it.delta) < H.minCambioPrueba) continue
      out.push({
        id: `prueba-${it.delta > 0 ? "sube" : "baja"}`, tono: "neutro", icono: "tendencia", peso: 52 + Math.min(20, Math.abs(it.delta) / 3),
        cifra: signo(it.delta),
        titulo: `${it.prueba} se pide ${it.delta > 0 ? "más" : "menos"}`,
        texto: `por día con datos, frente al periodo anterior (${fmtN(it.n)} peticiones en este periodo).`,
        ir: { tab: "pruebas", prueba: it.prueba },
      })
    }
    const kp = kpisPruebas(dp, r, f)
    if (kp.porPeticion !== null) {
      out.push({
        id: "por-peticion", tono: "neutro", icono: "prueba", peso: 30,
        cifra: fmtN(kp.porPeticion, 1),
        titulo: "pruebas por petición",
        texto: `${fmtN(kp.solicitadas)} pruebas en ${fmtN(kp.peticiones)} peticiones; ${fmtN(kp.distintas)} pruebas distintas.`,
        ir: { tab: "pruebas" },
      })
    }
  }

  // 9 · Pruebas que se piden juntas
  if (juntas && juntas.afines.length) {
    // La pareja más «de panel»: inseparable en los dos sentidos, frecuente y mucho más de lo
    // esperado (lift ≥ minLiftPareja: colesterol + triglicéridos, que van en casi todas, no sorprende)
    const fuerza = (p: { pctAB: number; pctBA: number; n: number; lift: number }) => Math.min(p.pctAB, p.pctBA) * Math.log(p.n) * Math.log(p.lift)
    const panel = juntas.afines.filter(p => p.n >= H.minPareja && p.lift >= H.minLiftPareja).sort((x, y) => fuerza(y) - fuerza(x))[0]
    if (panel) {
      out.push({
        id: "juntas", tono: "neutro", icono: "juntas", peso: 66,
        cifra: `${fmtN(panel.pctAB, 0)} %`,
        titulo: `${panel.a} y ${panel.b} van juntas`,
        texto: `el ${fmtN(panel.pctAB, 0)} % de las peticiones con ${panel.a} incluye también ${panel.b}: ${fmtN(panel.lift, 0)} veces más de lo esperado si se pidieran por separado.`,
        ir: { tab: "pruebas", prueba: panel.a },
      })
    }
  }

  // 10 · Eventos de calidad: el tipo que más pesa
  const k = kpis(ds, r, f)
  if (k.eventos > 0 && k.tasaEventos !== null) {
    const tipos = eventosPor(ds, r, f, "tipo")
    const top = tipos[0]
    if (top) {
      out.push({
        id: "calidad", tono: "neutro", icono: "calidad", peso: 40,
        cifra: fmtN(k.tasaEventos, 1),
        titulo: "eventos de calidad por cada 1.000 tubos",
        texto: `${EVENTO_LABEL[top.clave as keyof typeof EVENTO_LABEL] ?? top.clave}: el ${fmtN((top.cantidad / k.eventos) * 100, 0)} % de los ${fmtN(k.eventos)} eventos del periodo.`,
        ir: { tab: "calidad" },
      })
    }
  }

  return out.sort((a, b) => b.peso - a.peso).slice(0, max)
}
