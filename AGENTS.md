<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# Plataforma de gestion de proyectos hospitalarios — Guia del Proyecto

> Fuente de verdad para cada sesion de desarrollo.
> Ultima actualizacion: 2026-07-01 (Sprint 17).
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
- Rutas: `/dashboard`, `/hospitales`, `/visitas`, `/ventas/pipeline`, `/proyectos`, `/hardware`, `/incidencias`, `/mapa`, `/datos`, `/admin`, `/perfil`, `/llamadas`, `/recordatorios`, `/notas`, `/actividad`
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

### Incidencias / Helpdesk
Activable/desactivable desde admin/configuracion (ConfigApp.incidenciasActivo).
Sidebar lo muestra/oculta automaticamente. Los datos persisten al desactivar.

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
      admin/                            CRUD: usuarios, zonas, hospitales, hardware, tags
      admin/log/page.tsx                Log de actividad (solo ADMIN)
      admin/equipo/page.tsx             Panel equipo — workload por usuario (solo ADMIN)
      admin/carga-trabajo/page.tsx      Heatmap mensual visitas (solo ADMIN)
      incidencias/page.tsx              Helpdesk: lista + filtros + KPIs + crear modal
      incidencias/[id]/page.tsx         Detalle incidencia + timeline eventos + SLA
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
      incidencias/                      CRUD + eventos. Helpdesk HW/SW, SLA, timeline
      llamadas/                         CRUD con IDOR zona
      tags/, recordatorios/, favoritos/, calendario/ical/, onboarding/, presence/, notificaciones/
      perfil/                           { rol, onboardingCompletado, calendarToken }
  components/
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
    ui/EmptyState.tsx, Icons.tsx, PageHeader.tsx, Skeleton.tsx
    visitas/AnalisisPanel.tsx, PrintView.tsx, SignaturePad.tsx, VoiceNotes.tsx
  hooks/
    useKeyboardShortcuts.ts, useOfflineSync.ts, useFavoritos.ts, usePerfil.ts (SWR)
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
RegistroLlamada  (hospital, contacto?, usuario, duracion, asunto, resultado, seguimiento)
Incidencia       (codigo, titulo, tipo HW/SW, categoria, prioridad, estado, SLA, hospital, HW unidad, coasignadosIds JSON [{id,nombre}], slaPausadoEn DateTime?, slaPausadoMs Int)
EventoIncidencia (tipo 11 enum, descripcion, duracion?, privado, fotos JSON?, editadoPor?, editadoEn?, incidencia, autor)
RespuestaRapidaIncidencia (texto, categoria?, orden, activo) @@map("respuestas_rapidas_incidencia")
LogActividad, ConfigApp (crmActivo, incidenciasActivo), PlantillaVisita, ModuloInlab
NotaEquipo (texto, autorId, mencionIds JSON, fijada, creadoEn) @@map("notas_equipo") — notas del equipo accesibles a todos los roles
Oportunidad      (DESACTIVADO)
```

**Enums clave:** EstadoProyecto (5), EstadoModulo (5), TipoFase (11), TipoFavorito (2), TipoIncidencia (2), CategoriaIncidencia (10), PrioridadIncidencia (4), EstadoIncidencia (6), TipoEventoIncidencia (11)

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
- equipoResponsable enum: SERVICIO_TECNICO | APLICACIONES | COMERCIAL | MARKETING | PROYECTOS (5 equipos, NO "AMBOS")
- KPIs lista: usar `totales` (fetch sin filtros) para contadores globales; `items` solo para la lista filtrada.
- Lista incidencias: ordenacion client-side (fecha/SLA/hospital/titulo). Agrupacion por prioridad collapsible. Drawer lateral para detalle rapido. QuickAssign inline desde lista.

---

## 7. Funcionalidades implementadas (resumen)

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
**Calidad:** Lighthouse 100/100/96/100, Playwright E2E 18 tests, dark mode completo, Sentry.
**Seguridad:** CSP (sin unsafe-eval), HSTS, IDOR, rate limiting ~50 rutas, Zod validation. /notas /actividad /incidencias protegidos en middleware Edge.
**Rendimiento:** SWR usePerfil() compartido, connection pool max:20, 15 indices DB, Redis rate-limit/presence/menciones. @dnd-kit dynamic import (no en bundle inicial /proyectos).

---

## 8. Deuda tecnica activa

| Prioridad | Issue | Ubicacion |
|-----------|-------|-----------|
| ALTA | `/datos` es 100% mockup — sin APIs reales | datos/page.tsx |
| ALTA | Object storage: fotos/adjuntos en base64 en DB — necesario antes de 20 usuarios | Bloqueado (requiere R2/S3) |

---

## 9. Pendiente

### Activo (bloqueado por dependencias externas)
- [ ] `/datos` APIs reales — aplazado, pendiente definir fuente de datos
- [ ] Object storage: migrar fotos/adjuntos de base64 en DB a R2/S3 (~2-3 dias, bloqueado)

### Activo (pendiente tecnico menor)
- [ ] Dynamic imports para QR, ComentariosPanel, SignaturePad (DnD ya hecho)
- [ ] bodyParser size limits — no aplica en Next.js 16.x a nivel config; pendiente revisar alternativa por ruta

### Backlog — Features nuevas (priorizadas por impacto/esfuerzo)
- [x] Plantillas de proyecto inteligentes — IMPLEMENTADO (Sprint 16)
- [x] Panel de notas del equipo — IMPLEMENTADO (Sprint 16)
- [x] Timeline global de actividad — IMPLEMENTADO (Sprint 16)
- [x] Scoring de hospitales — IMPLEMENTADO (Sprint 17)
- [x] Modo presentacion proyecto — IMPLEMENTADO (Sprint 17)
- [ ] Briefing matutino automatico (email + tarjeta dashboard "Tu dia")
- [ ] Quick Actions flotantes por contexto (FAB adaptativo segun pagina)
- [ ] Comparador de periodos (deltas + sparklines vs mes/trimestre anterior)
- [ ] Pasaporte hardware (pagina publica QR con historial completo por unidad)
- [ ] Resumen semanal ADMIN (email lunes con KPIs, tendencias, top performer)
- [ ] Ruta optimizada mapa (ordenar visitas del dia por proximidad geografica)
- [ ] Check-in/Check-out hospitales (registro tiempo en campo por hospital)

### Backlog — Incidencias (modulo aparte, no priorizado)
- [ ] Vinculacion entre incidencias (DUPLICADA, RELACIONADA, CAUSA_RAIZ) — modelo IncidenciaRelacion
- [ ] Metricas rendimiento por tecnico (tiempo medio resolucion, cumplimiento SLA %)
- [ ] Notificacion automatica al cambiar estado (al reportador y al asignado)
- [ ] Recurrencia / reapertura automatica (detectar patron hospital+equipo+categoria)
- [ ] Escalado con reglas automaticas (CRITICA >4h sin asignar → auto-escalar + notificar ADMIN)

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
