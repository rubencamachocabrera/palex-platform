<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# Plataforma de gestion de proyectos hospitalarios — Guia del Proyecto

> Fuente de verdad para cada sesion de desarrollo.
> Ultima actualizacion: 2026-06-24.
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
- Rutas: `/dashboard`, `/hospitales`, `/visitas`, `/ventas/pipeline`, `/proyectos`, `/hardware`, `/mapa`, `/datos`, `/admin`, `/perfil`, `/llamadas`, `/recordatorios`
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
      proyectos/page.tsx                Lista proyectos + Kanban
      proyectos/[id]/page.tsx           Header + tabs selector (300 lineas, code-split)
      proyectos/[id]/types.ts           Interfaces, constantes, helpers compartidos
      proyectos/[id]/tabs/              10 tabs con next/dynamic
      hardware/page.tsx                 Tabs: Resumen/Inventario/Instalaciones/Catalogo/Alertas
      mapa/page.tsx                     Leaflet, coordenadas por ciudad
      datos/page.tsx                    KPIs explotacion (MOCKUP — sin API real)
      admin/                            CRUD: usuarios, zonas, hospitales, hardware, tags
      admin/log/page.tsx                Log de actividad (solo ADMIN)
      admin/equipo/page.tsx             Panel equipo — workload por usuario (solo ADMIN)
      admin/carga-trabajo/page.tsx      Heatmap mensual visitas (solo ADMIN)
      llamadas/page.tsx                 Registro de llamadas — CRUD, KPIs, filtros
      perfil/page.tsx                   Nombre + contrasena + notificaciones + sync calendario
    api/                                ~50 rutas con rate limiting + Zod validation
      search/route.ts                   Busqueda unificada. Cache 30s.
      hospitales/                       CRUD + contactos + timeline. Paginado (?limit=200&page=N)
      visitas/                          CRUD + comentarios. GET sin `datos`, ?desde=&hasta=
      proyectos/                        CRUD + fases + tareas + hitos + entradas + solicitudes + contactos + adjuntos + comentarios + modulos + share + excel
      hardware/                         CRUD + tipos + unidades
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
LogActividad, ConfigApp, PlantillaVisita, ModuloInlab
Oportunidad      (DESACTIVADO)
```

**Enums clave:** EstadoProyecto (5), EstadoModulo (5), TipoFase (11), TipoFavorito (2)

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
**Calidad:** Lighthouse 100/100/96/100, Playwright E2E 18 tests, dark mode completo, Sentry.
**Seguridad:** CSP (sin unsafe-eval), HSTS, IDOR, rate limiting ~50 rutas, Zod validation.
**Rendimiento:** SWR usePerfil() compartido, connection pool max:20, 15 indices DB, Redis rate-limit/presence.

---

## 8. Deuda tecnica activa

| Prioridad | Issue | Ubicacion |
|-----------|-------|-----------|
| ALTA | `/datos` es 100% mockup — sin APIs reales | datos/page.tsx |

---

## 9. Pendiente

### Activo
- [ ] `/datos` APIs reales (Sprint 14 aplazado)
- [ ] Object storage F5: migrar fotos/adjuntos de base64 en DB a R2/S3 (~2-3 dias, necesario antes de 20 usuarios concurrentes)
- [ ] bodyParser size limits en next.config.ts (bajo impacto)
- [ ] Dynamic imports para DnD, QR, ComentariosPanel, SignaturePad (bajo impacto)
- [ ] Cache servidor en Redis con TTL (bajo impacto)

### Backlog (no priorizado)
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
