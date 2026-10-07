/**
 * Recorte en cliente de un Dataset ya decodificado (cliente, puro).
 *
 * El dashboard pide UNA vez toda la cobertura del hospital (`/api/inlab/datos` sin rango) y
 * deriva de ahí cada periodo. `recortar(ds, ventana)` devuelve exactamente el Dataset que
 * habría producido el servidor para esa ventana: mismas filas, mismos `dias` y los mismos
 * `areas`/`consumibles` (que dependen de la ventana: alimentan el selector de áreas y el
 * color de cada consumible). Por eso no basta con pasar el rango a las vistas: hay que recortar.
 */
import { periodoAnterior, type Dataset, type Rango } from "./analytics"

/**
 * Ventana de datos que necesita un rango: el propio rango + el periodo anterior de la misma
 * duración (tendencias), sin salirse de la cobertura. Es la misma que pedía antes el cliente.
 */
export function ventanaDatos(rango: Rango, cobertura: Rango): Rango {
  const prev = periodoAnterior(rango)
  return { desde: prev.desde < cobertura.desde ? cobertura.desde : prev.desde, hasta: rango.hasta }
}

const unicosOrdenados = (vals: Iterable<string>) => [...new Set(vals)].sort((a, b) => a.localeCompare(b, "es"))

export function recortar(ds: Dataset, v: Rango): Dataset {
  const n = ds.dias.length
  // Toda la cobertura dentro de la ventana: el Dataset ya es el de esa ventana
  if (n === 0 || (ds.dias[0] >= v.desde && ds.dias[n - 1] <= v.hasta)) return ds
  const en = (x: { d: string }) => x.d >= v.desde && x.d <= v.hasta
  const actividad = ds.actividad.filter(en)
  const consumo = ds.consumo.filter(en)
  return {
    dias: ds.dias.filter(d => d >= v.desde && d <= v.hasta),
    consumo,
    puestos: ds.puestos.filter(en),
    actividad,
    tiempos: ds.tiempos.filter(en),
    eventos: ds.eventos.filter(en),
    areas: unicosOrdenados(actividad.map(a => a.area)),
    consumibles: unicosOrdenados(consumo.map(c => c.consumible)),
  }
}
