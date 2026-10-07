<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Plataforma de gestion de proyectos hospitalarios — Guia del Proyecto

> Fuente de verdad para cada sesion de desarrollo.
> Ultima actualizacion: 2026-10-07 (Sprint 24c — QA del diseño Nexus: navegacion/SW, capas, a11y, rendimiento).
> Historial de sprints completados: `AGENTS-ARCHIVE.md` (no importar como contexto).

---

## 1. Stack tecnico (NO cambiar sin justificacion)

| Capa        | Tecnologia                                              |
|-------------|----------------------------------------------------------|
| Framework   | Next.js 14+ App Router, TypeScript estricto              |
| UI          | Tailwind CSS v4 + componentes propios (NO shadcn)        |
| DB          | PostgreSQL via Railway                                    |
| ORM         | Prisma 7 con `@prisma/adapter-pg`                        |
| Auth        | NextAuth.js v5 — `auth.config.ts` (Edge) + `auth.ts` (server) |
| Cache       | Upstash Redis (fallback in-memory si no hay env vars)    |
| Deploy      | Railway (auto-deploy desde `git push origin main`)       |
| Offline     | IndexedDB + Service Worker (PWA)                          |
| Errors      | Sentry (client/server/edge + global-error boundary)      |
| URL prod    | https://palex-platform-production.up.railway.app          |
| Repo        | github.com/rubencamachocabrera/palex-platform             |

---

## 2. Reglas criticas — romper esto causa bugs en produccion

### Prisma 7
- NO usar `url` en bloque `datasource` (usa adapter-pg, la URL va en env)
- Importar SIEMPRE desde `@/lib/db.ts`
- Schema changes: `npx prisma db push` (nunca `migrate` en prod sin revisar)
- Config real en `prisma.config.ts` (raiz)
- Railway ejecuta `prisma db push --accept-data-loss` en START (no en build)
- `--accept-data-loss` solo cubre DROP columnas, NO anadir NOT NULL sin default
- NUNCA nombrar relacion igual que columna DB → usar `@map("nombre_diferente")`
- `orderBy` sobre relacion: `{ tipo: { nombre: "asc" } }` NO `{ tipo: "asc" }`
- `orderBy` sobre campo enum: Prisma ordena ALFABETICAMENTE, no por orden semantico — NO usar para prioridad/estado
- `npx prisma generate` despues de cualquier cambio en schema.prisma
- Modelo `Proyecto` usa `@@map("pre_proyectos")` — tabla DB sigue siendo `pre_proyectos`
- FK `proyectoId` usa `@map("preProyectoId")` en modelos relacionados
- Acceso: `db.proyecto.findMany(...)` (NO `db.preProyecto`)

### NextAuth v5
- `auth()` solo en servidor / server components / API routes
- NUNCA `useSession` — eliminado de toda la app
- Obtener rol en cliente: `usePerfil()` hook (SWR) o `fetch("/api/perfil")` → `d?.rol` (NO `d?.role`)
- Variables env: `AUTH_SECRET`, `AUTH_URL`
- JWT maxAge 7 dias, check usuario.activo cada 5 min (cache in-memory)
- Desactivar usuario = pierde acceso en <5 min; cambio de rol efectivo sin re-login

### URL routing
- Route group `(dashboard)` NO aparece en la URL
- Rutas: `/dashboard`, `/hospitales`, `/visitas`, `/ventas/pipeline`, `/proyectos`, `/hardware`, `/incidencias`, `/mapa`, `/datos`, `/inlab`, `/admin`, `/perfil`, `/llamadas`, `/recordatorios`, `/notas`, `/actividad`
- Ruta especial: `/proyectos/[id]/presentacion` — full-screen, sale de la layout normal
- NO usar `/dashboard/hospitales`, `/dashboard/visitas`, etc.
- NO existe `/pre-proyectos` — todo unificado en `/proyectos`

### Roles
- `ADMIN`: acceso total
- `VENTAS`: dashboard, hospitales, pipeline CRM (DESACTIVADO)
- `PROYECTOS`: dashboard, hospitales, visitas, calendario, proyectos
- `TECNICO`: igual que PROYECTOS

---

## 3. Modulos desactivados

### CRM / Pipeline comercial
100% desactivado. No mostrar selectores de oportunidad, no vincular visitas a oportunidades.

### Plantillas de visita
Existe sistema de plantillas para pre-rellenar visitas. NO implementar "duplicar visita".

### Incidencias / Helpdesk — seccion "Soporte"
Activable/desactivable desde admin/configuracion (toggle "Soporte (Incidencias)", `ConfigApp.incidenciasActivo`).
Desactivado: Sidebar oculta el grupo "Soporte" (cache `palex_incidencias_activo`), `/incidencias/**` muestra "Seccion desactivada por el administrador" (`incidencias/layout.tsx`), no se renderiza `SlaAlertasWidget`, el FAB oculta "Nueva incidencia", `/api/notificaciones` omite los avisos de incidencias, el cron de escalado no actua, y `POST /api/incidencias` + `GET /api/incidencias/stats` devuelven 403. El resto de GET de incidencias sigue respondiendo (share de hardware, etc.). Los datos persisten.

### Analitica — seccion "Analitica"
Activable/desactivable desde admin/configuracion (toggle "Analitica (Inteligencia InLab y Comparador)", `ConfigApp.analiticaActivo`).
Desactivado: Sidebar oculta `/inlab` y `/comparador` (flag `analiticaOnly` en grupo para PROYECTOS/TECNICO/VENTAS y en item para ADMIN, cuyo grupo conserva "Transporte de muestras"; cache `palex_analitica_activo`), `/inlab` y `/comparador` muestran "Seccion desactivada" (layouts), y `GET /api/stats/comparador` devuelve 403. `/inlab` usa datos estaticos (sin API propia); `/api/modulos-inlab` NO se bloquea (lo usan proyectos y admin). Los datos persisten.

Helpers: `lib/config-app.ts` (`getConfigApp()`, `seccionActiva()`, `guardSeccion()` → 403), `hooks/useConfigApp.ts` (SWR cliente), `components/ui/SeccionDesactivada.tsx`. Al cambiar un toggle, admin/configuracion emite `palex:config-updated` y Sidebar/FAB se refrescan sin recargar.

---

## 4. Estructura de ficheros

```
src/
  app/
    (auth)/login/page.tsx               Login split-screen animado
    (dashboard)/
      layout.tsx                        Sidebar + TopBar + KeyboardShortcutsProvider + OnboardingWizard + BottomNav
      dashboard/page.tsx                Dashboard por rol + widget "Mi Dia" + acciones rapidas
      recordatorios/page.tsx            CRUD recordatorios personales
      hospitales/page.tsx               Lista + filtro zona + grid/list + favoritos
      hospitales/[id]/page.tsx          Detalle: KPIs, tabs Contactos/Visitas/Timeline, QR
      visitas/page.tsx                  Lista + busqueda + filtros + quick-create modal
      visitas/calendario/page.tsx       Calendario mensual, dots por estado
      visitas/[id]/page.tsx             Formulario 13 secciones, fotos, PDF, firma, offline
      ventas/pipeline/page.tsx          CRM pipeline (DESACTIVADO)
      proyectos/page.tsx                Lista proyectos + Kanban (KanbanView dynamic import)
      proyectos/KanbanView.tsx          Kanban DnD aislado — @dnd-kit, useDraggable/useDroppable
      proyectos/[id]/page.tsx           Header + tabs selector (300 lineas, code-split)
      proyectos/[id]/types.ts           Interfaces, constantes, helpers compartidos
      proyectos/[id]/tabs/              10 tabs con next/dynamic
      proyectos/[id]/presentacion/page.tsx  Modo presentacion full-screen (5 slides dark mode)
      hardware/page.tsx                 Tabs: Resumen/Inventario/Instalaciones/Catalogo/Alertas
      mapa/page.tsx                     Leaflet, coordenadas por ciudad
      datos/page.tsx                    KPIs explotacion (MOCKUP — sin API real)
      inlab/page.tsx                    Inteligencia InLab: selector hospital(es)+rango, 7 tabs, filtros por clic, + carga
      inlab/_components/                UploadWizard (asistente CSV→agregados), VistaCargas, VistaComparar, VistaFacturacion, ShareModal
      inlab/_demo/DemoGulla.tsx         Antigua página estática GULLA, ahora "Datos de demostración"
      admin/                            CRUD: usuarios, zonas, hospitales, hardware, tags
      admin/log/page.tsx                Log de actividad (solo ADMIN)
      admin/equipo/page.tsx             Panel equipo — workload por usuario (solo ADMIN)
      admin/carga-trabajo/page.tsx      Heatmap mensual visitas (solo ADMIN)
      incidencias/page.tsx              Helpdesk: lista + filtros + KPIs + crear modal + boton Metricas
      incidencias/[id]/page.tsx         Detalle incidencia + timeline eventos + SLA + panel relaciones
      incidencias/stats/page.tsx        Metricas rendimiento: KPIs, categorias, HW/SW, tabla tecnicos
      llamadas/page.tsx                 Registro de llamadas — CRUD, KPIs, filtros
      perfil/page.tsx                   Nombre + contrasena + notificaciones + sync calendario
    api/                                ~50 rutas con rate limiting + Zod validation
      search/route.ts                   Busqueda unificada. Cache 30s.
      hospitales/                       CRUD + contactos + timeline. Paginado (?limit=200&page=N)
      hospitales/score/route.ts         GET ?ids=id1,id2 — batch scores hasta 50 hospitales
      hospitales/[id]/score/route.ts    GET — score completo con breakdown por categoria
      visitas/                          CRUD + comentarios. GET sin `datos`, ?desde=&hasta=
      proyectos/                        CRUD + fases + tareas + hitos + entradas + solicitudes + contactos + adjuntos + comentarios + modulos + share + excel
      hardware/                         CRUD + tipos + unidades
      incidencias/                      CRUD + eventos + relaciones. Helpdesk HW/SW, SLA, timeline
      incidencias/stats/route.ts        GET stats por periodo — KPIs, categorias, SLA, tecnicos
      incidencias/[id]/relaciones/      GET/POST/DELETE vincular incidencias (DUPLICADA/RELACIONADA/CAUSA_RAIZ)
      llamadas/                         CRUD con IDOR zona
      tags/, recordatorios/, favoritos/, calendario/ical/, onboarding/, presence/, notificaciones/
      perfil/                           { rol, onboardingCompletado, calendarToken }
      inlab/                            hospitales, datos, benchmark, cargas(+check,[id]), mapeos/[hospitalId], tarifas, shares(+[id])
      share/inlab/[token]/              Informe InLab publico (sin auth)
    share/inlab/[token]/page.tsx        Informe InLab publico de solo lectura + imprimible
  components/
    InteractionLayer.tsx                Foco de luz bajo el cursor en tarjetas (escribe --mx/--my). Sin efecto en tactil/reduced-motion
    ActivityIndicator.tsx               Envuelve fetch a /api: linea de energia + topbar animada si una peticion tarda >150ms
    PageTransition.tsx                  Fade de pagina + barra de progreso de ruta
    QuickActionsFAB.tsx                 FAB contextual; acciones por evento via dispatchFabAction (ver hooks/useFabAction)
    SlaAlertasWidget.tsx                Widget dashboard: incidencias criticas/altas con SLA <24h, countdown 30s
    Sidebar.tsx                         Dark #0f172a, colapsable, nav por rol
    TopBar.tsx                          Busqueda global, dark/light toggle, notificaciones
    ThemeProvider.tsx                    dark/light, localStorage, anti-FOUC
    CommandPalette.tsx                   Cmd+K busqueda rapida
    ComentariosPanel.tsx                Comentarios con @menciones (dynamic import)
    MentionInput.tsx / MentionText.tsx  @menciones textarea + pills
    TagSelector.tsx                     Selector/pills de tags con colores
    BottomNav.tsx                       Nav movil 5 tabs (glass, safe area, TEAL)
    OnboardingWizard.tsx                8 pasos generales + 3 extra ADMIN, slide animations
    NotificationManager.tsx             Browser Notification API, polling 60s
    Toast.tsx                           Global toast provider (god node: 42 edges)
    ui/EmptyState.tsx, Icons.tsx, PageHeader.tsx (con LiveStamp), Skeleton.tsx (+ SkeletonHeader, NexusLoader)
    ui/BrandLockup.tsx                  Logotipo "Palex | InLab" y "P" colapsada (mask-image sobre /logo-palex.png)
    ui/LiveStamp.tsx, ui/CountUp.tsx    Sello fecha/hora en vivo; contador animado de cifras (KPIs)
    visitas/AnalisisPanel.tsx, PrintView.tsx, SignaturePad.tsx, VoiceNotes.tsx
  hooks/
    useKeyboardShortcuts.ts, useOfflineSync.ts, useFavoritos.ts, usePerfil.ts (SWR)
    useFabAction.ts                     Recibe acciones del FAB (eventos cancelables + accion pendiente para pestañas no montadas)
  lib/
    auth.config.ts (Edge) + auth.ts (server) — NextAuth
    brand.ts                            TEAL=#00A99D, ORANGE=#F7941D (SIEMPRE importar)
    db.ts                               Prisma singleton (SIEMPRE importar)
    schemas.ts                          Zod v4 schemas centralizados + parseBody()
    rate-limit.ts                       checkRateLimit() + Redis fallback
    presence.ts                         Presencia colaborativa async (Redis/in-memory)
    redis.ts                            Upstash Redis con fallback graceful
    form-schema.ts, img-compress.ts, offline-db.ts, log-actividad.ts
    calendar-token.ts, csv.ts, visita-analysis.ts
    hospital-score.ts                   computeHospitalScore(hospitalId) — 0-100, breakdown 4 dims
    inlab/                              Inteligencia InLab — ver inlab/README.md (mapping.ts = adaptacion al CSV real)
  components/inlab/                     charts.tsx (SVG propios), Vistas.tsx, ui.tsx, InformeInlab.tsx (compartidos dashboard/share)
docs/inlab/                             CSV sintetico de ejemplo + generador (no se sirve en produccion)
  middleware.ts                         Protege rutas, edge-compatible
```

---

## 5. Modelos Prisma principales

```
Usuario          (Rol enum: ADMIN|VENTAS|PROYECTOS|TECNICO)
Zona             (agrupacion de hospitales)
Hospital         (nombre, ciudad, provincia, tipo, camas, zona, grupoId auto-referencial)
Contacto         (nombre, cargo, email, telefono, hospital)
Visita           (titulo?, hospitalId, tipo, estado, fecha, datos:JSON, score, fotos:JSON)
Proyecto         (@@map "pre_proyectos" — titulo, hospital, responsable, estado, shareToken)
ProyectoModulo   (@@map "pre_proyectos_modulos" — pivot con EstadoModulo)
FaseProyecto     (@@map "fases_pre_proyectos" — tipo, nombre, orden, estado, fechas)
Hito, Tarea (subtareas, asignadoAId FK), EntradaTimeline, SolicitudMaterial
ProyectoContacto (@@map "pre_proyectos_contactos"), Adjunto (base64 en DB)
HardwareTipo, HardwareCatalogo (referenciaPalex, tipoId @map("tipo_id")), HardwareUnidad
Comentario       (texto, autor, mencionIds:JSON — vinculado a visita o proyecto)
Tag              (nombre, color, tipo: VISITA|PROYECTO), VisitaTag, ProyectoTag
Recordatorio     (titulo, descripcion?, fecha, completado, usuario)
Favorito         (usuarioId, entidadId, tipo: TipoFavorito, @@unique)
FiltroGuardado   (usuarioId, entidad: string, nombre, filtros: JSON, @@unique[usuarioId+entidad+nombre]) @@map("filtros_guardados")
RegistroLlamada  (hospital, contacto?, usuario, duracion, asunto, resultado, seguimiento)
Incidencia       (codigo, titulo, tipo HW/SW, categoria, prioridad, estado, SLA, hospital, HW unidad, coasignadosIds JSON [{id,nombre}], slaPausadoEn DateTime?, slaPausadoMs Int, fechaResolucion DateTime?, fechaCierre DateTime?)
EventoIncidencia (tipo 11 enum, descripcion, duracion?, privado, fotos JSON?, editadoPor?, editadoEn?, incidencia, autor)
RespuestaRapidaIncidencia (texto, categoria?, orden, activo) @@map("respuestas_rapidas_incidencia")
IncidenciaRelacion (tipo TipoRelacionIncidencia, incidenciaId, relacionadaId, creadoPorId, @@unique[incidenciaId+relacionadaId]) @@map("incidencias_relaciones")
LogActividad, ConfigApp (crmActivo, incidenciasActivo @map("incidencias_activo"), analiticaActivo @map("analitica_activo") — todos Boolean @default(true), scoringConfig), PlantillaVisita, ModuloInlab
NotaEquipo (texto, autorId, mencionIds JSON, fijada, creadoEn) @@map("notas_equipo") — notas del equipo accesibles a todos los roles
Oportunidad      (DESACTIVADO)
InlabCarga       (@@map "inlab_cargas" — hospital, usuario, fichero, hash sha-256, desde/hasta, filas, mapeo/opciones/avisos JSON, modo NUEVA|SUSTITUIR|OMITIR, estado COMPLETADA|PARCIAL|SUSTITUIDA)
InlabConsumoDiario / InlabPuestoDiario / InlabActividadDiaria / InlabTiempoDiario / InlabEventoDiario
                 (@@map "inlab_*_diario" — agregados por dia, FK cargaId onDelete Cascade + hospitalId sin FK, @@index([hospitalId, fecha]); tiempos con histograma Int[] de buckets fijos; actividad con porHora Int[24])
InlabMapeo       (@@map "inlab_mapeos" — hospitalId @unique, mapeo columnas JSON)
InlabTarifa      (@@map "inlab_tarifas" — hospital, consumible ("*" = resto), precio Decimal(12,4), moneda, vigencias)
InlabShare       (@@map "inlab_shares" — token @unique, hospital, desde/hasta?, incluirFacturacion, expiraEn, revocado, vistas)
```

**Enums clave:** EstadoProyecto (5), EstadoModulo (5), TipoFase (11), TipoFavorito (2), TipoIncidencia (2), CategoriaIncidencia (10), PrioridadIncidencia (4), EstadoIncidencia (6), TipoEventoIncidencia (11), TipoRelacionIncidencia (3: DUPLICADA|RELACIONADA|CAUSA_RAIZ)

---

## 6. APIs — reglas importantes

- GET `/api/visitas`: select SIN `datos` (JSON grande). Acepta `?desde=&hasta=`. Cache 15s.
- GET `/api/visitas/[id]`: devuelve `datos` completo + relaciones.
- POST visita acepta: `hospitalId`, `tipo`, `titulo`, `fecha`, `datos`, `proyectoId`, `contactoPrincipalId`.
- PATCH visita/proyecto acepta `tagIds` array para asignar tags.
- POST proyecto acepta: `moduloIds` array + `refConcurso`.
- GET proyecto incluye `modulos` + `tags`.
- Paginacion: hospitales `?limit=200&page=N`, proyectos `?limit=100&page=N`, header `X-Total-Count`.
- Seguridad: IDOR check por zona+responsable/propietario en hospitales, visitas, proyectos, llamadas. Whitelist en PATCH.
- Acceso visitas: propietario, ADMIN, o usuarios en la misma zona del hospital.
- Acceso proyectos: responsable, ADMIN, o usuarios en la zona del hospital.
- Rate limiting: GET 60/min, POST/PATCH/DELETE 30/min, presence 120/min.
- Validacion: Zod schemas centralizados en `schemas.ts`, usar `parseBody()`.
- Comentarios POST aceptan `mencionIds` array.
- `/api/perfil`: devuelve `{ rol, onboardingCompletado, calendarToken }` — usar `d?.rol`.
- `/api/config`: GET (autenticado) devuelve la fila ConfigApp `{ crmActivo, incidenciasActivo, analiticaActivo, scoringConfig }`. PATCH solo ADMIN; whitelist de toggles que exige booleanos reales (400 si no), `scoringConfig` objeto.
- Secciones desactivables: `guardSeccion("incidencias" | "analitica")` de `lib/config-app.ts` devuelve 403 si la seccion esta off. Aplicado en `GET /api/stats/comparador`, `GET /api/incidencias/stats` y `POST /api/incidencias`. No usar en APIs compartidas con otras secciones.
- GET `/api/hospitales/[id]/score`: devuelve `{ total, label, color, breakdown: { visitas, proyectos, hardware, seguimiento, penalizacion } }`. Cache 120s. Calcula dinámicamente — visitas 60d (30pts), proyectos activos (30pts), HW instalado (20pts), llamadas 30d (20pts), penalización criticas abiertas (-15pts max).
- GET `/api/hospitales/score?ids=`: batch scores para hasta 50 hospitales, devuelve `{ [id]: { total, color, label } }`.
- GET `/api/usuarios/menciones`: Redis cache 60s por query (`menciones:${q}`), fallback in-memory.
- GET `/api/log-actividad`: filtro `?entidad=` es case-insensitive (`mode: "insensitive"`). Acepta `?usuarioId=`.
- GET `/api/incidencias`: acepta `?limit=N` (max 500), `?q=`, `?estado=`, `?prioridad=`, `?tipo=`, `?hospitalId=`, `?asignadoAId=`, `?desde=&hasta=`. orderBy `creadoEn desc` (NO por enum — Prisma ordena enums alfabeticamente). Estado especial `PENDIENTE` se expande a `{ in: ["PENDIENTE_CLIENTE", "PENDIENTE_PROVEEDOR"] }`. Devuelve `tiempoTotalMinutos` por incidencia (Prisma groupBy + _sum duracion sobre EventoIncidencia).
- GET `/api/incidencias/[id]`: filtra eventos privados para no-ADMIN (solo ve los suyos).
- POST `/api/incidencias`: generarCodigo() con retry loop anti-race-condition. Acepta `coasignadosIds` (array IDs), resuelve nombres en DB y guarda como JSON `[{id, nombre}]`.
- PATCH `/api/incidencias/[id]`: gestiona pausa SLA automática al entrar/salir de PENDIENTE_CLIENTE/PROVEEDOR (slaPausadoEn + slaPausadoMs). Acepta `asignadoAId` nullable para reasignacion.
- POST `/api/incidencias/[id]/eventos`: acepta `fecha` (usa como creadoEn), `fotos` (array base64 max 5).
- PATCH `/api/incidencias/[id]/eventos/[eventoId]`: edicion solo autor o ADMIN, guarda editadoPor+editadoEn.
- GET/POST/DELETE `/api/incidencias/respuestas-rapidas`: plantillas de respuesta. ADMIN para POST/DELETE.
- GET/POST/DELETE `/api/incidencias/[id]/relaciones`: vincular incidencias. POST valida auto-relacion y duplicados (incluyendo inversos, 409). DELETE solo autor o ADMIN. Normaliza origen+destino en GET.
- GET `/api/incidencias/stats`: acepta `?desde=&hasta=`. Devuelve KPIs globales, porCategoria/porPrioridad/porTipo, tecnicos[] con { total, resueltas, slaRate, horasTotales }. Cache private 60s. SLA usando `fechaResolucion` (NO `resolvedAt`).
- **Inteligencia InLab** (`/api/inlab/*`, roles en `lib/inlab/roles.ts`: ver = todos; tarifas/facturacion = ADMIN|VENTAS; IDOR zona via `lib/inlab/access.ts`):
  - GET `/api/inlab/hospitales`: `{ todos (accesibles), conDatos (cobertura desde/hasta/dias/cargas), puedeFacturacion }`.
  - GET `/api/inlab/datos?hospitalIds=a,b&desde=&hasta=`: agregados del rango en formato compacto `InlabPayload` (diccionarios + tuplas, `lib/inlab/types.ts`). Max 20 hospitales.
  - GET `/api/inlab/benchmark?desde=&hasta=`: totales, dias, eventos y P50/P90 del ciclo por hospital accesible con datos.
  - POST `/api/inlab/cargas/check` `{ hospitalId, hash, dias[] }` → `{ duplicado, diasSolapados, rangosSolapados, diasNuevos, cargasAfectadas }`.
  - POST `/api/inlab/cargas` `{ hospitalId, modo, meta, mapeo, opciones, guardarMapeo?, payload }`: solo AGREGADOS (nunca filas crudas). Limite 25 MB (content-length + texto), Zod + `validarIndicesPayload`, transaccion Serializable (solapes comprobados dentro), 409 si solapa con modo NUEVA. Rate limit 10/min.
  - GET `/api/inlab/cargas?hospitalIds=`, DELETE `/api/inlab/cargas/[id]` (autor o ADMIN; cascade de agregados).
  - GET/PUT `/api/inlab/mapeos/[hospitalId]`; GET/PUT `/api/inlab/tarifas` (PUT reemplaza la tabla del hospital en transaccion).
  - GET/POST `/api/inlab/shares`, DELETE `/api/inlab/shares/[id]` (revoca). Publico: GET `/api/share/inlab/[token]` (rate limit 30/min, sin tarifas salvo `incluirFacturacion`, cuenta vistas).
- equipoResponsable enum: SERVICIO_TECNICO | APLICACIONES | COMERCIAL | MARKETING | PROYECTOS (5 equipos, NO "AMBOS")
- KPIs lista: usar `totales` (fetch sin filtros) para contadores globales; `items` solo para la lista filtrada.
- Lista incidencias: ordenacion client-side (fecha/SLA/hospital/titulo). Agrupacion por prioridad collapsible. Drawer lateral para detalle rapido. QuickAssign inline desde lista.

---

## 7. Funcionalidades implementadas (resumen)

**Secciones desactivables (Admin → Configuracion):** toggles "Soporte (Incidencias)" (`incidenciasActivo`) y "Analitica (Inteligencia InLab y Comparador)" (`analiticaActivo`), ademas de CRM. Ocultan menu/FAB/widgets, muestran estado "Seccion desactivada por el administrador" al entrar por URL y bloquean (403) las APIs exclusivas de la seccion. Sin borrar datos. Ver seccion 3.
**Auth:** Login split-screen, middleware edge, roles, JWT 7d con revocacion <5min, brute-force 5/min.
**Hospitales:** Lista paginada, detalle con KPIs/contactos/timeline/QR, favoritos DB, grupos hospitalarios.
**Visitas:** Formulario 13 secciones, calendario mensual, PDF, offline IndexedDB, firma digital, edicion colaborativa con presencia, tags, plantillas.
**Proyectos:** 10 tabs (code-split), fases/tareas/hitos/timeline/materiales/modulos/adjuntos, Kanban, share publico, export Excel.
**Hardware:** Tipos dinamicos, catalogo, inventario, alertas garantia/mantenimiento.
**Llamadas:** CRUD, KPIs, filtros, tab en hospital, dashboard Mi Dia.
**Admin:** CRUD usuarios/zonas/hospitales/hardware, tags, log actividad, panel equipo, heatmap carga.
**Dashboard:** KPIs por rol, "Mi Dia" (visitas+tareas+recordatorios+llamadas+favoritos), accesos rapidos.
**Comentarios:** @Menciones con MentionInput/MentionText, notificaciones TopBar.
**Movil:** BottomNav 5 tabs (glass, safe area), acciones rapidas campo.
**Onboarding:** 8 pasos generales + 3 extra ADMIN, slide animations, keyboard nav.
**Recordatorios:** CRUD inline, grupos temporales, notificaciones TopBar, dashboard.
**Favoritos:** DB-backed, optimistic updates, cross-device.
**Notificaciones:** Browser Notification API, polling 60s, preferencias perfil.
**Calendario:** iCal feed con HMAC tokens, sync Google/Outlook/Apple.
**Busqueda:** Global debounced, CommandPalette (Cmd+K), filtros avanzados.
**Plantillas de proyecto:** 4 plantillas hardcoded (Implantacion completa, Instalacion basica, Mantenimiento preventivo, Auditoria hardware). Modal de seleccion en proyecto con preview fases/tareas/hitos. Boton "Aplicar plantilla" visible cuando el proyecto no tiene fases aun. API POST /api/proyectos/[id]/aplicar-plantilla crea fases+tareas+hitos en bloque.
**Notas del equipo:** modelo NotaEquipo (notas_equipo), CRUD /api/notas + /api/notas/[id], pagina /notas con composer @menciones (MentionInput+extractMentionIds), feed paginado, fijar notas, editar (modal), eliminar con confirmacion. Accesible a todos los roles. Sidebar: nuevo grupo "Equipo" en todos los nav groups.
**Timeline global de actividad:** pagina /actividad con feed estilo GitHub, agrupado por fecha, filtros por entidad (pill chips), links directos a entidades, dot de color en timeline spine por tipo de accion. API log-actividad abierta a todos los usuarios autenticados (+ filtros usuarioId y entidad). /admin/log sigue disponible para ADMIN.
**Incidencias:** Helpdesk HW/SW, 10 categorias, 5 equipos (Servicio Tecnico/Aplicaciones/Comercial/Marketing/Proyectos), SLA con pausa (PENDIENTE_CLIENTE/PROVEEDOR — slaPausadoEn+slaPausadoMs), timeline SVG agrupado por fecha, 11 tipos evento, eventos privados, fotos en eventos (hasta 5, lightbox), edicion eventos (autor/ADMIN, badge editado), respuestas rapidas configurables, fecha seleccionable en eventos, hospital con buscador combobox, asignacion multiple (principal+coasignados JSON), exportacion informes PDF, filtros activos con chips, KPIs interactivos (totales independientes del filtro), toggle activacion. **UX Pro Max (Sprint 15):** slide-over drawer, vista tabla, SLA countdown live (60s), inline edit estado/prioridad/asignado, banner criticas, agrupacion collapsible por prioridad, timeline eventos auto compactos + tiempo-dia + badge lapiz editado, sticky header glassmorphism en detalle, ordenacion clickable (fecha/SLA/hospital/titulo), indicador actividad reciente pulsante (2h), QuickAssign desde lista, highlighting busqueda, atajos teclado (N/R/↑↓/Esc). tiempoTotalMinutos por incidencia en lista/detalle/PDF/export.
**Scoring hospitales:** health score 0-100 calculado dinamicamente (visitas 60d / proyectos activos / HW / llamadas 30d / penalizacion criticas). Badge en detalle hospital con breakdown visual. GET /api/hospitales/[id]/score + batch /api/hospitales/score?ids=.
**Modo presentacion:** /proyectos/[id]/presentacion — 5 slides dark mode (Portada, Fases, Tareas, Hitos, Resumen KPIs con donut chart). Navegacion teclado flechas, Esc para cerrar. Boton "Presentar" en acciones rapidas del proyecto.
**Comparador de periodos:** /comparador — seleccion 30/90/365 dias, 6 metricas (visitas/proyectos/incidencias/llamadas/checkins/horas campo), sparklines SVG puros con gradiente, DeltaBadge %, tabla resumen. API GET /api/stats/comparador?periodo=. Cache-Control private max-age 300.
**Pasaporte hardware:** /share/hardware/[id] — pagina publica sin auth (CSP exento), hero dark-blue, badge estado/garantia, info tecnica, historial incidencias activas/cerradas colapsible. API GET /api/share/hardware/[id].
**Check-in/Check-out hospitales:** modelo CheckinHospital (checkins_hospital), relaciones nombradas "CheckinsUsuario"/"CheckinsHospital". API POST /api/checkin (idempotente), GET /api/checkin?hospitalId&activo=, PATCH /api/checkin/[id] (checkout, calcula duracion minutos). Banner activo en detalle hospital con pulsante verde + contador en vivo (actualizado cada 60s), boton Check-in en cabecera.
**QuickActionsFAB:** boton flotante context-aware en dashboard layout. Acciones por ruta (hospitales/[id], hospitales, visitas, proyectos/[id], proyectos, incidencias, llamadas, hardware, recordatorios, notas). 1 accion = FAB directo; N acciones = menu expandible con backdrop blur. Usa CustomEvents para comunicar con paginas.
**Ruta optimizada mapa:** toggle "Ruta hoy" en /mapa. Algoritmo nearest-neighbor (greedy TSP) sobre visitas del dia. Polyline Leaflet punteada teal, marcadores numerados L.divIcon, fitBounds automatico. Panel lista ordenada en esquina inferior izquierda.
**Vincular incidencias:** modelo IncidenciaRelacion (3 tipos: DUPLICADA/RELACIONADA/CAUSA_RAIZ). Panel en detalle incidencia con buscador combobox + badge tipo + estado + link. API GET/POST/DELETE /api/incidencias/[id]/relaciones. Previene auto-relacion y duplicados inversos (409).
**WOW visual (Sprint 19):** globals.css — 5 keyframes nuevos: stagger-list (10 hijos, 0-315ms), growBar+progress-bar-anim, drawRing+score-ring-path (CSS var --ring-offset), slaUrgent pulsante, confettiFall+confetti-particle. Todos respetan prefers-reduced-motion. Confetti al marcar proyecto COMPLETADO por primera vez. Score ring SVG animado en hospitales/[id] (reemplaza badge plano). Barras de avance animadas en lista proyectos (stagger por posicion + --bar-delay). SlaAlertasWidget en dashboard Admin+Proyectos (countdown live 30s, incidencias criticas/altas <24h).
**Metricas incidencias:** /incidencias/stats — KPIs globales (total/abiertas/en-progreso/resueltas/SLA%), distribucion por categoria/prioridad/tipo HW-SW (donut chart SVG), tabla tecnico con tasa resolucion, cumplimiento SLA y horas trabajadas. Filtro periodo 7/30/90/todo dias. Accesible via boton "Metricas" en header incidencias.
**Dynamic imports:** ComentariosPanel en TabInfo (next/dynamic, ssr:false). QRCode en TabResumen (import() dinamico en useEffect). @dnd-kit ya existia.
**Calidad:** Lighthouse 100/100/96/100, Playwright E2E 18 tests, dark mode completo, Sentry.
**Inteligencia InLab (modulo real de datos):** boton "+ Cargar fichero" (PageHeader + accion FAB `fab:inlab-cargar`) abre un asistente: hospital (por zona) → CSV/TSV/TXT (delimitador ; , 	 | y UTF-8/latin1 autodetectados) → previsualizacion → emparejar columnas con 12 campos canonicos (autodeteccion por alias en `lib/inlab/mapping.ts`, mapeo guardado por hospital) → procesado en el navegador por streaming en Web Worker (progreso, cancelar, SHA-256 incremental; ~25 MB/s) → revision (avisos, bloqueo si una dimension tiene demasiados valores distintos = posible PII) → deteccion de recarga por hash y de dias solapados (sustituir / solo dias nuevos / cancelar). Solo se suben agregados diarios. Dashboard: selector multi-hospital, presets 30d/90d/12m/todo/personalizado limitados a la cobertura, filtros por clic (area, consumible, puesto) + prioridad que se propagan a todas las vistas; tabs Resumen ejecutivo (KPIs con tendencia vs periodo anterior), Consumo & demanda (por consumible/area/puesto, heatmap dia×hora, evolucion + prevision lineal 4 semanas), Flujo & tiempos (P50/P90 por tramo, area y urgencia con histogramas combinables, cuellos de botella), Incidencias & calidad (eventos del propio fichero: reimpresiones, rechazos, anulaciones, errores impresora; tasa por 1.000), Comparar hospitales (normalizado por dia/cama), Modelo comercial (tarifas con vigencia, consumo × tarifa, export Excel/CSV), Cargas & cobertura (historico, huecos, borrar). Compartir: enlace publico `/share/inlab/[token]` por hospital y periodo (caducidad, revocable, opcion facturacion) + vista imprimible/PDF. La antigua pagina estatica GULLA sigue accesible como "Demostracion". CSV sintetico en `docs/inlab/`. Pendiente del fichero real: ver `src/lib/inlab/README.md`.
**Seguridad:** CSP (sin unsafe-eval), HSTS, IDOR, rate limiting ~50 rutas, Zod validation. /notas /actividad /incidencias /comparador /checkin /inlab protegidos en middleware Edge. /share/ exento (publico por diseno).
**Rendimiento:** SWR usePerfil() compartido, connection pool max:20, 15 indices DB, Redis rate-limit/presence/menciones (rate-limit con fallback in-memory automatico si Redis no esta configurado). @dnd-kit, ComentariosPanel, QRCode = dynamic imports (no en bundle inicial).
**Sprint 20 — auditoria y hardening (completo):** 3 auditorias paralelas (seguridad API, logica de negocio/Prisma, UX/consistencia) sobre todo el codebase, 16 hallazgos, todos corregidos. IDOR de zona en score de hospitales y relaciones de incidencias, limite de tamano en fotos de eventos, rate-limit en `oportunidades`, Zod en `recordatorios`, fecha UTC en `incidencias/stats`, `DELETE usuario` con actividad (409 en vez de 500), transacciones en `aplicar-plantilla` y en relaciones/pausas SLA de incidencias (evita race conditions y lost updates), `confirm()` en 4 acciones de borrado de proyectos que no lo tenian, colores de marca hardcodeados consolidados en `brand.ts` (11 `error.tsx`, `TabResumen.tsx`, `admin/zonas`), mapeo tipo→color unificado (`TIPO_RESULTADO_COLOR`). Rate limiting migrado a Redis real (`checkRateLimit`/`checkRateLimitByKey` async, ~150 call-sites actualizados, fallback in-memory si Redis no esta configurado). `PageHeader` unificado en 12 paginas adicionales (ampliado con `icon`/`iconColor` opcionales); excepciones deliberadas documentadas (mapa, incidencias/stats, perfil, paginas de detalle, pipeline CRM desactivado). `onDelete: Restrict` explicito en `Incidencia.hospital`/`RegistroLlamada.hospital`. Detalle completo en `AUDITORIA-SPRINT20.md`.
**Sprint 21 — backlog completo:** modo compacto en lista de proyectos (toggle localStorage `proyectos_compacto`, fila slim vs. card). Copiar fases/tareas/hitos entre proyectos (`POST /api/proyectos/[id]/copiar-desde`, transaccion, preserva timeline relativo de hitos, modal con buscador). Filtros guardados DB-backed (modelo `FiltroGuardado`, `@@unique([usuarioId, entidad, nombre])`, CRUD en `/api/filtros-guardados`, UI en `/incidencias`). Agenda semanal `/agenda` (vista Lun-Vie, `GET /api/agenda?desde=&hasta=` agrega visitas+tareas+recordatorios del usuario, navegacion por semana). Calendario de incidencias `/incidencias/calendario` (clona el patron de `visitas/calendario`, dots por peor estado SLA del dia: VENCIDO/EN_RIESGO/OK/RESUELTA). Notificacion automatica de cambio de estado (bloque nuevo en `/api/notificaciones` leyendo `EventoIncidencia` tipo `CAMBIO_ESTADO`, sin modelo nuevo). Recurrencia automatica (al crear incidencia, busca resuelta/cerrada mismo hospital+categoria+equipo en 30 dias, auto-vincula `IncidenciaRelacion` tipo `RELACIONADA` + evento + toast). Escalado automatico (`GET /api/cron/escalar-incidencias`, protegido por `CRON_SECRET`, marca evento `ESCALADO` en CRITICAs sin asignar >4h, idempotente; la notificacion a ADMIN se sirve del mismo bloque de `/api/notificaciones`). **Pendiente de configuracion manual**: `CRON_SECRET` en Railway + un cron externo (Railway no tiene cron nativo) que llame a `/api/cron/escalar-incidencias` cada 15-30 min.
Fix colateral: `GET /api/incidencias` no seleccionaba `slaPausadoMs`/`slaPausadoEn`, por lo que `SlaAlertasWidget` calculaba mal el SLA de incidencias pausadas — corregido (necesario para el calendario SLA).

**Sprint 22 — auditoria seguridad/arquitectura + diseno (completo):** 2 auditorias paralelas (seguridad/arquitectura/ciberseguridad, y diseno UI/UX con skill `ui-ux-pro-max`) sobre todo el codebase, fixes aplicados en el mismo dia. Seguridad: IP spoofing corregido en `rate-limit.ts`/`auth.ts` (se tomaba el primer valor de `X-Forwarded-For`, falsificable — ahora se toma el ultimo, mas rate-limit de login por email independiente de la IP); Next.js `16.2.6 → 16.3.1` (resuelve CVE altos/criticos de Server Functions/SSRF); `crypto.timingSafeEqual` en el secreto de `cron/escalar-incidencias`; limites en `FiltroGuardado.filtros`; transaccion Serializable + Zod en `/api/checkin`; validacion de enum `estado` antes de PATCH/POST en `proyectos/[id]`, `visitas/[id]` y `hardware/unidades` (antes devolvian 500 generico en vez de 400 en input invalido). `/api/log-actividad` sin filtro de zona para no-ADMIN — dejado sin tocar a proposito (requeriria rehacer el conteo/paginacion con joins distintos por tipo de entidad, no es un fix mecanico). `PATCH /api/hardware/unidades/[id]` sin ningun check de zona/rol mas alla de autenticado — no se toco (podria ser diseno intencional de inventario compartido cross-zona; decision de negocio pendiente). Diseno: clase `.card` reutilizable (`--radius-card`+`--el-1`) aplicada a KPI cards/hospitales/proyectos, tipografia de `PageHeader` refinada, hex hardcodeados corregidos (login, PageHeader), gradiente+glow en `Sidebar`, pills de formulario de visita de relleno solido a `bg-teal-50`+borde, `STATUS_COLORS` centralizado en `brand.ts` para incidencias. Verificado visualmente en navegador (login, dashboard, hospitales, incidencias, proyectos, pills de visita, dark mode) sin regresiones. **Deliberadamente NO abordado** por alto riesgo/alcance — requieren esfuerzo dedicado aparte: unificar el doble sistema de dark mode (overrides globales `.dark .bg-white` vs. clases `dark:` locales), y trocear `visitas/[id]/page.tsx` (2177 lineas, sin code-split a diferencia de `proyectos/[id]`, formulario de 13 secciones con offline/autosave/firma/fotos/presencia — alto riesgo de regresion sin testing dedicado).

**Sprint 23 — auditoria de accesibilidad + backlog (completo):** Auditoria a11y (primera del proyecto, 30 ficheros corregidos): hook `useModalA11y` (Escape + devolucion de foco) aplicado a ~24 modales/drawers con `role=dialog`/`aria-modal`/`aria-labelledby`; formulario de visitas con `id`/`htmlFor` en todos los campos y `role=radiogroup`/`group`+`aria-pressed` en RadioPills/CheckPills/rating; contraste WCAG AA en `STATUS_COLORS` de incidencias (tonos `-700` sobre fondo palido, antes fallaban 2.06–3.44:1); navegacion por teclado en tarjetas clicables; `th scope="col"` en tablas; focus rings en inputs; `aria-label` en botones icon-only; `aria-live` en el widget SLA; semantica combobox en CommandPalette. Fix colateral: `suppressHydrationWarning` en `<html>` (el script de deteccion de tema pre-hidratacion generaba un warning esperado sin el). **Fix de bug real:** `DELETE /api/usuarios/[id]` y `DELETE /api/hospitales/[id]` devolvian 500 en vez de 409 al borrar un registro con actividad vinculada — Postgres distingue SQLSTATE `23001` (RESTRICT explicito/implicito) de `23503` (NO ACTION), y Prisma solo mapea el segundo a `P2003`; el catch ahora comprueba tambien `err.cause.code` para ambos codigos. Afecta a cualquier relacion requerida sin `onDelete` explicito (`Visita.usuario`, `NotaEquipo.autor`, `EventoIncidencia.autor`, etc.), no solo a las relaciones `Restrict` explicitas. **Feature nueva:** check-in por geolocalizacion en el dashboard de campo (PROYECTOS/TECNICO) — boton que pide ubicacion al navegador, busca el hospital mas cercano (`GET /api/hospitales/cercano`, filtrado por zona salvo ADMIN, radio 15km) y hace check-in automatico; logica de coordenadas por ciudad (`COORDS_POR_CIUDAD`) extraida a `lib/hospital-coords.ts` y reusada en `MapaLeaflet.tsx` (antes duplicada). **Refactor:** `visitas/[id]/page.tsx` troceado siguiendo el patron de `proyectos/[id]` (2177 → 1278 lineas): `types.ts` + `helpers.ts` + `_components/` (SectionIcon, FotosSeccion, CampoField, SaveIndicator, SectionNav, InlineFieldEditor, VistaResumen — esta ultima con `next/dynamic` ya que es una vista alternativa de pantalla completa). El componente principal `VisitaPage` (estado, autosync offline, presencia colaborativa, autosave) se dejo intacto por ser el nucleo de mayor riesgo. **Investigado y deliberadamente NO tocado:** el doble sistema de dark mode — el `!important` global ya produce el resultado visual correcto (verificado en navegador), las clases `dark:` explicitas añadidas hoy en ~40 sitios quedan inertes pero no rompen nada; migrar 58+ ficheros a un unico sistema requeriria verificacion visual exhaustiva pantalla a pantalla, se aparca como sesion dedicada.

**Sprint 24 — rediseño visual "Palex Nexus" (completo):** nuevo sistema visual en `globals.css` sobre las clases existentes (sin tocar logica): tokens (`--ink-*`, `--surface*`, `--hairline*`, `--el-*`, `--ease-*`), auroras de marca animadas en `.app-shell`, rejilla de puntos, tarjetas con filo de luz y foco que sigue al cursor (`InteractionLayer.tsx` escribe `--mx/--my`; desactivado en tactil y reduced-motion), barra de progreso de ruta (`PageTransition`), topbar flotante de cristal, sidebar en tinta con rail activo luminoso y estado online real (`SidebarStatus`), dock movil flotante, `PageHeader` con sello en vivo (`ui/LiveStamp.tsx`) y barrido de escaner, toasts de cristal con temporizador, login con panel de red animada, KPIs/graficas del dashboard con barras animadas, Geist Mono para cifras y etiquetas. Los botones de marca (style inline TEAL/ORANGE) reciben brillo/halo via selector de atributo. Fixes colaterales: `divide-y` en dark (Tailwind v4 pinta border-bottom, el override solo cubria `* + *` → linea blanca), filas de la lista de hospitales (acciones de hover se apilaban debajo), cabecera del widget SLA en dark, chip del logo oscurecido por `.dark .bg-white`. Keyframes de entrada terminan en `transform: none`/`filter: none` para no crear containing block a modales `fixed`. Logotipo: `ui/BrandLockup.tsx` (lockup "Palex | InLab" y la "P" para el sidebar colapsado) recorta el wordmark de `/logo-palex.png` con `mask-image`, asi se colorea por CSS sin duplicar el asset; no usar `bg-white` para rellenarlo (el override dark lo oscurece). **Sprint 24b — Nexus 2:** capa de controles global (inputs con hover/foco, selects con chevron propio, checkbox/range en teal, campos a 16px en movil para evitar zoom iOS, botones deshabilitados/secundarios, controles segmentados, badges con anillo, tablas, kbd), modales/drawers/overlays con entrada animada, pills pastel invertidas en dark. Carga: `ActivityIndicator` (envuelve `fetch` a `/api`, linea de energia + topbar si una peticion tarda >150ms; ignora polling de notificaciones/presencia), `SkeletonHeader`/`NexusLoader`, `loading.tsx` rediseñado, `CountUp` en KPIs. Menus: FAB como command menu de cristal, tooltips fixed en sidebar colapsado, pill offline. **Fix de uso:** ninguna accion por evento del FAB tenia receptor (nueva incidencia/proyecto/visita/llamada/tarea/recordatorio/nota/unidad HW, check-in) — conectadas con `hooks/useFabAction.ts` (eventos cancelables + accion pendiente para formularios en pestañas no montadas; "Nuevo hospital" lleva a `/admin/hospitales?nuevo=1` solo ADMIN). **Fix de capas:** el shell no debe crear contexto de apilamiento (sin `isolation`/`z-index` en `.app-shell`/`.app-workspace`) y las animaciones de entrada usan `animation-fill-mode: backwards` — con `both` Chrome conserva `translateY(0)` y los modales `fixed` quedaban recortados al ancho del contenido. Dev: si Turbopack sirve CSS viejo, borrar `.next/dev/cache/turbopack`. Nota: el Service Worker cachea CSS en dev con el mismo nombre de chunk — si no se ven cambios, desregistrar SW.

**Sprint 24c — QA del diseño Nexus (completo):** auditoria de uso/rendimiento/a11y/capas del rediseño. **Bug "al pulsar el sidebar la pagina se recarga y el menu vuelve arriba"** — causa raiz: `public/sw.js` interceptaba las peticiones RSC de la navegacion de cliente (`/ruta?_rsc=…`, cabecera `RSC: 1`) con *cache-first*: la primera respuesta se servia para siempre (datos viejos) y, tras cada deploy, su buildId no coincidia con el del cliente → Next 16 hace navegacion MPA (`doMpaNavigation`, recarga completa: el sidebar se remonta arriba y se repiten las animaciones de entrada). Fix: el SW ya no toca RSC/prefetch/Server Actions ni metodos != GET fuera de `/api`; `CACHE_VERSION` → `palex-v3` (purga lo cacheado); el registrador solo recarga en `controllerchange` si habia un SW previo (antes recargaba tambien en la primera instalacion). Complementos: scroll del menu persistido en `sessionStorage` y restaurado en `useLayoutEffect` (sobrevive al drawer movil y a recargas), item activo llevado a la vista solo si queda fuera (sin `scrollIntoView`), `/api/config` ya no se pide en cada navegacion (al montar + `visibilitychange` + evento `palex:config` que emite admin/configuracion), modulos crm/incidencias leidos en el layout servidor (antes `localStorage` en el primer render → desajuste de hidratacion), `data-scroll-behavior="smooth"` en `<html>` (Next 16 animaba el salto de scroll de cada navegacion). Capas: sidebar desktop con `z-index:32` (el `sticky` crea contexto y los tooltips del modo colapsado quedaban bajo `<main>`), drawer movil 44/45 sobre dock (40) y FAB (41) — el dock tapaba su pie; estados de carga de `/presentacion` con `z-[9999]`. Rendimiento: `--mx/--my` registradas con `@property inherits:false` (cada pointermove recalculaba el subarbol entero de la tarjeta), anillo conico del FAB solo gira en hover/abierto (animar `@property` repinta cada frame), `badge-pulse` limitado a 4 ciclos, contexto de `Toast` memoizado (cada toast re-renderizaba consumidores y re-disparaba efectos con `toast` en deps). A11y: FAB menu con foco al primer item, flechas/Home/End y Escape que devuelve el foco; toasts en region `aria-live` (errores `role=alert`); topbar con `aria-expanded`, combobox en buscador, Escape cierra popovers, boton descartar visible con foco/tactil; sidebar con `aria-label` en avatar/logout/colapsar, botones ocultos por opacidad fuera del tab order, Escape cierra el drawer, hover por CSS (el estado React se quedaba pegado); contraste: etiquetas de grupo del sidebar 5:1 y `.dark .text-gray-400` ≥4.5:1. Movil: toasts por encima del FAB (`.toast-region`), padding inferior del main con safe-area y hueco para el FAB. Pills invertidas en dark: excluidas las solidas con texto blanco. Dev: `'unsafe-eval'` en CSP solo fuera de produccion (React dev lo necesita). **No abordado (documentado):** `viewportFit: "cover"` (sin el, `env(safe-area-inset-*)` vale 0 en iOS; cambia el layout del PWA, probar en dispositivo), pausa del temporizador de toasts en hover/foco (WCAG 2.2.1), `loading.tsx` del grupo muestra un esqueleto de pagina completa en cada navegacion lenta, `middleware.ts` duplicado y obsoleto en la raiz (Next usa `src/middleware.ts`), selectores globales sin capa (`button,a{transition…}`, `h1-h3{letter-spacing}`) pisan utilidades Tailwind por estar fuera de `@layer`.

**Sprint 24d — cierre de integración:** `viewport.viewportFit = "cover"` (iOS) con `.app-shell` reservando `env(safe-area-inset-top/left/right)`; los toasts pausan su temporizador al pasar el ratón, al enfocarlos y con la pestaña oculta (WCAG 2.2.1). La acción del FAB en /inlab se oculta si Analítica está desactivada. Integradas las ramas de toggles (Analítica/Soporte), QA del diseño e Inteligencia InLab. **Al desplegar**: Railway ejecuta `prisma db push`, que crea la columna `config_app.analitica_activo` y las tablas `inlab_*` (todo con defaults, sin pérdida de datos). En local, tras `prisma generate`, la app falla al leer `ConfigApp` hasta que exista esa columna en la BD.

**Sprint 25 — InLab con datos reales (Gómez Ulla):** la exportación real es **SQL Server** (tablas `dbo.*`), no MySQL. El asistente admite (A) CSV plano de `docs/inlab/exportacion-inlab.sql` (una fila por tubo, autodetectado por cabeceras) y (B) la BD completa por carpeta (`lib/inlab/sqlserver.ts`: cruza `LabOrder_Specimens.LabOrderNumber = LabOrders.Id` con los `Cfg_*`, descarta `HL7Received` y nunca abre `LabPatients`/usuarios/logins). Mapeo y agregador adaptados al flujo real: tramos ESPERA (llegada→numeración), EXTRACCION (numeración→validación), TUBO, TOTAL; prioridad 2 = urgente; `State` -1 = anulado; `NumPrinted`>1 = reimpresión; categoría de evento nueva INCIDENCIA (Cfg_Lab_Incidences); datos de pedido contados una vez por pedido. Cargada la BD de Gómez Ulla (oct-2025 → ago-2026: 280.800 tubos, ~62.000 pedidos). Pendiente: significado de `LabOrders.State` con el equipo InLab. **Selector de work areas** (`components/inlab/SelectorAreas.tsx`): filtro multi-área global (`Filtros.areas: string[]`, vacío = todas) aplicado a resumen, consumo, tiempos, calidad, facturación e informe; chips con volumen por área, atajos por grupo (Extracciones/Urgencias/Plantas), invertir, doble clic = solo esa área; clic en un área de cualquier gráfico la añade/quita; selección recordada en localStorage por combinación de hospitales (`inlab_areas:<ids>`).

**Sprint 25b — auditoría estadística InLab:** referencia independiente en Python sobre la BD completa de Gómez Ulla (solo agregados, fuera del repo) frente al payload generado con el código real y pasado por `analytics.ts` (72 escenarios: 30/90 días, 12 meses, todo, feb/ene-2026 × todas/EXTRACCIONES/URGENCIAS/plantas × todas/urgente/normal). Recuentos (tubos, urgentes, pedidos distintos, eventos) y medias exactos. Corregido: (1) **percentiles** — buckets v2 mucho más finos (`histogram.ts`: 5 s hasta 2 min, 15 s hasta 10, 30 s hasta 30, 1 min hasta 1 h, 2,5–10 min hasta 8 h…; 303 buckets) y acotados al máximo observado; la mediana del ciclo salía 1,7 min frente a 0,6 reales y todas las áreas mostraban "2 min"; ahora error típico 0,01 min y ≤0,1 en medianas cortas con n≥30 (las diferencias mayores solo con n pequeño, dentro de los estadísticos de orden vecinos). Las filas v1 guardadas se re-reparten al leer (`normalizarHist`, mismo resultado que antes) hasta **recargar Gómez Ulla**; payload `v: 2` (un navegador con código viejo no puede subir índices v1). (2) `fmtMin` con un decimal por debajo de 10 min ("0,6 min") y sin "60 min"/"1 h 60 min". (3) **Tendencias**: `comparacion()`/`kpisComparables()`/`tendencias()` — solo si ambos periodos tienen ≥80 % de días cargados, y los volúmenes se comparan por día con datos (feb-2026 vs enero con 8 días daba +192 %; 90 días daba +48,5 % de registros con 82/90 días previos, +35,3 % por día). (4) `kpis().dias` y "registros/día" = días cargados (antes, días con actividad del filtro: EXTRACCIONES 22 de 30 → media inflada un 36 %); igual en mapa de calor y media por día de la semana, que además ahora respeta urgencia/consumible (antes con «urgente» mostraba todo). (5) **Tasa de eventos** con denominador coherente (`registrosBaseEventos`: los eventos no tienen urgencia/consumible; con «urgente» salía 333 ‰ en vez de 157 ‰, y 6.083 ‰ en febrero) y respetando el filtro de puesto. (6) "X concentra el N % de la actividad" y "áreas con actividad" solo con las áreas seleccionadas. (7) Pedidos contados en el día de su primer tubo (antes, distintos por día × área: un pedido que cruzara medianoche sumaba dos; en Gómez Ulla no pasa). (8) Previsión solo con semanas de 7 días cargados (antes escalaba semanas de 5–6 días ×7/días). (9) Facturación: una línea por mes × consumible × precio (cambio de tarifa a mitad de mes), importe por línea redondeado a céntimos y total = suma de líneas (`totalImporte`). (10) `TRAMO_LABEL.TOTAL` = "Ciclo completo (llegada o numeración → validación)" (no es solo de extracciones). Script reproducible sin datos reales: `npx tsx docs/inlab/verificar-estadistica.ts`. **Decisiones/pendientes:** la mediana del ciclo con "todas las áreas" mezcla flujos muy distintos (URGENCIAS/plantas validan en <1 min, EXTRACCIONES ~9 min) y su tendencia refleja sobre todo el cambio de mezcla (90 días: −90 %) — conviene mostrar tiempos por área o por defecto solo EXTRACCIONES; la tasa de eventos por urgencia/consumible requiere añadir esas dimensiones a `eventos` en el payload; la serie semanal muestra totales de semanas incompletas en los bordes/huecos; el KPI "Incidencias / 1.000" del resumen cuenta reimpresiones+anulaciones+incidencias (renombrar a "Eventos de calidad"; no tocado por estar en la parte de tarjetas que se rediseñaba en paralelo).

---

## 8. Deuda tecnica activa

| Prioridad | Issue | Ubicacion |
|-----------|-------|-----------|
| ALTA | `/datos` es 100% mockup — sin APIs reales | datos/page.tsx |
| ALTA | Object storage: fotos/adjuntos en base64 en DB — necesario antes de 20 usuarios | Bloqueado (requiere R2/S3) |
| BAJA | Doble sistema de dark mode (overrides globales `!important` en globals.css vs. clases `dark:` locales de Tailwind) — el global siempre gana por `!important`, así que las clases `dark:` explícitas en el markup quedan inertes en la práctica (verificado visualmente: el resultado ya es correcto, no es un bug visible). Migrar 58+ ficheros a un único sistema es una sesión dedicada aparte, no urgente. | globals.css, componentes varios |
| BAJA | `/api/log-actividad` no filtra por zona para no-ADMIN — decision de diseno sin documentar explicitamente | api/log-actividad/route.ts |
| BAJA | `PATCH /api/hardware/unidades/[id]` sin check de zona/rol — puede ser intencional (inventario compartido) | api/hardware/unidades/[id]/route.ts |
| BAJA | `xlsx` con CVE sin fix upstream — riesgo bajo (solo generacion, no parseo de ficheros subidos) | package.json |

---

## 9. Pendiente

### Activo (bloqueado por dependencias externas)
- [ ] `/datos` APIs reales — aplazado, pendiente definir fuente de datos
- [ ] Object storage: migrar fotos/adjuntos de base64 en DB a R2/S3 (~2-3 dias, bloqueado)

### Activo (pendiente tecnico menor)
- [x] ComentariosPanel dynamic import — IMPLEMENTADO (Sprint 19, TabInfo)
- [x] QRCode dynamic import — IMPLEMENTADO (Sprint 19, TabResumen)
- [x] SignaturePad dynamic import — ya IMPLEMENTADO (verificado en auditoria de hoy, visitas/[id]/page.tsx:19)
- [ ] bodyParser size limits — no aplica en Next.js 16.x a nivel config; pendiente revisar alternativa por ruta

### Backlog — Features nuevas (priorizadas por impacto/esfuerzo)
- [x] Plantillas de proyecto inteligentes — IMPLEMENTADO (Sprint 16)
- [x] Panel de notas del equipo — IMPLEMENTADO (Sprint 16)
- [x] Timeline global de actividad — IMPLEMENTADO (Sprint 16)
- [x] Scoring de hospitales — IMPLEMENTADO (Sprint 17)
- [x] Modo presentacion proyecto — IMPLEMENTADO (Sprint 17)
- [x] Comparador de periodos — IMPLEMENTADO (Sprint 18)
- [x] Pasaporte hardware — IMPLEMENTADO (Sprint 18)
- [x] Check-in/Check-out hospitales — IMPLEMENTADO (Sprint 18)
- [x] Quick Actions flotantes (FAB) — IMPLEMENTADO (Sprint 18)
- [x] Ruta optimizada mapa — IMPLEMENTADO (Sprint 19)
- [x] WOW visual — IMPLEMENTADO (Sprint 19): confetti, score ring, stagger, SLA widget, barras animadas
- [ ] Briefing matutino automatico (email + tarjeta dashboard "Tu dia") — BLOQUEADO (requiere Resend)
- [ ] Resumen semanal ADMIN (email lunes con KPIs, tendencias, top performer) — BLOQUEADO (requiere Resend)
- [x] Modo compacto toggle en lista proyectos — IMPLEMENTADO (Sprint 21)
- [x] Geolocation check-in (auto-detectar hospital cercano) — IMPLEMENTADO (Sprint 23)
- [x] Filtros guardados (guardar sets de filtros con nombre) — IMPLEMENTADO (Sprint 21, en /incidencias)
- [x] Agenda semanal /agenda (vista 5 dias — visitas + tareas + recordatorios) — IMPLEMENTADO (Sprint 21)
- [x] Copiar fases/tareas entre proyectos — IMPLEMENTADO (Sprint 21)
- [x] Calendario SLAs /incidencias/calendario (vista mensual, dots por SLA estado) — IMPLEMENTADO (Sprint 21)

### Backlog — Incidencias (modulo aparte)
- [x] Vinculacion entre incidencias (DUPLICADA, RELACIONADA, CAUSA_RAIZ) — IMPLEMENTADO (Sprint 19)
- [x] Metricas rendimiento por tecnico — IMPLEMENTADO (Sprint 19, /incidencias/stats)
- [x] Notificacion automatica al cambiar estado (al reportador y al asignado) — IMPLEMENTADO (Sprint 21, computado en /api/notificaciones desde EventoIncidencia CAMBIO_ESTADO)
- [x] Recurrencia / reapertura automatica (detectar patron hospital+equipo+categoria) — IMPLEMENTADO (Sprint 21, auto-vincula via IncidenciaRelacion al crear)
- [x] Escalado con reglas automaticas (CRITICA >4h sin asignar → auto-escalar + notificar ADMIN) — IMPLEMENTADO (Sprint 21, `/api/cron/escalar-incidencias` — requiere configurar CRON_SECRET + un cron externo que lo llame, Railway no tiene cron nativo)

### Backlog — Infraestructura (no priorizado)
- [ ] Notificaciones por email (Resend o similar)
- [ ] Notificaciones push movil (VAPID + FCM/OneSignal)
- [ ] Offline completo: crear registros sin conexion

---

## 10. Patrones y convenciones de codigo

- `"use client"` debe ser la PRIMERA LINEA del archivo (sin nada antes)
- API routes: try/catch siempre, retornar `{ error: "..." }` status 500
- Client fetching: `fetch("/api/...")` con guard `r.ok` y `Array.isArray()`
- Imagenes: `comprimirImagen()` de `@/lib/img-compress.ts` antes de guardar
- Color principal: importar de `@/lib/brand.ts`, NUNCA hardcodear hex
- Tap targets movil: minimo 44px altura
- Formularios: RadioPills/CheckPills (no radio/checkbox nativos)
- Iconos: SIEMPRE SVG de `components/ui/Icons.tsx` (NO emojis)
- EmptyState en todas las listas vacias + Skeleton shimmer en todas las cargas
- Prisma: `db.proyecto` (no `db.preProyecto`) — modelo renombrado con @@map
- Exportaciones HTML (document.write/print): SIEMPRE escapar datos usuario con `esc()` (XSS prevention)
- Mapa hospitales: tile estatico OSM (img-src permitido), NO iframe (frame-src bloqueado por CSP)
- Diseño "Palex Nexus": tokens en `globals.css` (`--ink-*`, `--surface*`, `--hairline*`, `--el-*`, `--ease-*`). Reutilizar clases existentes (`.card`, `.stat-card`, `.filter-surface`, `.modal-surface`, `.kpi-icon-tile`, `.kpi-label`, `.section-title-mark`, `.live-dot`) antes de crear estilos nuevos
- Animaciones de entrada: `animation-fill-mode: backwards`, NUNCA `both`/`forwards` con transform/filter (Chrome conserva `translateY(0)` y recorta los modales `fixed` de la pagina)
- NO poner `isolation`, `z-index` ni `transform` en `.app-shell`/`.app-workspace`/`main`: los modales deben competir en el contexto raiz
- Rellenos blancos sobre fondo oscuro: no usar `bg-white` (el override dark lo convierte en superficie oscura); usar clase propia o style inline
- Service Worker (`public/sw.js`): NUNCA interceptar peticiones RSC (`?_rsc=`, cabecera `RSC`/`Next-Router-Prefetch`/`Next-Action`); al cambiar estrategias de cache, subir `CACHE_VERSION`
- Capas fijas: modales z-40/50, drawer movil 44/45, FAB 41, dock 40, aviso notificaciones 35, sidebar desktop 32, topbar 30. Un overlay fixed a pantalla completa dentro de una pagina debe llevar z-index explicito
- Nueva accion del FAB: añadirla en `QuickActionsFAB` con `dispatchFabAction("fab:x")` y recibirla en la pagina con `useFabAction("fab:x", handler)`

---

## 11. Nomenclatura hardware Palex

| Nombre correcto | Descripcion | Notas |
|----------------|-------------|-------|
| BC Robo | Automat dispensacion tubos | NO "BCRobot" ni "BC Robot" |
| Zebra MC | Terminal movil handheld | Ej: MC3300, MC9300 |
| Zebra Impresora | Impresora etiquetas codigos | Ej: ZD421, ZT411 |
| Reader RFID | Lector RFID fijo | Toma datos + corriente |
| Gateway BT | Gateway Bluetooth neveras | Toma datos + corriente |
| Mini-PC | PC industrial termografia | Toma datos + corriente |
| Nevera | Cadena frio muestras biologicas | RFID o BT |
| Pantalla | Monitor para mini-PC | Opcional |

### Sistema termografia (s_termo)
- "Solo temperatura (RFID)": sensor RFID + Reader RFID en lab
- "Solo ubicacion (BT)": sensor BT + Gateway BT en centros de salud
- "Temperatura y ubicacion": ambos combinados
- Infraestructura lab: 3 tomas datos + 3-4 enchufes

---

## 12. Deploy a produccion

### Checklist obligatorio
1. `git status` — todos los archivos staged
2. `npx tsc --noEmit` — cero errores
3. `npx next build` — recomendado si toca APIs o server components
4. `git push origin main` — Railway auto-despliega

### Railway
- Config: `railway.toml` (NO `railway.json`)
- Build: `npx prisma generate && next build`
- Start: `npx prisma db push --accept-data-loss && npm start`
- Healthcheck: `/api/health`, timeout 120s
- Vars: `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## 13. Reglas del asistente

1. Simplicidad primero (dev en solitario)
2. Mobile-first siempre
3. No insistir en deploy ni en push a GitHub
4. Usar skill UI/UX Pro Max para todo diseño visual
