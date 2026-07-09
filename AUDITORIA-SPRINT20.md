# Auditoria profunda — Sprint 20 (2026-07-09)

> Generada por 3 auditorias paralelas (seguridad API, logica de negocio/Prisma, UX/consistencia frontend)
> sobre el commit `4274165a`. Ver `AGENTS.md` seccion 8 (Deuda tecnica) para el resumen priorizado.
> Items marcados [FIX-APLICADO] se corrigieron en el mismo sprint. El resto queda documentado para decidir cuando abordarlo.

## Seguridad API

1. **[ALTA] [FIX-APLICADO]** `incidencias/[id]/relaciones` (GET+POST) sin filtro de zona — un usuario no-ADMIN puede leer/vincular incidencias de otras zonas. Corregido con el mismo patron de zona que el resto de endpoints de incidencias.
2. **[ALTA] [FIX-APLICADO]** `hospitales/[id]/score` y `hospitales/score?ids=` sin filtro de zona — fuga de score/breakdown de hospitales ajenos, batch de hasta 50 ids facilita exfiltracion. Corregido.
3. **[MEDIA] [FIX-APLICADO]** `schemas.ts` — `fotos` en eventos de incidencia limita cantidad (max 5) pero no tamano de cada string base64. Anadido `.max(2_000_000)` por elemento.
4. **[MEDIA] [FIX-APLICADO]** `rate-limit.ts` — `checkRateLimit`/`checkRateLimitByKey` nunca llamaban a Redis, solo a memoria. Convertidas a `async`, usan `redisIncrement` (Redis si `getRedis()` esta disponible, fallback in-memory si no) como camino por defecto. Actualizados los ~150 call-sites en 85 ficheros de `src/app/api` + `src/lib/auth.ts` con `await`. Eliminada `checkRateLimitByKeyAsync` (quedaba muerta, ya no hace falta con `checkRateLimitByKey` async).
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
7. **[BAJA] [FIX-APLICADO]** `Incidencia.hospital` y `RegistroLlamada.hospital` no declaraban `onDelete` explicito. Anadido `onDelete: Restrict` explicito (mismo comportamiento que el default de Prisma para relaciones requeridas — sin cambio funcional, solo sigue la convencion del proyecto). `prisma validate` + `prisma generate` verificados; se aplicara a la DB en el proximo `db push` de Railway (START), no hace falta accion manual.

**Confirmado sin bugs:** ningun `orderBy` directo sobre enum en todo `src`; transiciones de pausa SLA logicamente correctas (solo falta atomicidad); checkin/checkin[id] correctos e idempotentes.

## UX / consistencia frontend

1. **[MEDIA] [FIX-APLICADO]** `PageHeader.tsx` solo se usaba en 11 de ~30 paginas. Migradas: `admin/configuracion`, `admin/hardware`, `admin/hospitales`, `admin/usuarios`, `admin/zonas`, `admin/modulos-inlab`, `hardware`, `datos`, `proyectos`, `recordatorios`, `transporte`, `comparador`. `PageHeader` ampliado con `icon`/`iconColor` opcionales para no perder los badges de icono que ya tenian algunas paginas (ej. zonas, recordatorios). Excepciones deliberadas (no forzadas a PageHeader): `mapa` y `incidencias/stats` usan una barra de herramientas compacta a pantalla completa (mismo patron que el modo presentacion, necesitan el espacio vertical); `perfil` es una tarjeta de identidad, no un listado; paginas `[id]` de detalle tienen cabeceras propias con navegacion/breadcrumb que no encajan en el componente generico; `ventas/pipeline` es el modulo CRM desactivado, no se invirtio tiempo de diseno ahi.
2. **[BAJA] [FIX-APLICADO]** `comparador/page.tsx` usaba estilo inline en vez de Tailwind+dark. Migrado a `PageHeader`.
3. **[BAJA] [FIX-APLICADO]** `admin/modulos-inlab/page.tsx` mostraba "Cargando..." en texto plano. Ahora usa `SkeletonRow`.
4. **[MEDIA] [FIX-APLICADO]** Colores de marca hardcodeados fuera de `brand.ts`: `TabResumen.tsx` (plantilla PDF, ~17 ocurrencias), 11 ficheros `*/error.tsx`, `admin/zonas/page.tsx`. Todos ahora importan `TEAL`/`ORANGE`/`TEAL_DARK` de `brand.ts`.
5. **[BAJA] [FIX-APLICADO]** Mapeo tipo→color duplicado entre `CommandPalette.tsx` y `TopBar.tsx`. Consolidado en `TIPO_RESULTADO_COLOR` (`lib/brand.ts`).
6. **[ALTA — riesgo real de perdida de datos] [FIX-APLICADO]** Confirmacion de borrado inconsistente en `TabAdjuntos.tsx`, `TabContactos.tsx`, `TabTareas.tsx` y `TabTimeline.tsx`. Anadido `confirm()` en las 5 acciones de borrado/desvinculacion.

**Sin hallazgos:** no hay emojis en JSX, no hay `<img>` sin alt, no hay rutas rotas, botones solo-icono tienen aria-label.

## Prioridad de ejecucion aplicada este sprint
Alto impacto + bajo riesgo → corregido en este mismo sprint (13 de 16 hallazgos, ver `git diff`). `npx tsc --noEmit` y `npx next build` verificados sin errores tras cada tanda de cambios. Quedan pendientes, documentados arriba con **[PENDIENTE]**, los 3 de mayor superficie o que tocan schema: migracion real a Redis en rate-limit, unificacion de `PageHeader` en el resto de paginas, y `onDelete` explicito en `Incidencia.hospital`/`RegistroLlamada.hospital`.
