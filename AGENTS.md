<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# INLAB PALEX PLATFORM — Guia del Proyecto

> Fuente de verdad para cada sesion de desarrollo.
> Ultima actualizacion: 2026-06-20 (sprint 12 en progreso — seguridad + colaboracion).

---

## 1. Stack tecnico (NO cambiar sin justificacion)

| Capa        | Tecnologia                                              |
|-------------|----------------------------------------------------------|
| Framework   | Next.js 14+ App Router, TypeScript estricto              |
| UI          | Tailwind CSS v4 + componentes propios (NO shadcn)        |
| DB          | PostgreSQL via Railway                                    |
| ORM         | Prisma 7 con `@prisma/adapter-pg`                        |
| Auth        | NextAuth.js v5 — `auth.config.ts` (Edge) + `auth.ts` (server) |
| Deploy      | Railway (auto-deploy desde `git push origin main`)       |
| Offline     | IndexedDB + Service Worker (PWA)                          |
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

### NextAuth v5
- `auth()` solo en servidor / server components / API routes
- NUNCA `useSession` — eliminado de toda la app
- Obtener rol en cliente: `fetch("/api/perfil")` → `d?.rol` (NO `d?.role`)
- Variables env: `AUTH_SECRET`, `AUTH_URL`

### URL routing
- Route group `(dashboard)` NO aparece en la URL
- Rutas: `/dashboard`, `/hospitales`, `/visitas`, `/ventas/pipeline`, `/proyectos`, `/hardware`, `/mapa`, `/datos`, `/admin`, `/perfil`
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
El modulo de ventas (oportunidades, pipeline Kanban, etapas) esta **100% desactivado**.
No mostrar selectores de oportunidad, no vincular visitas a oportunidades, no trabajar en nada CRM.
El codigo existe pero no se usa ni se debe tocar.

### Plantillas de visita
Existe un sistema de plantillas: una visita se puede guardar como plantilla y al crear una nueva
se puede seleccionar esa plantilla para pre-rellenar campos. NO implementar "duplicar visita" —
las plantillas ya cubren esa necesidad.

---

## 4. Estructura de ficheros

```
src/
  app/
    (auth)/login/page.tsx               Login split-screen animado
    (dashboard)/
      layout.tsx                        Sidebar + TopBar + KeyboardShortcutsProvider
      dashboard/page.tsx                Dashboard por rol + widget "Mi Dia"
      hospitales/page.tsx               Lista + filtro zona + grid/list + favoritos
      hospitales/[id]/page.tsx          Detalle: KPIs, tabs Contactos/Visitas/Timeline, QR
      visitas/page.tsx                  Lista + busqueda + filtros avanzados + quick-create modal
      visitas/calendario/page.tsx       Calendario mensual, dots por estado
      visitas/[id]/page.tsx             Formulario 13 secciones, titulo editable, fotos, PDF, offline
      ventas/pipeline/page.tsx          CRM pipeline (DESACTIVADO)
      proyectos/page.tsx                Lista proyectos (unificado)
      proyectos/[id]/page.tsx           Detalle: 10 tabs (Cockpit, Info, Fases, Tareas, Timeline, Materiales, Contactos, Visitas, Modulos, Adjuntos) + Resumen 360
      hardware/page.tsx                 Tabs: Resumen/Inventario/Instalaciones/Catalogo/Alertas
      mapa/page.tsx                     Leaflet, coordenadas por ciudad
      datos/page.tsx                    KPIs explotacion (MOCKUP — sin API real)
      admin/                            CRUD: usuarios, zonas, hospitales, hardware
      admin/log/page.tsx                Log de actividad (solo ADMIN)
      perfil/page.tsx                   Editar nombre + cambiar contrasena
    api/
      auth/[...nextauth]/route.ts
      search/route.ts                   Busqueda unificada (hospitales+visitas+proyectos). Cache 30s.
      hospitales/route.ts               GET (Cache 30s), POST
      hospitales/[id]/route.ts          GET (verifica zona no-ADMIN, take:50), PATCH (whitelist), DELETE
      hospitales/[id]/contactos/route.ts
      hospitales/[id]/timeline/route.ts
      visitas/route.ts                  GET select sin `datos` + titulo, ?desde=&hasta=, Cache 15s
      visitas/[id]/route.ts             GET con `datos` completo, PATCH titulo/datos/estado/fecha, DELETE
      visitas/[id]/comentarios/route.ts
      log-actividad/route.ts            GET logs paginados (solo ADMIN)
      proyectos/route.ts                GET + POST (acepta moduloIds, refConcurso)
      proyectos/[id]/route.ts           GET (incluye modulos) + PATCH (whitelist) + DELETE
      proyectos/[id]/fases/[faseId]/route.ts
      proyectos/[id]/tareas/route.ts
      proyectos/[id]/hitos/route.ts
      proyectos/[id]/entradas/route.ts
      proyectos/[id]/solicitudes/route.ts
      proyectos/[id]/contactos/route.ts
      proyectos/[id]/adjuntos/route.ts
      proyectos/[id]/comentarios/route.ts
      proyectos/[id]/modulos/route.ts        GET + POST (reemplaza modulos)
      proyectos/[id]/modulos/[moduloId]/route.ts  PATCH estado + DELETE
      proyectos/[id]/share/route.ts
      hardware/route.ts                 GET Cache 60s
      hardware/tipos/route.ts           HardwareTipo dinamico
      hardware/unidades/route.ts        GET Cache 30s, POST/PUT solo ADMIN+PROYECTOS
      modulos-inlab/route.ts            Catalogo modulos InLab
      oportunidades/route.ts            (DESACTIVADO — no usar)
      notificaciones/route.ts
      config/route.ts
      perfil/route.ts
      usuarios/route.ts
      zonas/route.ts
      health/route.ts
      share/[token]/route.ts            Proyecto publico (sin PII)
  components/
    Sidebar.tsx                         Dark #0f172a, colapsable 256/64px, nav por rol
    TopBar.tsx                          Busqueda global debounced, toggle dark/light, hint Cmd+K
    ThemeProvider.tsx                    dark/light, localStorage palex_theme, anti-FOUC
    CommandPalette.tsx                   Cmd+K, busca hospitales+visitas+proyectos
    KeyboardShortcutsProvider.tsx        Monta CommandPalette + atajos G+H/V/P/D
    ComentariosPanel.tsx                Sistema comentarios (dynamic import)
    Toast.tsx                           Global toast provider (god node: 42 edges)
    PageTransition.tsx
    OfflineIndicator.tsx
    ServiceWorkerRegistrar.tsx
    ui/
      EmptyState.tsx                    EmptyState() en todas las listas vacias
      Icons.tsx                         TODOS los iconos SVG (NO emojis)
      PageHeader.tsx
      Skeleton.tsx                      cn(), Skeleton, SkeletonCard, SkeletonKPI
    visitas/
      AnalisisPanel.tsx                 Score + riesgos
      PrintView.tsx                     PDF profesional Palex
      TodoChecklist.tsx
      VoiceNotes.tsx                    (dynamic import)
  hooks/
    useKeyboardShortcuts.ts             Cmd+K, G+H/V/P/D, Escape
    useOfflineSync.ts                   useOfflineSync(), useOnlineStatus(), SaveStatus
  lib/
    auth.config.ts                      Edge-compatible
    auth.ts                             Server-side NextAuth
    brand.ts                            TEAL=#00A99D, TEAL_LIGHT, TEAL_DARK, ORANGE=#F7941D
    csv.ts                              exportarCSV()
    db.ts                               Prisma singleton (SIEMPRE importar desde aqui)
    form-schema.ts                      FORM_SCHEMA: 13 secciones formulario visita
    img-compress.ts                     comprimirImagen() Canvas API
    offline-db.ts                       IndexedDB: openDB, saveDraft, getDraft, enqueueSync
    log-actividad.ts                    logActividad() — helper para registrar acciones
    presence.ts                         heartbeat/getActiveUsers/leave — presencia colaborativa in-memory
    rate-limit.ts                       checkRateLimit() (god node: 22 edges)
    visita-analysis.ts                  detectarRiesgos() + calcularScore() (score 0-100)
  middleware.ts                         Protege rutas, edge-compatible
  types/next-auth.d.ts                  Extiende Session, User, JWT con id, rol, nombre
prisma/
  schema.prisma                         Modelos: Hospital, Visita, Proyecto, Hardware...
public/
  logo-palex.png
  manifest.json                         PWA, theme #00A99D
  sw.js                                 Service Worker
```

---

## 5. Modelos Prisma principales

```
Usuario          (Rol enum: ADMIN|VENTAS|PROYECTOS|TECNICO)
Zona             (agrupacion de hospitales)
Hospital         (nombre, ciudad, provincia, tipo, camas, zona)
Contacto         (nombre, cargo, email, telefono, hospital)
Visita           (titulo?, hospitalId, tipo, estado, fecha, datos:JSON, score, fotos:JSON)
Oportunidad      (DESACTIVADO — pipeline CRM)
Proyecto         (@@map "pre_proyectos" — titulo, hospital, responsable, estado, fases, tareas, hitos, modulos, adjuntos, comentarios, refContrato, refConcurso, shareToken)
ProyectoModulo   (@@map "pre_proyectos_modulos" — pivot proyecto-modulo con EstadoModulo)
FaseProyecto     (@@map "fases_pre_proyectos" — tipo, nombre, orden, estado, fechas)
Hito             (titulo, fecha, completado)
Tarea            (titulo, estado, prioridad, subtareas anidadas)
EntradaTimeline  (evento/comentario/cita en timeline proyecto)
SolicitudMaterial(titulo, estado, lineas de material)
ProyectoContacto (@@map "pre_proyectos_contactos" — pivot proyecto-contacto)
Adjunto          (nombre, tipo, contenido base64)
HardwareTipo     (nombre, color hex — dinamico desde admin)
HardwareCatalogo (marca, modelo, referenciaPalex, tipoId @map("tipo_id"))
HardwareUnidad   (serie, estado: DISPONIBLE|ASIGNADO|EN_MANTENIMIENTO|RETIRADO|BAJA)
Comentario       (texto, autor, fecha — vinculado a visita o proyecto)
ModuloInlab      (nombre — catalogo de modulos InLab)
PlantillaVisita  (nombre, tipo, datos JSON)
ConfigApp        (clave/valor configuracion app)
LogActividad     (accion, entidad, entidadId, detalle, usuario, fecha — log ADMIN)
```

**Enums clave:**
- `EstadoProyecto`: NUEVO | EN_CURSO | PAUSADO | COMPLETADO | CANCELADO
- `EstadoModulo`: PENDIENTE | EN_INSTALACION | INSTALADO | FORMACION | VALIDADO
- `TipoFase`: 11 tipos (FIRMA_CONTRATO → SOPORTE_POST)

---

## 6. APIs — reglas importantes

- `/api/search`: busqueda unificada hospitales+visitas+proyectos. Cache 30s.
- `/api/visitas` GET: select SIN `datos` (JSON grande), incluye `titulo`. Acepta `?desde=&hasta=`. Cache 15s.
- `/api/visitas/[id]` GET: devuelve `datos` completo + relaciones.
- POST visita acepta: `hospitalId`, `tipo`, `titulo`, `fecha`, `datos`, `proyectoId`, `contactoPrincipalId`.
- PATCH visita acepta: `titulo`, `datos`, `estado`, `fecha`, `proyectoId`, `contactoPrincipalId`.
- POST proyecto acepta: `moduloIds` array + `refConcurso` ademas de campos base.
- GET proyecto incluye `modulos` con estado de cada modulo.
- `/api/presence` POST: heartbeat de presencia colaborativa (entityType, entityId). Devuelve activeUsers[].
- Seguridad: IDOR check en hospitales (zona), visitas (propietario + misma zona), proyectos (responsable + zona). Whitelist en PATCH.
- Acceso visitas: propietario, ADMIN, o usuarios en la misma zona del hospital.
- Acceso proyectos: responsable, ADMIN, o usuarios en la zona del hospital del proyecto.
- Rate limiting: checkRateLimit() en todas las APIs de lectura.

---

## 7. Estado actual — todo lo implementado (junio 2026)

### Auth y navegacion
- Login split-screen con shake en error
- Middleware edge-compatible en todas las rutas
- Sidebar dark colapsable, nav por rol (ADMIN va a /visitas, no /admin/visitas)
- TopBar con busqueda global, toggle dark/light, hint Cmd+K
- ThemeProvider dark/light con anti-FOUC
- Command Palette (Cmd+K) con busqueda hospitales+visitas+proyectos
- Atajos teclado: G+H/V/P/D, /, Escape

### Hospitales
- Lista con filtro zona, toggle grid/lista, busqueda, favoritos (localStorage)
- Detalle: KPIs visitas, tabs Contactos/Visitas/Timeline
- QR por hospital: generacion dinamica + descarga PNG
- Contactos: creables por todos, edit/delete solo ADMIN
- Timeline de actividad: historial cronologico completo

### Visitas
- Lista con titulo, busqueda (titulo/hospital/ciudad/tecnico), filtros avanzados (fecha/estado/tipo/zona), ordenacion 3 modos
- Quick-create modal estandarizado: titulo + hospital + tipo (RadioPills) + contacto principal + fecha + plantilla (disponible desde /visitas, ficha hospital y proyecto)
- Eliminar visita con confirmacion desde /visitas y ficha hospital
- Titulo editable en cabecera del formulario (guarda onBlur)
- Calendario mensual: dots por estado, crear con fecha pre-rellena, ?desde=&hasta=
- Formulario 13 secciones: fotos por seccion, auto-save IndexedDB, offline
- Seccion s_termo: neveras/termografia (RFID + BT), SubHeaders visuales
- PDF profesional Palex, export JSON, CSV con titulo
- Score complejidad 0-100, detectarRiesgos() 14 reglas
- TodoChecklist, Notas de voz (dynamic), Comentarios (dynamic)
- Vista resumen 360 con edicion inline
- Vinculacion visita -> proyecto con selector + progreso fases
- Edicion colaborativa: usuarios de la misma zona pueden ver/editar visitas simultaneamente
- Presencia en tiempo real: indicador de quien esta editando (heartbeat cada 8s, timeout 15s)
- Toast de actualizacion cuando otro usuario guarda cambios (polling cada 4s)

### Proyectos (unificado — antes PreProyecto + Proyecto separados)
- Lista + detalle con 10 tabs: Cockpit, Info, Fases, Tareas, Timeline, Materiales, Contactos, Visitas, Modulos, Adjuntos
- Resumen 360 del proyecto
- Fases con 11 tipos, tareas con subtareas, hitos con completado
- Timeline/diario con eventos, comentarios, citas
- Solicitudes de material con lineas y estados
- Modulos InLab: asignacion y seguimiento de estado (PENDIENTE → VALIDADO)
- Adjuntos, comentarios con fotos
- PDF via window.print() con branding Palex
- Link compartir publico con token criptografico (sin PII)
- Boton "Nueva visita" desde cabecera del proyecto
- Kanban drag-drop en lista de proyectos

### Hardware
- HardwareTipo dinamico con color hex desde admin
- HardwareCatalogo: referenciaPalex en teal monospace
- HardwareUnidad: estados, hospital asignado, garantia
- Tabs: Resumen/Inventario/Instalaciones/Catalogo/Alertas
- Admin: drawer lateral, color picker, card grid

### Dashboard
- Widget "Mi Dia" por rol:
  - VENTAS: visitas hoy + oportunidades proximas
  - PROYECTOS/TECNICO: tareas vencidas + visitas del dia
- KPIs por rol
- Accesos rapidos debajo de KPIs (links a hospitales, visitas, proyectos, etc.)

### Admin
- CRUD completo: usuarios, zonas, hospitales, hardware
- Export CSV
- Asignacion zonas a usuarios
- Log de actividad: registro de acciones (crear/editar/eliminar) con usuario, entidad y fecha

### Calidad tecnica
- Brand tokens en brand.ts (TEAL, ORANGE — importar, NO hardcodear)
- SVG icons en todo (NO emojis)
- EmptyState + Skeleton shimmer en todas las listas
- Rate limiting in-memory
- Cache-Control HTTP en APIs de lectura
- Error boundaries (error.tsx) en 15 rutas + global-error.tsx con Sentry
- Sentry error tracking: client/server/edge configs, instrumentation.ts, captureException en boundaries
- Seguridad: IDOR zona+responsable, mass assignment whitelist, crypto tokens, iframe sandbox
- Presencia colaborativa in-memory (presence.ts) — sin dependencias externas
- PWA: manifest + SW + IndexedDB
- Dark mode completo: containers, modales, drawers, tablas, inputs, loading skeletons, CommandPalette
- Dark mode: globals.css con overrides !important para bg, text, borders, hover, sombras, inputs, scrollbar
- Dark mode: hover states de colores de estado (red-50, teal-50, amber-50, etc.) con overrides globales
- Dark mode: RadioPills/CheckPills usan clases CSS en vez de inline styles (compatible dark mode)
- Animaciones: skeleton-shimmer, stagger-grid (KPIs, hospital cards), card-hover lift, stagger-nav
- Playwright E2E: auth setup, visitas (5 tests), proyectos (4 tests), navegacion (9 tests), mobile viewport

---

## 8. Deuda tecnica y bugs conocidos

| Prioridad | Issue | Ubicacion | Estado |
|-----------|-------|-----------|--------|
| ALTA | `/datos` es 100% mockup — no hay APIs reales | datos/page.tsx | PENDIENTE |
| ~~ALTA~~ | ~~`mapaHtml` XSS via iframe sandbox~~ | ~~iframe srcDoc~~ | CORREGIDO (sandbox sin allow-same-origin) |
| ~~ALTA~~ | ~~`GET /api/proyectos` sin filtro de zona~~ | ~~api/proyectos/route.ts~~ | CORREGIDO (filtro zona + responsable) |
| ~~ALTA~~ | ~~Comentarios visita sin verificar acceso padre~~ | ~~api/visitas/[id]/comentarios~~ | CORREGIDO (zona + propietario) |
| ~~ALTA~~ | ~~Fases proyecto sin verificar pertenencia~~ | ~~api/proyectos/[id]/fases~~ | CORREGIDO (responsableId check) |
| ~~ALTA~~ | ~~Contactos proyecto sin IDOR check~~ | ~~api/proyectos/[id]/contactos~~ | CORREGIDO (responsableId check) |
| ~~MEDIA~~ | ~~Dark mode incompleto en algunos drawers (estilos inline)~~ | ~~varios~~ | CORREGIDO (20+ paginas actualizadas) |
| MEDIA | `Tarea.asignadoA` es String libre, no FK a Usuario | schema.prisma | PENDIENTE |
| BAJA | `CACHE_VERSION = 'palex-v1'` hardcodeado en SW | public/sw.js | PENDIENTE |
| BAJA | JWT sin `maxAge` explicito (default 30 dias NextAuth) | auth.ts | PENDIENTE |

---

## 9. Pendiente — proximos sprints

### Sprint 11 — UX y funcionalidad (COMPLETADO)
- [x] Eliminar visitas desde /visitas y ficha hospital (con confirmacion)
- [x] Fix dropdown nueva visita — selectores ajustados, overflow corregido
- [x] Navegacion contextual "Volver" — breadcrumb dinamico segun origen (proyecto → hospital → volver al proyecto)
- [x] Rediseño ancho detalle proyecto — overflow-x-hidden, eliminado scroll horizontal
- [x] Dashboard: accesos rapidos debajo de los 4 KPIs (por rol)
- [x] Estandarizar creacion visitas — modal unico con titulo + fecha + plantilla desde /visitas, hospital y proyecto
- [x] Log de actividad solo ADMIN — modelo Prisma + API + pagina admin + logging en crear/eliminar visitas, hospitales y proyectos

### Sprint 12 — Seguridad, colaboracion y robustez (COMPLETADO)
- [x] XSS mapaHtml — sandbox iframe sin allow-same-origin (aislamiento scripts)
- [x] Filtro de zona en GET /api/proyectos (AND con OR zona + responsable)
- [x] Filtro de zona en GET /api/proyectos/[id] (zona del hospital)
- [x] IDOR comentarios visita — acceso por zona + propietario
- [x] IDOR fases proyecto — verificar responsableId
- [x] IDOR contactos proyecto — verificar responsableId (POST + DELETE)
- [x] Acceso visitas por zona — GET/PATCH/DELETE permiten usuarios de la misma zona
- [x] Edicion colaborativa visitas — presencia en tiempo real (heartbeat + polling)
- [x] API /api/presence — tracking de usuarios activos por entidad (in-memory)
- [x] Notificacion dropdown responsive en movil (w-96 → responsive)
- [x] Sentry para errores en produccion (client/server/edge + global-error boundary)

### Sprint 13 — Calidad y testing (EN PROGRESO)
- [ ] Lighthouse audit (objetivo >90)
- [x] Tests E2E con Playwright (auth setup + visitas 5 tests + proyectos 4 tests + navegacion 9 tests + mobile viewport)
- [x] Dark mode completo en drawers/modales (20+ paginas: admin, hardware, hospitales, visitas, proyectos, perfil, loading skeletons, CommandPalette)
- [x] Pulido visual global: skeleton-shimmer, card-hover, stagger-grid, hover states dark mode, RadioPills/CheckPills sin inline styles, calendario dark fix
- [x] Modal nueva visita mejorado: tipo de visita (RadioPills) + contacto principal con auto-seleccion
- [x] Auditoria responsive completa movil: calendario stacking, admin tables overflow-x-auto, grids mobile-first, filter pills dark mode

### Sprint 14 — Datos reales
- [ ] Conectar /datos a APIs reales (sustituir mockup)
- [ ] KPIs de rendimiento por usuario/zona (solo ADMIN)

### Backlog — features futuras (no priorizado)
- [ ] Notificaciones por email (asignaciones, tareas nuevas) — Resend o similar
- [ ] Dashboard carga de trabajo — heatmap mensual visitas por tecnico (ADMIN)
- [ ] Alertas mantenimiento hardware — garantia expirada, tiempo sin revision
- [ ] Favoritos/Acceso rapido — estrella en hospitales y proyectos
- [ ] Panel de equipo (ADMIN) — quien hace que
- [ ] Etiquetas/Tags para hospitales y visitas
- [ ] Exportar proyecto a Excel formateado
- [ ] Modo campo simplificado (movil)
- [ ] Firma digital del cliente en PDF
- [ ] Notificaciones push del navegador
- [ ] Sincronizacion calendario (iCal)
- [ ] Onboarding guiado nuevo usuario
- [ ] Vista Gantt de fases
- [ ] Registro rapido de llamada
- [ ] Mencion @usuario en comentarios
- [ ] Hospitales relacionados / Grupo
- [ ] Recordatorios personales

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
- EmptyState en todas las listas vacias
- Skeleton shimmer en todas las cargas
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
- Vars: `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`

---

## 13. Reglas del asistente

1. Simplicidad primero (dev en solitario)
2. Mobile-first siempre
3. No insistir en deploy ni en push a GitHub
4. Usar skill UI/UX Pro Max para todo diseño visual
