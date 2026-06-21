# CONTEXT — InLab Palex Platform
> Resumen compacto del proyecto. Actualizado sprint 18 (junio 2026).
> Commit base: `19c022e` (20 jun 2026 — sprint 18 completado)

---

## 1. Que es el proyecto

Plataforma interna de **Palex Medical** para gestion de proyectos hospitalarios.
Nombre comercial: **InLab**. Uso privado, acceso restringido por rol.
- URL produccion: `https://palex-platform-production.up.railway.app`
- Deploy automatico desde `git push origin main` → Railway

---

## 2. Stack tecnico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 14+ App Router, TypeScript estricto |
| UI | Tailwind CSS v4 + componentes propios (NO shadcn) |
| Base de datos | PostgreSQL en Railway |
| ORM | Prisma 7 con `@prisma/adapter-pg` (NO `url` en datasource) |
| Auth | NextAuth.js v5 — `auth.config.ts` (Edge) + `auth.ts` (server) |
| Deploy | Railway (`railway.toml`) — build: `prisma generate + next build` |
| Offline | IndexedDB (`offline-db.ts`) + Service Worker (`public/sw.js`) |

---

## 3. Estructura de archivos clave

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          ← Split-screen login: panel teal izquierdo + form blanco
│   │   └── login/page.tsx      ← Formulario con NextAuth signIn(), shake en error
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← DashboardLayout: Sidebar + TopBar + KeyboardShortcutsProvider
│   │   ├── dashboard/page.tsx  ← Dashboard por rol + acciones rapidas campo + recordatorios hoy
│   │   ├── recordatorios/page.tsx ← CRUD recordatorios personales (grupos vencidos/hoy/proximos)
│   │   ├── hospitales/
│   │   │   ├── page.tsx        ← Lista + filtro zona + grid/list + favoritos
│   │   │   └── [id]/page.tsx   ← Detalle: KPIs, tabs Contactos/Visitas/Timeline
│   │   ├── visitas/
│   │   │   ├── page.tsx        ← Lista + busqueda + quick-create modal
│   │   │   ├── calendario/page.tsx ← Vista mensual con dots por estado
│   │   │   └── [id]/page.tsx   ← Formulario 13 secciones, fotos, PDF, offline
│   │   ├── ventas/pipeline/    ← CRM Kanban (DESACTIVADO)
│   │   ├── proyectos/
│   │   │   ├── page.tsx        ← Lista proyectos + Kanban
│   │   │   └── [id]/page.tsx   ← Detalle: 10 tabs + Resumen 360
│   │   ├── hardware/page.tsx   ← Tabs: Resumen/Inventario/Instalaciones/Catalogo/Alertas
│   │   ├── llamadas/page.tsx    ← Registro rapido de llamadas (CRUD, KPIs, filtros)
│   │   ├── admin/              ← CRUD: usuarios, zonas, hospitales, hardware + log + equipo + carga-trabajo
│   │   ├── mapa/               ← Leaflet (MapaLeaflet), coordenadas por ciudad
│   │   ├── datos/              ← KPIs explotacion de datos (MOCKUP)
│   │   └── perfil/page.tsx     ← Editar nombre + contrasena + notificaciones + sync calendario
│   ├── api/
│   │   ├── search/             ← Busqueda unificada hospitales+visitas+proyectos
│   │   ├── hospitales/         ← CRUD + contactos + timeline
│   │   ├── visitas/            ← CRUD + comentarios
│   │   ├── proyectos/          ← CRUD + fases + tareas + hitos + entradas + solicitudes + contactos + adjuntos + comentarios + modulos + share
│   │   ├── hardware/           ← CRUD + tipos + unidades
│   │   ├── modulos-inlab/      ← Catalogo modulos InLab
│   │   ├── favoritos/          ← GET (?tipo) + POST toggle (create/delete)
│   │   ├── calendario/ical/    ← Feed .ics (visitas, recordatorios, hitos) con HMAC token
│   │   ├── proyectos/[id]/excel/ ← Export Excel 6 hojas (xlsx)
│   │   ├── admin/carga-trabajo/ ← Heatmap visitas por usuario/dia (solo ADMIN)
│   │   ├── llamadas/           ← CRUD registro de llamadas
│   │   └── ...                 ← auth, config, perfil, usuarios, zonas, health, share, notificaciones
│   └── globals.css             ← Tailwind v4, dark mode via clase .dark, tokens CSS
├── components/
│   ├── Sidebar.tsx             ← Dark #0f172a, colapsable 256/64px, nav por ROL
│   ├── TopBar.tsx              ← Busqueda global debounced, toggle dark/light, notificaciones
│   ├── ThemeProvider.tsx       ← Context dark/light, localStorage palex_theme, anti-FOUC
│   ├── CommandPalette.tsx      ← Cmd+K, busca hospitales+visitas+proyectos, cache 60s
│   ├── MentionInput.tsx        ← Textarea con @menciones dropdown, debounced, keyboard nav
│   ├── MentionText.tsx         ← Renderiza @[id:Nombre] como pills teal
│   ├── TagSelector.tsx         ← Selector/pills de tags con colores + TagPills read-only
│   ├── BottomNav.tsx           ← Nav movil 5 tabs (glass effect, safe area, TEAL active)
│   ├── OnboardingWizard.tsx    ← Tour 6 pasos con SVG, slide animations, keyboard nav
│   ├── NotificationManager.tsx ← Browser Notification API, permission banner, polling 60s
│   ├── AlertasPanel.tsx        ← Panel de alertas reutilizable (admin + proyectos variants)
│   ├── Toast.tsx               ← Global ToastProvider + useToast() (god node: 42 edges)
│   └── ui/                     ← EmptyState, Icons (SVG), PageHeader, Skeleton
├── hooks/
│   ├── useKeyboardShortcuts.ts ← Cmd+K, G+H/V/P/D, Escape
│   ├── useOfflineSync.ts       ← useOfflineSync(), useOnlineStatus(), SaveStatus
│   └── useFavoritos.ts         ← DB-backed favoritos hook (optimistic updates, rollback)
├── lib/
│   ├── auth.config.ts          ← Edge-compatible
│   ├── auth.ts                 ← Server-side NextAuth
│   ├── brand.ts                ← TEAL=#00A99D, ORANGE=#F7941D (SIEMPRE importar)
│   ├── db.ts                   ← Prisma singleton (SIEMPRE importar desde aqui)
│   ├── form-schema.ts          ← FORM_SCHEMA: 13 secciones formulario visita
│   ├── calendar-token.ts        ← HMAC-SHA256 tokens para iCal auth (deterministic)
│   ├── log-actividad.ts        ← logActividad() helper para registrar acciones
│   ├── presence.ts             ← heartbeat/getActiveUsers/leave — presencia colaborativa
│   ├── rate-limit.ts           ← checkRateLimit() (god node: 22 edges)
│   └── visita-analysis.ts      ← detectarRiesgos() + calcularScore() (score 0-100)
├── instrumentation.ts          ← Sentry nodejs/edge runtime registration + onRequestError
├── middleware.ts               ← Protege rutas, edge-compatible
└── types/next-auth.d.ts        ← Extiende Session, User, JWT con id, rol, nombre
sentry.client.config.ts         ← Sentry client init (DSN from env, tracesSampleRate 0.2)
sentry.server.config.ts         ← Sentry server init
sentry.edge.config.ts           ← Sentry edge init
e2e/                            ← Playwright E2E tests
├── auth.setup.ts               ← Shared auth (saves storageState)
├── visitas.spec.ts             ← 5 tests: lista, busqueda, modal, detalle, calendario
├── proyectos.spec.ts           ← 4 tests: lista, kanban, detalle tabs, navegacion
└── navegacion.spec.ts          ← 9 tests: dashboard, sidebar, Cmd+K, dark mode, mobile
```

---

## 4. Roles del sistema

```
ADMIN      → acceso total
VENTAS     → dashboard, hospitales, pipeline CRM (DESACTIVADO)
PROYECTOS  → dashboard, mis hospitales, mis visitas, calendario, proyectos
TECNICO    → igual que PROYECTOS
```

Obtener rol en cliente: `fetch("/api/perfil")` — **NUNCA** `useSession` (eliminado).

---

## 5. Base de datos — Prisma 7

**CRITICO:**
- NO usar `url` en bloque `datasource` (usa adapter-pg)
- Siempre importar Prisma desde `@/lib/db.ts`
- `npx prisma db push` para cambios (nunca `migrate` en produccion sin revisar)
- `npx prisma generate` despues de cada cambio en `schema.prisma`
- Config real en `prisma.config.ts` (raiz)

**Modelo Proyecto (unificado):**
- Prisma: `model Proyecto` con `@@map("pre_proyectos")` — tabla DB sigue siendo `pre_proyectos`
- Acceso: `db.proyecto.findMany(...)` (NO `db.preProyecto`)
- FK en modelos hijos: `proyectoId @map("preProyectoId")` — columna DB sigue siendo `preProyectoId`
- Enum: `EstadoProyecto` (NUEVO, EN_CURSO, PAUSADO, COMPLETADO, CANCELADO)
- Modelos relacionados: `FaseProyecto`, `ProyectoModulo`, `ProyectoContacto` (todos con @@map a tablas originales)

**Modelos principales:**
```
Proyecto (@@map "pre_proyectos"), FaseProyecto, ProyectoModulo, ProyectoContacto
Hospital, Contacto, Visita (datos: JSON), Oportunidad (DESACTIVADO)
Hito, Tarea (subtareas), EntradaTimeline, SolicitudMaterial, Adjunto
HardwareTipo, HardwareCatalogo, HardwareUnidad
Usuario, Zona, ModuloInlab, Comentario (mencionIds: Json), PlantillaVisita, ConfigApp
LogActividad (accion, entidad, usuario, fecha — solo ADMIN)
Tag (nombre, color, tipo: VISITA|PROYECTO), VisitaTag, ProyectoTag
Recordatorio (titulo, descripcion?, fecha, completado, usuario)
Favorito (usuarioId, entidadId, tipo: TipoFavorito, @@unique [usuarioId,entidadId,tipo])
RegistroLlamada (hospital, contacto?, usuario, fecha, duracion, asunto, notas, resultado, seguimiento)
```

---

## 6. API Routes principales

```
/api/search                ← Busqueda unificada hospitales+visitas+proyectos (Cache 30s)
/api/hospitales            ← GET (Cache 30s), POST
/api/hospitales/[id]       ← GET, PATCH (whitelist), DELETE
/api/visitas               ← GET select sin `datos`, ?desde=&hasta= (Cache 15s)
/api/visitas/[id]          ← GET con `datos` completo, PATCH, DELETE
/api/log-actividad         ← GET logs paginados (solo ADMIN, no-store)
/api/proyectos             ← GET + POST (acepta moduloIds, refConcurso)
/api/proyectos/[id]        ← GET (incluye modulos) + PATCH + DELETE
/api/proyectos/[id]/modulos         ← GET + POST (reemplaza modulos)
/api/proyectos/[id]/modulos/[id]    ← PATCH estado + DELETE
/api/proyectos/[id]/fases/[id]      ← PATCH estado (auto-actualiza estado proyecto)
/api/proyectos/[id]/tareas          ← CRUD tareas con subtareas
/api/proyectos/[id]/hitos           ← CRUD hitos
/api/proyectos/[id]/entradas        ← Timeline eventos/comentarios/citas
/api/proyectos/[id]/solicitudes     ← Material requests
/api/proyectos/[id]/contactos       ← Pivot proyecto-contacto
/api/proyectos/[id]/adjuntos        ← Upload/download archivos
/api/proyectos/[id]/comentarios     ← Comentarios con fotos
/api/proyectos/[id]/share           ← Generar/revocar token publico
/api/hardware              ← GET Cache 60s
/api/hardware/tipos        ← HardwareTipo dinamico
/api/hardware/unidades     ← GET Cache 30s, POST/PUT
/api/modulos-inlab         ← Catalogo modulos InLab
/api/share/[token]         ← Proyecto publico (sin PII)
/api/tags                  ← GET (filtro ?tipo), POST (solo ADMIN)
/api/tags/[id]             ← PATCH (whitelist), DELETE (solo ADMIN)
/api/usuarios/menciones    ← GET busqueda usuarios para @menciones (Cache 30s)
/api/onboarding            ← GET/PATCH estado onboarding usuario
/api/recordatorios         ← GET (filtro ?pendientes), POST
/api/recordatorios/[id]    ← PATCH (whitelist), DELETE (ownership check)
/api/favoritos             ← GET (?tipo=HOSPITAL|PROYECTO), POST toggle create/delete
/api/calendario/ical       ← Feed .ics (visitas, recordatorios, hitos) con HMAC token
/api/proyectos/[id]/excel  ← Export Excel 6 hojas (xlsx)
/api/llamadas              ← GET lista + POST crear (filtro zona, ?desde=&hasta=)
/api/llamadas/[id]         ← GET, PATCH (whitelist), DELETE (owner o ADMIN)
/api/admin/carga-trabajo   ← GET heatmap visitas/usuario/dia (?mes=YYYY-MM, solo ADMIN)
/api/presence              ← POST heartbeat presencia colaborativa (activeUsers[])
/api/notificaciones        ← Alertas por rol
/api/perfil                ← { rol, onboardingCompletado, calendarToken } — usar d?.rol
/api/config                ← GET/PATCH configuracion app
/api/health                ← Healthcheck Railway
```

---

## 7. URL routing — CRITICO

El route group `(dashboard)` NO anade nada a la URL:
```
/dashboard      /hospitales      /visitas
/proyectos      /hardware        /mapa
/datos          /admin           /perfil
/llamadas       /recordatorios
```
**NO existe** `/pre-proyectos` — todo unificado en `/proyectos`.
**NO usar** `/dashboard/hospitales`, `/dashboard/visitas`, etc.

---

## 8. UI/UX — Reglas criticas

```typescript
import { TEAL, TEAL_LIGHT, TEAL_DARK, ORANGE, ORANGE_LIGHT, ORANGE_DARK } from "@/lib/brand"
```

- `"use client"` debe ser la PRIMERA linea (sin nada antes)
- Iconos: SIEMPRE SVG de `src/components/ui/Icons.tsx` (NO emojis)
- Tap targets movil: minimo 44px altura
- `EmptyState()` en todas las listas vacias
- `Skeleton` shimmer en todas las cargas
- `useToast()` para feedback — god node mas conectado (42 edges)
- Dark mode: clase `.dark` en `<html>`, variables CSS, `@variant dark` en Tailwind v4

---

## 9. Estado actual (junio 2026)

**Completado (sprints 1-18 + hardening corporativo):**
- Auth completa (login con brute-force protection 5/min por IP, middleware edge, roles, JWT maxAge 7d)
- Hospitales: lista, detalle, contactos, timeline, QR, favoritos (DB-backed, cross-device)
- Visitas: titulo editable, formulario 13 secciones, calendario, PDF, offline, analisis, comentarios
- Visitas: eliminar con confirmacion, modal estandarizado creacion (titulo + tipo + contacto + fecha + plantilla)
- Visitas: edicion colaborativa con presencia en tiempo real (misma zona), firma digital cliente/tecnico
- Proyectos (UNIFICADO): 10 tabs, fases, tareas (asignadas por FK), hitos, timeline, materiales, contactos, modulos InLab, adjuntos, Resumen 360, Kanban, share publico, export Excel 6 hojas
- Hardware: tipos dinamicos, catalogo, inventario, alertas garantia/mantenimiento, drawer admin
- Admin: CRUD completo, export CSV, log actividad, panel equipo, heatmap carga trabajo, gestion tags
- Dashboard: KPIs por rol, widget "Mi Dia" (visitas+tareas+recordatorios+llamadas+favoritos), accesos rapidos
- Busqueda: global, CommandPalette (Cmd+K), filtros avanzados
- Llamadas: CRUD, KPIs, filtros, cards expandibles, tab en hospital, dashboard Mi Dia
- Comentarios: @menciones con dropdown debounced, keyboard nav, pills teal, notificaciones TopBar
- Grupos hospitalarios: FK auto-referencial, cabecera con centros, banner, indicadores lista
- Modo campo movil: BottomNav 5 tabs (glass, safe area, TEAL), acciones rapidas dashboard
- Onboarding: wizard 6 pasos SVG, slide animations, keyboard nav, admin reset
- Recordatorios: CRUD inline, grupos temporales, notificaciones TopBar, dashboard Mi Dia
- Favoritos DB-backed: toggle optimistic, cross-device, integrado en hospitales y proyectos
- Notificaciones navegador: Browser Notification API, polling 60s, preferencias en perfil
- Sincronizacion calendario iCal: HMAC tokens, feed .ics, URL copiable en perfil
- Seguridad: IDOR zona+responsable, CSP (sin unsafe-eval), HSTS 1 año, brute-force login, whitelist PATCH
- Sentry error tracking (client/server/edge + global-error boundary + instrumentation)
- Playwright E2E: 18 tests + auth setup + mobile viewport
- Dark mode completo: 20+ paginas, hover states, RadioPills/CheckPills CSS
- Lighthouse: Performance 100, Accessibility 100, Best Practices 96, SEO 100
- PWA: manifest + SW (network-first) + IndexedDB
- BD optimizada: connection pooling max:20, 15 indices en FKs frecuentes

**CRM / Pipeline comercial: DESACTIVADO.**

**Deuda tecnica resuelta:** XSS sandbox, IDOR 5 rutas, dark mode, Tarea FK, JWT maxAge, CSP, HSTS, brute-force, pooling, indices. Unica pendiente: `/datos` es mockup (Sprint 14 aplazado).

**Pendiente: Ver AGENTS.md seccion 9 (roadmap corporativo fases 3-9 + backlog).**

**Roadmap corporativo (auditoria junio 2026) — ~6-8 dias restantes:**
- ~~F1 Seguridad critica — COMPLETADA~~
- ~~F2 BD optimizacion — COMPLETADA~~
- ~~F3 Redis (Upstash) para rate-limit + presence — COMPLETADA~~ (env: UPSTASH_REDIS_REST_URL/TOKEN)
- ~~F4 Paginacion hospitales + proyectos — COMPLETADA~~ (limit/page/X-Total-Count + cargar mas)
- F5 Object storage (2-3d): fotos/adjuntos de base64-en-DB a R2/S3 — PRE-SCALING
- F6 Validacion (2d): Zod + rate limit global 70 rutas — PROGRESIVO
- F7 Code splitting (1d): proyectos/[id] 4900 lineas → tabs dinamicos — PROGRESIVO
- F8 Frontend perf (1-2d): SWR, useReducer visita, polling SSE — PROGRESIVO
- F9 JWT revocacion (2h): check usuario.activo en callback jwt — PROGRESIVO
