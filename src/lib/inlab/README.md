# Inteligencia InLab — módulo de cargas y analítica

Convierte exportaciones CSV de la base de datos MySQL de InLab (una por hospital)
en agregados diarios que alimentan `/inlab`, el informe público `/share/inlab/[token]`
y la facturación por tarifas.

## Principio: los datos crudos no salen del navegador

```
CSV (cientos de MB, puede contener datos de pacientes)
  │  navegador · Web Worker (inlab.worker.ts → process.ts)
  │    csv.ts       lectura por trozos, delimitador/codificación
  │    sha256.ts    hash incremental del fichero (detecta recargas)
  │    mapping.ts   columnas → campos canónicos, normalización de valores
  │    aggregate.ts suma por día × área × … ; descarta la fila al momento
  ▼
InlabPayload (types.ts) — solo totales diarios, diccionarios de texto corto
  │  POST /api/inlab/cargas/check  (hash + días → duplicado / solapes)
  │  POST /api/inlab/cargas        (Zod + índices + IDOR zona + transacción)
  ▼
PostgreSQL: inlab_cargas + inlab_{consumo,puesto,actividad,tiempo,evento}_diario
  │  GET /api/inlab/datos  → mismo formato compacto
  ▼
analytics.ts (cliente) → components/inlab/Vistas.tsx
```

Los nº de orden solo se usan en memoria para contar órdenes distintas. El
detalle de evento solo se envía si es un código corto (≤40 caracteres, sin
secuencias de 4+ dígitos ni «@»). Si una dimensión (área, puesto, consumible,
impresora) supera `MAX_DISTINTOS` valores, el asistente **bloquea** la carga:
suele indicar que se ha emparejado una columna de texto libre o con nombres.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `mapping.ts` | **Punto de adaptación al fichero real**: campos canónicos, alias de cabecera, clasificación de eventos, urgencia |
| `csv.ts` | Detección de codificación/delimitador, parser incremental RFC 4180, previsualización |
| `dates.ts` | Parseo de fechas (ISO rápido, DMY/MDY), utilidades de días `YYYY-MM-DD` |
| `aggregate.ts` | `InlabAggregator`: fila → acumuladores; `build()` → `InlabPayload` + avisos |
| `histogram.ts` | Buckets fijos de minutos para percentiles combinables (¡no cambiar sin migrar!) |
| `process.ts` / `inlab.worker.ts` | Streaming del `File` + hash + parseo (Worker con respaldo en hilo principal) |
| `types.ts` | Formato compacto `InlabPayload` y límites compartidos |
| `schemas.ts` | Zod (re-exportado en `@/lib/schemas`) + validación de índices |
| `access.ts` / `roles.ts` | Roles y acceso por zona (IDOR) |
| `persist.ts` | Inserción transaccional, sustituir/omitir días solapados |
| `queries.ts` | Reconstrucción del payload, cobertura y benchmark |
| `analytics.ts` | KPIs, series, desgloses, previsión, facturación (puro, cliente) |

Ejemplo sintético y generador: `docs/inlab/ejemplo-inlab-sintetico.csv`,
`docs/inlab/generar-csv-sintetico.mjs` (sirve también para pruebas de rendimiento:
~226 MB / 1,5 M filas se procesan en ~9 s en Node).

## Cuando llegue el CSV real — checklist

1. **Cargarlo en el asistente** (`/inlab` → «Cargar fichero») y mirar qué columnas
   autodetecta. No hace falta tocar código para un emparejamiento puntual: se
   empareja a mano y se guarda por hospital.
2. **Alias de cabecera** — añadir los nombres reales a `ALIAS_CABECERA` en
   `mapping.ts` para que la autodetección funcione en todos los hospitales.
3. **Valores de evento** — revisar la vista «Incidencias & calidad» → «Código
   original del evento»; ajustar `EVENTO_NEUTRO` (valores que significan "fila
   normal") y `ALIAS_EVENTO` (patrones → categoría). Si los eventos vienen en otra
   tabla/fichero distinto, ver pregunta abierta abajo.
4. **Urgencia** — ajustar `esUrgente()` (p. ej. si la urgencia se deduce del rango
   de numeración de etiqueta en vez de una columna).
5. **Granularidad de fila** — el agregador asume *una fila = un recipiente o
   etiqueta*, con `cantidad` opcional. Si la exportación es una fila por orden con
   N tubos en columnas, o una fila por prueba, hay que adaptar `InlabAggregator.add`.
6. **Fechas** — si la fecha y la hora vienen en columnas separadas, añadir campos
   `hora*` en `CAMPOS` y combinarlos en `aggregate.ts` (`fecha()`).
7. **Fecha de referencia del día** — `PRIORIDAD_FECHA_REFERENCIA` (hoy:
   extracción > petición > recepción > validación).
8. Regenerar el ejemplo sintético con las columnas reales (sin datos reales) y
   actualizar este README.

Si se añaden campos nuevos al payload: subir `v` en `InlabPayload`, ampliar
`InlabPayloadSchema`, `validarIndicesPayload`, `persist.ts`, `queries.ts` y el
modelo Prisma (con default/nullable para que `prisma db push` no falle).

## Preguntas abiertas (dependen del fichero real)

- ¿Qué representa cada fila (recipiente, etiqueta, orden, prueba)? ¿Hay columna de cantidad?
- ¿Qué hitos de tiempo existen y en qué zona horaria se exportan?
- ¿Los eventos (reimpresión, rechazo, anulación, error de impresora) vienen en la misma
  tabla o en un log aparte? ¿Con qué códigos?
- ¿Cómo se identifica la urgencia (columna, rango de numeración, área)?
- ¿Cómo se nombran áreas y puestos (¿coinciden con el InLab Map del hospital?)?
- ¿El consumible es el tipo de tubo, el contenedor, la etiqueta, o una referencia Palex
  (SKU)? Para facturación interesa la unidad de venta.
- ¿Las exportaciones son incrementales (por periodo) o completas? ¿Empiezan/terminan a medianoche?
- Volumen típico (filas/año) para validar límites (`LIMITES`, 25 MB de agregados).
