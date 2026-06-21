<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# INLAB PALEX PLATFORM — Guia del Proyecto

> Fuente de verdad para cada sesion de desarrollo.
> Ultima actualizacion: 2026-06-20 (sprint 18 completado — heatmap, alertas HW, firma digital, llamadas).

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
      layout.tsx                        Sidebar + TopBar + KeyboardShortcutsProvider + OnboardingWizard + BottomNav
      dashboard/page.tsx                Dashboard por rol + widget "Mi Dia" + acciones rapidas campo
      recordatorios/page.tsx            CRUD recordatorios personales (grupos: vencidos/hoy/proximos/completados)
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
      admin/equipo/page.tsx             Panel de equipo — workload por usuario (solo ADMIN)
      admin/carga-trabajo/page.tsx      Heatmap mensual visitas por tecnico (solo ADMIN)
      llamadas/page.tsx                 Registro rapido de llamadas — CRUD, KPIs, filtros
      perfil/page.tsx                   Editar nombre + cambiar contrasena + notificaciones + sync calendario
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
      favoritos/route.ts                 GET (?tipo filter) + POST toggle (create/delete)
      calendario/ical/route.ts           Feed .ics (visitas, recordatorios, hitos) con HMAC token
      hardware/route.ts                 GET Cache 60s
      hardware/tipos/route.ts           HardwareTipo dinamico
      hardware/unidades/route.ts        GET Cache 30s, POST/PUT solo ADMIN+PROYECTOS
      modulos-inlab/route.ts            Catalogo modulos InLab
      proyectos/[id]/excel/route.ts      Export Excel 6 hojas (xlsx)
      admin/carga-trabajo/route.ts     Heatmap datos visitas por usuario/dia (solo ADMIN)
      llamadas/route.ts                GET lista + POST crear llamada
      llamadas/[id]/route.ts           GET, PATCH, DELETE llamada
      tags/route.ts                     GET (filtro ?tipo), POST (solo ADMIN)
      tags/[id]/route.ts                PATCH (whitelist), DELETE (solo ADMIN)
      usuarios/menciones/route.ts       GET busqueda usuarios para @menciones
      onboarding/route.ts               GET/PATCH estado onboarding usuario
      recordatorios/route.ts            GET (filtro ?pendientes), POST
      recordatorios/[id]/route.ts       PATCH (whitelist), DELETE (ownership check)
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
    ComentariosPanel.tsx                Sistema comentarios con @menciones (dynamic import)
    MentionInput.tsx                    Textarea con dropdown @menciones, debounced, keyboard nav
    MentionText.tsx                     Renderiza texto con pills de mencion (@[id:Nombre])
    TagSelector.tsx                     Selector/pills de tags con colores + TagPills read-only
    BottomNav.tsx                       Navegacion movil 5 tabs (glass effect, safe area, TEAL active)
    OnboardingWizard.tsx                Tour 6 pasos con SVG ilustraciones, slide transitions
    NotificationManager.tsx              Browser Notification API, permission banner, polling 60s
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
      SignaturePad.tsx                   Firma digital canvas (dynamic import)
      VoiceNotes.tsx                    (dynamic import)
  hooks/
    useKeyboardShortcuts.ts             Cmd+K, G+H/V/P/D, Escape
    useOfflineSync.ts                   useOfflineSync(), useOnlineStatus(), SaveStatus
    useFavoritos.ts                     DB-backed favoritos hook (optimistic updates, rollback)
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
    calendar-token.ts                   HMAC-SHA256 tokens para iCal auth (deterministic, sin DB)
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
Comentario       (texto, autor, fecha, mencionIds:JSON — vinculado a visita o proyecto)
ModuloInlab      (nombre — catalogo de modulos InLab)
PlantillaVisita  (nombre, tipo, datos JSON)
ConfigApp        (clave/valor configuracion app)
LogActividad     (accion, entidad, entidadId, detalle, usuario, fecha — log ADMIN)
Tag              (nombre, color hex, tipo: VISITA|PROYECTO, orden, activo — @@map "tags")
VisitaTag        (pivot visita-tag — @@map "visitas_tags", cascade delete)
ProyectoTag      (pivot proyecto-tag — @@map "proyectos_tags", cascade delete)
Recordatorio     (titulo, descripcion?, fecha, completado, usuarioId — @@map "recordatorios")
Favorito         (usuarioId, entidadId, tipo: TipoFavorito, @@unique [usuarioId,entidadId,tipo])
RegistroLlamada  (hospitalId, contactoId?, usuarioId, fecha, duracion, asunto, notas, resultado, seguimiento, fechaSeguimiento — @@map "registros_llamadas")
```

**Enums clave:**
- `EstadoProyecto`: NUEVO | EN_CURSO | PAUSADO | COMPLETADO | CANCELADO
- `EstadoModulo`: PENDIENTE | EN_INSTALACION | INSTALADO | FORMACION | VALIDADO
- `TipoFase`: 11 tipos (FIRMA_CONTRATO → SOPORTE_POST)
- `TipoFavorito`: HOSPITAL | PROYECTO

---

## 6. APIs — reglas importantes

- `/api/search`: busqueda unificada hospitales+visitas+proyectos. Cache 30s.
- `/api/visitas` GET: select SIN `datos` (JSON grande), incluye `titulo`. Acepta `?desde=&hasta=`. Cache 15s.
- `/api/visitas/[id]` GET: devuelve `datos` completo + relaciones.
- POST visita acepta: `hospitalId`, `tipo`, `titulo`, `fecha`, `datos`, `proyectoId`, `contactoPrincipalId`.
- PATCH visita acepta: `titulo`, `datos`, `estado`, `fecha`, `proyectoId`, `contactoPrincipalId`.
- POST proyecto acepta: `moduloIds` array + `refConcurso` ademas de campos base.
- GET proyecto incluye `modulos` con estado de cada modulo + `tags` con color.
- PATCH proyecto acepta `tagIds` array para asignar tags.
- PATCH visita acepta `tagIds` array para asignar tags.
- GET visitas incluye `tags` con tag info.
- `/api/tags` GET: lista tags (filtro ?tipo=VISITA|PROYECTO). POST: crear tag (solo ADMIN).
- `/api/tags/[id]` PATCH: editar tag (whitelist: nombre, color, orden, activo). DELETE: eliminar.
- `/api/usuarios/menciones` GET: busqueda ligera de usuarios activos (?q=nombre). Cache 30s.
- Comentarios POST aceptan `mencionIds` array para registrar menciones.
- `/api/presence` POST: heartbeat de presencia colaborativa (entityType, entityId). Devuelve activeUsers[].
- Seguridad: IDOR check en hospitales (zona), visitas (propietario + misma zona), proyectos (responsable + zona). Whitelist en PATCH.
- Acceso visitas: propietario, ADMIN, o usuarios en la misma zona del hospital.
- Acceso proyectos: responsable, ADMIN, o usuarios en la zona del hospital del proyecto.
- `/api/favoritos` GET: lista favoritos del usuario (?tipo=HOSPITAL|PROYECTO). POST: toggle (create/delete).
- `/api/calendario/ical` GET: feed .ics con visitas, recordatorios, hitos. Auth via HMAC token query param.
- `/api/proyectos/[id]/excel` GET: export Excel 6 hojas (Resumen, Fases, Tareas, Hitos, Modulos, Materiales).
- `/api/llamadas` GET: lista llamadas (filtro zona, ?desde=&hasta=, ?hospitalId=). POST: crear llamada.
- `/api/llamadas/[id]` GET, PATCH (whitelist), DELETE (owner o ADMIN).
- `/api/admin/carga-trabajo` GET: heatmap datos visitas por usuario/dia (?mes=YYYY-MM). Solo ADMIN.
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
- Lista con filtro zona, toggle grid/lista, busqueda, favoritos (DB-backed, cross-device)
- Detalle: KPIs visitas, tabs Contactos/Visitas/Timeline
- QR por hospital: generacion dinamica + descarga PNG
- Contactos: creables por todos, edit/delete solo ADMIN
- Timeline de actividad: historial cronologico completo
- Grupos hospitalarios: hospital cabecera con N centros (FK auto-referencial grupoId)
- Banner de pertenencia a grupo con link al hospital cabecera
- Lista de centros con añadir/quitar, indicadores pill en lista hospitales
- Selector de grupo en admin hospitales

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
- Tags/Etiquetas: pills de color asignables desde detalle visita con TagSelector
- Filtro por tags en lista de visitas

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
- Tags/Etiquetas: pills de color asignables desde detalle proyecto con TagSelector

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
- Tags/Etiquetas: gestion completa en Admin > Configuracion (crear, editar color/nombre, activar/desactivar, eliminar, separado por VISITA/PROYECTO)

### Comentarios (visitas + proyectos)
- @Menciones: textarea con dropdown debounced y navegacion teclado (ArrowUp/Down, Enter, Escape)
- Dropdown con avatar, nombre y rol del usuario (color-coded por rol)
- Formato almacenamiento: `@[userId:Nombre]`, parseo con MentionText (pills teal)
- API /api/usuarios/menciones: busqueda ligera sin restriccion de rol
- Notificaciones: mencion aparece en dropdown TopBar con icono @ teal

### Modo campo movil
- BottomNav: 5 tabs fijos en bottom (Dashboard, Visitas, Hospitales, Proyectos, Mas)
- Glass effect: backdrop-blur + semi-transparente, safe area insets
- Active tab: TEAL con scale animation + filled icon
- "Mas" abre sidebar overlay via useSidebarToggle()
- Acciones rapidas en dashboard: 3 cards (Nueva visita, Visitas hoy, Calendario)
- Padding bottom en main para no ocultar contenido bajo bottom nav

### Onboarding nuevo usuario
- OnboardingWizard: overlay z-60 con card centrada, 6 pasos animados (slide translateX)
- Pasos: Bienvenida (logo), Dashboard, Navegacion, Visitas, Proyectos, Todo listo
- SVG ilustraciones custom por paso, dots de progreso TEAL
- Keyboard nav (flechas, Enter, Escape), boton Saltar, Comenzar en paso final
- API /api/onboarding: GET/PATCH estado onboardingCompletado
- Flag onboardingCompletado en Usuario (default false)
- Admin usuarios: boton "Reiniciar onboarding" en formulario edicion
- /api/perfil incluye onboardingCompletado en respuesta

### Recordatorios personales
- Modelo Recordatorio: titulo, descripcion?, fecha, completado, usuario
- API CRUD /api/recordatorios con ownership check, rate limit, cache
- Pagina /recordatorios: grupos (Vencidos rojo, Hoy amber, Proximos teal, Completados gris)
- Crear inline, editar inline, checkbox completar, eliminar con confirmacion
- Notificaciones: recordatorios vencidos aparecen en TopBar con icono reloj TEAL
- Sidebar: enlace Recordatorios para todos los roles
- Dashboard Mi Dia: recordatorios de hoy integrados con badge hora

### Calidad tecnica
- Brand tokens en brand.ts (TEAL, ORANGE — importar, NO hardcodear)
- SVG icons en todo (NO emojis)
- EmptyState + Skeleton shimmer en todas las listas
- Rate limiting in-memory (14 rutas API) + brute-force login (5 intentos/min por IP)
- Cache-Control HTTP en APIs de lectura
- Error boundaries (error.tsx) en 15 rutas + global-error.tsx con Sentry
- Sentry error tracking: client/server/edge configs, instrumentation.ts, captureException en boundaries
- Seguridad: IDOR zona+responsable, mass assignment whitelist, crypto tokens, iframe sandbox
- Seguridad headers: CSP (sin unsafe-eval), HSTS 1 año, X-Frame-Options DENY, nosniff, referrer-policy
- Presencia colaborativa in-memory (presence.ts) — sin dependencias externas
- PWA: manifest + SW + IndexedDB
- Dark mode completo: containers, modales, drawers, tablas, inputs, loading skeletons, CommandPalette
- Dark mode: globals.css con overrides !important para bg, text, borders, hover, sombras, inputs, scrollbar
- Dark mode: hover states de colores de estado (red-50, teal-50, amber-50, etc.) con overrides globales
- Dark mode: RadioPills/CheckPills usan clases CSS en vez de inline styles (compatible dark mode)
- Animaciones: skeleton-shimmer, stagger-grid (KPIs, hospital cards), card-hover lift, stagger-nav
- Lighthouse: Performance 100, Accessibility 100, Best Practices 96, SEO 100
- Playwright E2E: auth setup, visitas (5 tests), proyectos (4 tests), navegacion (9 tests), mobile viewport
- JWT sesion: maxAge 7 dias, estrategia stateless
- Tarea.asignadoAId: FK a Usuario (select dropdown, fallback legacy asignadoA String)

### Hardening corporativo (auditoria junio 2026)
- Connection pooling: PrismaPg max:20 conexiones (evita agotamiento pool Railway)
- 15 indices DB en FKs frecuentes: Hospital[zonaId], Contacto[hospitalId], Visita[hospitalId,usuarioId,fecha], Proyecto[hospitalId,responsableId], FaseProyecto, Tarea, Hito, EntradaTimeline, SolicitudMaterial, Adjunto, Comentario[visitaId,proyectoId], HardwareUnidad[hospitalId,catalogoId]
- checkRateLimitByKey(): rate limiter standalone reutilizable sin dependencia de NextRequest

### Heatmap carga de trabajo (ADMIN)
- Pagina /admin/carga-trabajo: grid GitHub-style, filas=usuarios, columnas=dias del mes
- API /api/admin/carga-trabajo: visitas por usuario/dia con raw SQL groupBy
- 3 KPIs: total visitas mes, media por usuario, dia mas activo
- Navegacion por mes, dark mode, responsive scroll horizontal
- Sidebar link con icono CargaTrabajo (solo ADMIN)

### Alertas hardware integradas
- Notificaciones TopBar: garantias vencidas + mantenimientos vencidos (solo ADMIN)
- Dashboard ADMIN: banner alertas hardware con enlace a /hardware
- Iconos IconShieldAlert + IconWrench en Icons.tsx y TopBar

### Firma digital visitas
- SignaturePad.tsx: canvas puro, pointer events, touch-action:none, high-DPI
- Dos firmas: cliente + tecnico InLab en seccion final del formulario visita
- Guardado en datos.firma_cliente / datos.firma_tecnico (base64 PNG)
- Renderizado en PrintView PDF con layout profesional de documento
- Dynamic import para carga lazy

### Registro rapido de llamada
- Modelo RegistroLlamada: hospital, contacto, usuario, duracion, asunto, notas, resultado, seguimiento
- API CRUD /api/llamadas + /api/llamadas/[id] con IDOR por zona
- Pagina /llamadas: KPIs, quick-create card, filtros (fecha/hospital/resultado/busqueda), cards expandibles con edicion inline
- 6 tipos resultado con colores: Contactado, No contesta, Buzon de voz, Info enviada, Reunion agendada, Otro
- Seguimiento con fecha, toggle inline
- Sidebar link para TODOS los roles (Llamadas con icono Phone)
- Tab "Llamadas" en ficha hospital con ultimas 10
- Llamadas de hoy en dashboard Mi Dia
- Middleware: /llamadas protegido

### Favoritos DB-backed
- Modelo Favorito: usuarioId + entidadId + tipo (HOSPITAL|PROYECTO), unique constraint
- API /api/favoritos: GET con filtro tipo, POST toggle (crea o elimina)
- Hook useFavoritos(): reemplaza localStorage, optimistic updates con rollback on error
- Integrado en lista hospitales y lista proyectos (estrella toggle)

### Panel de equipo (ADMIN)
- Pagina /admin/equipo: server component, solo ADMIN
- Card grid por usuario: nombre, rol, zona, visitas (total/mes), proyectos activos, ultimo acceso
- Datos en tiempo real desde DB (visitas count, proyectos where responsable)

### Exportar proyecto a Excel
- API /api/proyectos/[id]/excel: genera .xlsx con 6 hojas (Resumen, Fases, Tareas, Hitos, Modulos, Materiales)
- Libreria xlsx (SheetJS v0.18.5), auto-column-width, headers con estilo
- Boton "Exportar Excel" en detalle proyecto (descarga directa)

### Notificaciones navegador
- NotificationManager: Browser Notification API (no Push API — sin VAPID)
- Banner permisos: fixed bottom-right, glass effect, z-35
- Polling /api/notificaciones cada 60s cuando granted
- localStorage track de IDs mostrados (no duplicados)
- Seccion preferencias en /perfil con toggle activar/desactivar

### Sincronizacion calendario (iCal)
- calendar-token.ts: HMAC-SHA256 tokens deterministas (sin storage DB)
- API /api/calendario/ical: feed .ics con visitas, recordatorios pendientes, hitos proximos
- Auth via ?token= query param (HMAC del userId)
- Seccion en /perfil: URL copiable para Google Calendar/Outlook/Apple Calendar
- /api/perfil incluye calendarToken en respuesta

---

## 8. Deuda tecnica y bugs conocidos

| Prioridad | Issue | Ubicacion | Estado |
|-----------|-------|-----------|--------|
| ALTA | `/datos` es 100% mockup — no hay APIs reales | datos/page.tsx | PENDIENTE (Sprint 14 aplazado) |
| ~~ALTA~~ | ~~`mapaHtml` XSS via iframe sandbox~~ | ~~iframe srcDoc~~ | CORREGIDO sprint 12 |
| ~~ALTA~~ | ~~`GET /api/proyectos` sin filtro de zona~~ | ~~api/proyectos/route.ts~~ | CORREGIDO sprint 12 |
| ~~ALTA~~ | ~~Comentarios visita sin verificar acceso padre~~ | ~~api/visitas/[id]/comentarios~~ | CORREGIDO sprint 12 |
| ~~ALTA~~ | ~~Fases proyecto sin verificar pertenencia~~ | ~~api/proyectos/[id]/fases~~ | CORREGIDO sprint 12 |
| ~~ALTA~~ | ~~Contactos proyecto sin IDOR check~~ | ~~api/proyectos/[id]/contactos~~ | CORREGIDO sprint 12 |
| ~~ALTA~~ | ~~CSP unsafe-eval en script-src~~ | ~~next.config.ts~~ | CORREGIDO fase 1 corp |
| ~~ALTA~~ | ~~Sin brute-force protection en login~~ | ~~auth.ts~~ | CORREGIDO fase 1 corp |
| ~~ALTA~~ | ~~Sin HSTS header~~ | ~~next.config.ts~~ | CORREGIDO fase 1 corp |
| ~~ALTA~~ | ~~Sin connection pooling en PostgreSQL~~ | ~~db.ts~~ | CORREGIDO fase 2 corp (max:20) |
| ~~ALTA~~ | ~~Sin indices en FKs frecuentes (full table scans)~~ | ~~schema.prisma~~ | CORREGIDO fase 2 corp (15 indices) |
| ~~MEDIA~~ | ~~Dark mode incompleto en drawers~~ | ~~varios~~ | CORREGIDO sprint 13 |
| ~~MEDIA~~ | ~~`Tarea.asignadoA` String libre, no FK~~ | ~~schema.prisma~~ | CORREGIDO (asignadoAId FK + select + fallback) |
| ~~BAJA~~ | ~~`CACHE_VERSION = 'palex-v1'` hardcodeado en SW~~ | ~~public/sw.js~~ | CORREGIDO sprint 13 |
| ~~BAJA~~ | ~~JWT sin `maxAge` explicito (30 dias)~~ | ~~auth.config.ts~~ | CORREGIDO (maxAge 7 dias) |

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

### Sprint 13 — Calidad y testing (COMPLETADO)
- [x] Lighthouse audit: Performance 100, Accessibility 100, Best Practices 96, SEO 100 (objetivo >90 cumplido)
  - robots.txt: permitir /login (SEO is-crawlable)
  - auth layout: `<main id="main-content">` (landmark + skip-link target)
  - login: contraste textos WCAG AA (ORANGE→#b45309, gray-400→gray-500, boton #b45309)
  - login: toggle password 44×44 touch target
  - layout: eliminar maximumScale:1 (bloquea zoom accesibilidad)
- [x] Tests E2E con Playwright (auth setup + visitas 5 tests + proyectos 4 tests + navegacion 9 tests + mobile viewport)
- [x] Dark mode completo en drawers/modales (20+ paginas: admin, hardware, hospitales, visitas, proyectos, perfil, loading skeletons, CommandPalette)
- [x] Pulido visual global: skeleton-shimmer, card-hover, stagger-grid, hover states dark mode, RadioPills/CheckPills sin inline styles, calendario dark fix
- [x] Modal nueva visita mejorado: tipo de visita (RadioPills) + contacto principal con auto-seleccion
- [x] Auditoria responsive completa movil: calendario stacking, admin tables overflow-x-auto, grids mobile-first, filter pills dark mode

### Sprint 14 — Datos reales (APLAZADO)
- [ ] Conectar /datos a APIs reales (sustituir mockup)
- [ ] KPIs de rendimiento por usuario/zona (solo ADMIN)

### Sprint 15 — Tags, Menciones y Grupos (COMPLETADO)
- [x] Tags/Etiquetas: modelo Tag (TipoTag: VISITA|PROYECTO), pivots VisitaTag/ProyectoTag
- [x] API CRUD /api/tags y /api/tags/[id] (solo ADMIN crea/edita/elimina)
- [x] TagSelector reusable con pills de color, dropdown asignacion, sync al servidor
- [x] Gestion completa en Admin > Configuracion: crear tags con nombre/color/tipo, activar/desactivar, eliminar
- [x] Tags integrados en detalle visita, lista visitas (filtro pills), detalle proyecto, lista proyectos
- [x] @Menciones en comentarios: MentionInput con dropdown debounced (200ms), navegacion teclado
- [x] Dropdown menciones: avatar con inicial, nombre, rol color-coded (ADMIN rojo, VENTAS naranja, PROYECTOS azul, TECNICO morado)
- [x] MentionText: parseo patron @[userId:Nombre] a pills teal inline
- [x] API /api/usuarios/menciones: busqueda ligera usuarios activos (sin restriccion ADMIN)
- [x] mencionIds guardados en comentarios (visitas + proyectos), notificacion en TopBar con icono @ teal
- [x] Grupos hospitalarios: FK auto-referencial grupoId en Hospital
- [x] Hospital cabecera: seccion con lista de centros, modal añadir centro (filtro: no-grupoId, no-self)
- [x] Hospital centro: banner con link al hospital cabecera del grupo
- [x] Lista hospitales: pill "Grupo" + badge con numero de centros
- [x] Admin hospitales: selector de grupo en formulario de edicion
- [x] Busqueda /api/search incluye grupo/centros

### Sprint 16 — Modo campo, Onboarding, Recordatorios (COMPLETADO)
- [x] BottomNav movil: 5 tabs fijos (glass effect, backdrop-blur, safe area, TEAL active, filled icons)
- [x] Acciones rapidas campo en dashboard: 3 cards teal (Nueva visita, Visitas hoy, Calendario)
- [x] Padding bottom en main para contenido no oculto bajo bottom nav
- [x] OnboardingWizard: 6 pasos con SVG custom, slide animations, keyboard nav, skip
- [x] API /api/onboarding: GET/PATCH onboardingCompletado en Usuario
- [x] Admin usuarios: reiniciar onboarding desde formulario edicion
- [x] /api/perfil incluye onboardingCompletado
- [x] Modelo Recordatorio (titulo, descripcion?, fecha, completado, usuario)
- [x] API CRUD /api/recordatorios + /api/recordatorios/[id] con ownership check
- [x] Pagina /recordatorios: grupos vencidos/hoy/proximos/completados, CRUD inline
- [x] Notificaciones recordatorios vencidos en TopBar (icono reloj TEAL)
- [x] Sidebar: enlace Recordatorios para todos los roles
- [x] Dashboard Mi Dia: recordatorios de hoy integrados
- [x] Middleware: /recordatorios como ruta protegida

### Sprint 17 — Favoritos, Equipo, Excel, Notificaciones, iCal (COMPLETADO)
- [x] Modelo Favorito DB-backed: TipoFavorito enum (HOSPITAL|PROYECTO), unique constraint
- [x] API /api/favoritos: GET con filtro tipo, POST toggle create/delete
- [x] Hook useFavoritos(): reemplaza localStorage, optimistic updates con rollback
- [x] Favoritos integrados en hospitales y proyectos (estrella toggle cross-device)
- [x] Panel de equipo ADMIN: /admin/equipo, card grid con workload por usuario
- [x] Sidebar: enlace Panel Equipo solo para ADMIN
- [x] Export Excel proyecto: /api/proyectos/[id]/excel, 6 hojas xlsx, auto-column-width
- [x] NotificationManager: Browser Notification API, banner permisos glass, polling 60s
- [x] Preferencias notificaciones en /perfil con toggle
- [x] calendar-token.ts: HMAC-SHA256 tokens deterministas para iCal
- [x] API /api/calendario/ical: feed .ics (visitas, recordatorios, hitos) con token auth
- [x] Seccion sync calendario en /perfil: URL copiable para Google/Outlook/Apple
- [x] /api/perfil: incluye onboardingCompletado + calendarToken
- [x] Dashboard: seccion Favoritos con acceso rapido a hospitales/proyectos favoritos

### Sprint 18 — Heatmap, Alertas HW, Firma digital, Llamadas (COMPLETADO)
- [x] Heatmap carga de trabajo ADMIN: /admin/carga-trabajo, grid GitHub-style, KPIs, navegacion mes
- [x] Alertas hardware en notificaciones TopBar y dashboard ADMIN (garantia + mantenimiento)
- [x] Firma digital cliente/tecnico en visitas: SignaturePad canvas + renderizado en PDF
- [x] Modelo RegistroLlamada + API CRUD /api/llamadas con IDOR zona
- [x] Pagina /llamadas premium: KPIs, quick-create, filtros, cards expandibles, edicion inline
- [x] Llamadas: sidebar todos los roles, tab en hospital detail, dashboard Mi Dia
- [x] Middleware: /llamadas protegido
- [x] Iconos nuevos: Phone, CargaTrabajo, ShieldAlert, Wrench, ChevronDown

### Roadmap corporativo — escalado a 30-50 usuarios concurrentes

> Resultado de auditoria completa (infraestructura + seguridad + frontend). Junio 2026.

#### Fase 1 — Seguridad critica (3 horas) — COMPLETADA
- [x] Brute-force login: checkRateLimitByKey en authorize (5 intentos/min por IP)
- [x] CSP: eliminado `unsafe-eval` de script-src en next.config.ts
- [x] HSTS: añadido Strict-Transport-Security max-age=31536000; includeSubDomains

#### Fase 2 — Base de datos (3 horas) — COMPLETADA
- [x] Connection pooling: max:20 en PrismaPg adapter (src/lib/db.ts)
- [x] Indices: 15 @@index añadidos — Hospital[zonaId], Contacto[hospitalId], Visita[hospitalId,usuarioId,fecha], Proyecto[hospitalId,responsableId], FaseProyecto[proyectoId], Tarea[proyectoId], Hito[proyectoId], EntradaTimeline[proyectoId], SolicitudMaterial[proyectoId], Adjunto[proyectoId], Comentario[visitaId,proyectoId], HardwareUnidad[hospitalId,catalogoId]

#### Fase 3 — Redis para estado compartido (1 dia) — PRE-SCALING
- [ ] Migrar rate-limit.ts de Map a Redis (Upstash serverless o Railway Redis)
- [ ] Migrar presence.ts de Map a Redis (presencia colaborativa cross-instance)
- [ ] Cache servidor: agregaciones costosas (scores hospital, busqueda) en Redis con TTL

#### Fase 4 — Paginacion APIs (4 horas) — PRE-SCALING
- [ ] GET /api/hospitales: añadir ?limit=50&page=N (actualmente sin take, carga todos)
- [ ] GET /api/proyectos: añadir ?limit=50&page=N (actualmente sin take, carga todos)
- [ ] Frontend hospitales/page.tsx y proyectos/page.tsx: patron "cargar mas" (como ya tiene visitas)

#### Fase 5 — Object storage para archivos (2-3 dias) — PRE-SCALING
- [ ] Migrar Adjunto.contenido (base64 en DB) a Cloudflare R2 o AWS S3
- [ ] Migrar Visita.fotos (base64 en JSON) a R2/S3, guardar solo URLs
- [ ] Migrar HardwareCatalogoDoc.contenido a R2/S3
- [ ] API upload con presigned URLs + validacion MIME + limite tamaño

#### Fase 6 — Validacion y rate limiting global (2 dias) — PROGRESIVO
- [ ] Adoptar Zod para validacion de esquema en todas las rutas POST/PATCH
- [ ] Rate limiting en las 56 rutas API que no lo tienen (especialmente sub-rutas de proyectos)
- [ ] bodyParser size limits en next.config.ts

#### Fase 7 — Code splitting frontend (1 dia) — PROGRESIVO
- [ ] Extraer 10 tabs de proyectos/[id]/page.tsx (4900+ lineas) a componentes con next/dynamic
- [ ] Dynamic imports para DnD, QR, ComentariosPanel, SignaturePad

#### Fase 8 — Rendimiento frontend (1-2 dias) — PROGRESIVO
- [ ] SWR o React Query para cache de datos compartidos (hospitales, zonas, perfil)
- [ ] Formulario visita: useReducer o estado por seccion + React.memo (evitar re-render 13 secciones)
- [ ] Reducir polling colaborativo: heartbeat 8s→15s, data poll 4s→10s (o SSE)

#### Fase 9 — Revocacion JWT y sesiones (2 horas) — PROGRESIVO
- [ ] Check usuario.activo en callback jwt de NextAuth (revocacion inmediata al desactivar usuario)
- [ ] Considerar database sessions si se necesita revocacion instantanea

#### Estimacion total restante: ~8-10 dias de desarrollo
- Fases 1-2: COMPLETADAS (seguridad critica + BD optimizada)
- Fases 3-5: necesarias antes de superar 20 usuarios concurrentes (~4-5 dias)
- Fases 6-9: mejora progresiva sprint a sprint (~4-5 dias)

### Backlog — features futuras (no priorizado)
- [ ] Notificaciones por email (asignaciones, tareas nuevas) — Resend o similar
- [ ] Notificaciones push movil (requiere VAPID + service worker push + servicio externo tipo OneSignal o Firebase FCM — aplazado)
- [ ] Conectar /datos a APIs reales (sustituir mockup) — Sprint 14 aplazado
- [ ] Offline completo: crear registros sin conexion, no solo editar visitas existentes

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
