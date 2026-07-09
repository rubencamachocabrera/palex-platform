# Auditoria profunda — Sprint 20 (2026-07-09)

> Generada por 3 auditorias paralelas (seguridad API, logica de negocio/Prisma, UX/consistencia frontend)
> sobre el commit `4274165a`. Ver `AGENTS.md` seccion 8 (Deuda tecnica) para el resumen priorizado.
> Items marcados [FIX-APLICADO] se corrigieron en el mismo sprint. El resto queda documentado para decidir cuando abordarlo.

## Seguridad API

1. **[ALTA] [FIX-APLICADO]** `incidencias/[id]/relaciones` (GET+POST) sin filtro de zona — un usuario no-ADMIN puede leer/vincular incidencias de otras zonas. Corregido con el mismo patron de zona que el resto de endpoints de incidencias.
2. **[ALTA] [FIX-APLICADO]** `hospitales/[id]/score` y `hospitales/score?ids=` sin filtro de zona — fuga de score/breakdown de hospitales ajenos, batch de hasta 50 ids facilita exfiltracion. Corregido.
3. **[MEDIA] [FIX-APLICADO]** `schemas.ts` — `fotos` en eventos de incidencia limita cantidad (max 5) pero no tamano de cada string base64. Anadido `.max(2_000_000)` por elemento.
4. **[MEDIA] [PENDIENTE]** `rate-limit.ts` — `checkRateLimit`/`checkRateLimitByKey` (usadas en TODA la API y en brute-force de login) nunca llaman a Redis, solo a memoria; la variante Redis (`checkRateLimitByKeyAsync`) existe pero no se usa en ningun sitio. Documentacion dice "Redis con fallback" pero en la practica es memoria pura. **No corregido este sprint** — requiere convertir `checkRateLimit`/`checkRateLimitByKey` a async y tocar el call-site de cada ruta (~84 ficheros) o el wrapper comun; se recomienda abordarlo como sprint dedicado.
5. **[BAJA] [FIX-APLICADO]** `oportunidades/[id]` sin `checkRateLimit` en ningun metodo. Anadido en GET/PATCH/DELETE.
6. **[BAJA] [FIX-APLICADO]** `recordatorios` POST valida a mano en vez de usar `parseBody()`/Zod. Conectado al schema `RecordatorioCreate` ya existente.

**Sin hallazgos:** middleware cubre todas las rutas requeridas; `$queryRaw` parametrizado; `/share/hardware/[id]` con IDs no enumerables; `hospitales/[id]` PATCH con whitelist correcta.

## Logica de negocio / Prisma

1. **[ALTA] [FIX-APLICADO]** `incidencias/stats` parsea `desde`/`hasta` como fecha pelada (medianoche UTC) en vez del patron `+"T00:00:00"`/`+"T23:59:59"` que usa `incidencias/route.ts`. Alineado.
2. **[ALTA] [FIX-APLICADO]** `DELETE /api/usuarios/[id]` — relaciones requeridas de `Usuario` sin `onDelete`, Prisma aplica `Restrict`. Borrar un usuario con actividad lanzaba `P2003` no capturado → 500 generico. Ahora devuelve 409 con mensaje claro ("desactivalo en su lugar").
3. **[MEDIA] [FIX-APLICADO]** `proyectos/[id]/aplicar-plantilla` creaba fases+tareas+hitos sin `$transaction`. Envuelto en `db.$transaction`.
4. **[MEDIA] [FIX-APLICADO]** Race condition en `incidencias/[id]/relaciones` POST. Check de duplicado + create envueltos en `$transaction` con `isolationLevel: Serializable`.
5. **[MEDIA] [FIX-APLICADO]** Lost update en pausas de SLA: `incidencias/[id]` PATCH. Lectura + calculo + update envueltos en `$transaction` Serializable.
6. **[BAJA] [FIX-APLICADO]** `generarCodigo()` en incidencias — el fallback ahora reintenta con timestamp+sufijo y comprueba unicidad, con un ultimo fallback a UUID corto garantizado unico.
7. **[BAJA] [PENDIENTE]** `Incidencia.hospital` y `RegistroLlamada.hospital` no declaran `onDelete` explicito. Inofensivo hoy (no existe DELETE de hospital) pero rompe la convencion. **No corregido este sprint** — es un cambio de `schema.prisma` que requiere `prisma db push`; se deja para revisar junto con otros cambios de schema en vez de aislado.

**Confirmado sin bugs:** ningun `orderBy` directo sobre enum en todo `src`; transiciones de pausa SLA logicamente correctas (solo falta atomicidad); checkin/checkin[id] correctos e idempotentes.

## UX / consistencia frontend

1. **[MEDIA] [PENDIENTE]** `PageHeader.tsx` solo se usa en 11 de ~30 paginas; el resto define su propio `<h1>` con tamanos distintos (`hardware`, `admin/zonas`, `mapa` entre otros). **No corregido este sprint** salvo `comparador` (ver item 2) — migrar el resto es un pase de diseno de mayor superficie, mejor abordarlo con la skill de UI/UX en una pasada dedicada.
2. **[BAJA] [FIX-APLICADO]** `comparador/page.tsx` usaba estilo inline en vez de Tailwind+dark. Migrado a `PageHeader`.
3. **[BAJA] [FIX-APLICADO]** `admin/modulos-inlab/page.tsx` mostraba "Cargando..." en texto plano. Ahora usa `SkeletonRow`.
4. **[MEDIA] [FIX-APLICADO]** Colores de marca hardcodeados fuera de `brand.ts`: `TabResumen.tsx` (plantilla PDF, ~17 ocurrencias), 11 ficheros `*/error.tsx`, `admin/zonas/page.tsx`. Todos ahora importan `TEAL`/`ORANGE`/`TEAL_DARK` de `brand.ts`.
5. **[BAJA] [FIX-APLICADO]** Mapeo tipo→color duplicado entre `CommandPalette.tsx` y `TopBar.tsx`. Consolidado en `TIPO_RESULTADO_COLOR` (`lib/brand.ts`).
6. **[ALTA — riesgo real de perdida de datos] [FIX-APLICADO]** Confirmacion de borrado inconsistente en `TabAdjuntos.tsx`, `TabContactos.tsx`, `TabTareas.tsx` y `TabTimeline.tsx`. Anadido `confirm()` en las 5 acciones de borrado/desvinculacion.

**Sin hallazgos:** no hay emojis en JSX, no hay `<img>` sin alt, no hay rutas rotas, botones solo-icono tienen aria-label.

## Prioridad de ejecucion aplicada este sprint
Alto impacto + bajo riesgo → corregido en este mismo sprint (13 de 16 hallazgos, ver `git diff`). `npx tsc --noEmit` y `npx next build` verificados sin errores tras cada tanda de cambios. Quedan pendientes, documentados arriba con **[PENDIENTE]**, los 3 de mayor superficie o que tocan schema: migracion real a Redis en rate-limit, unificacion de `PageHeader` en el resto de paginas, y `onDelete` explicito en `Incidencia.hospital`/`RegistroLlamada.hospital`.
