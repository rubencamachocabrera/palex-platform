<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# INLAB PALEX PLATFORM — Guia del Proyecto

> Fuente de verdad para cada sesion de desarrollo.
> Ultima actualizacion: 2026-06-19 (auditoria completa sprints 1-10).

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

### NextAuth v5
- `auth()` solo en servidor / server components / API routes
- NUNCA `useSession` — eliminado de toda la app
- Obtener rol en cliente: `fetch("/api/perfil")` → `d?.rol` (NO `d?.role`)
- Variables env: `AUTH_SECRET`, `AUTH_URL`

### URL routing
- Route group `(dashboard)` NO aparece en la URL
- Rutas: `/dashboard`, `/hospitales`, `/visitas`, `/ventas/pipeline`, `/pre-proyectos`, `/proyectos`, `/hardware`, `/mapa`, `/datos`, `/admin`, `/perfil`
- NO usar `/dashboard/hospitales`, `/dashboard/visitas`, etc.

### Roles
- `ADMIN`: acceso total
- `VENTAS`: dashboard, hospitales, pipeline CRM (DESACTIVADO)
- `PROYECTOS`: dashboard, hospitales, visitas, calendario, pre-proyectos
- `TECNICO`: igual que PROYECTOS

---

## 3. Modulos desactivados

### CRM / Pipeline comercial
El modulo de ventas (oportunidades, pipeline Kanban, etapas) esta **100% desactivado**.
No mostrar selectores de oportunidad, no vincular visitas a oportunidades, no trabajar en nada CRM.
El codigo existe pero no se usa ni se debe tocar.

### Proyectos y Pre-proyectos — son lo mismo
Para el usuario, "Pre-proyectos" y "Proyectos" son el mismo concepto: **proyectos**.
El sidebar ya tiene boton "Proyectos". No separar conceptualmente en la UI.

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
      pre-proyectos/page.tsx            Lista pre-proyectos
      pre-proyectos/[id]/page.tsx       Detalle + fases + comentarios + PDF
      proyectos/[id]/page.tsx           Detalle: fases, modulos InLab
      hardware/page.tsx                 Tabs: Resumen/Inventario/Instalaciones/Catalogo/Alertas
      mapa/page.tsx                     Leaflet, coordenadas por ciudad
      datos/page.tsx                    KPIs explotacion (MOCKUP — sin API real)
      admin/                            CRUD: usuarios, zonas, hospitales, hardware, visitas
      perfil/page.tsx                   Editar nombre + cambiar contrasena
    api/
      auth/[...nextauth]/route.ts
      search/route.ts                   Busqueda unificada (hospitales+visitas+preproyectos+proyectos)
      hospitales/route.ts               GET (Cache 30s), POST
      hospitales/[id]/route.ts          GET (verifica zona no-ADMIN, take:50), PATCH (whitelist), DELETE
      hospitales/[id]/contactos/route.ts
      hospitales/[id]/timeline/route.ts
      visitas/route.ts                  GET select sin `datos` + titulo, ?desde=&hasta=, Cache 15s
      visitas/[id]/route.ts             GET con `datos` completo, PATCH titulo/datos/estado/fecha
      visitas/[id]/comentarios/route.ts
      pre-proyectos/route.ts
      pre-proyectos/[id]/route.ts
      pre-proyectos/[id]/comentarios/route.ts
      pre-proyectos/[id]/adjuntos/route.ts
      proyectos/[id]/route.ts
      hardware/route.ts                 GET Cache 60s
      hardware/tipos/route.ts           HardwareTipo dinamico
      hardware/unidades/route.ts        GET Cache 30s, POST/PUT solo ADMIN+PROYECTOS
      oportunidades/route.ts            (DESACTIVADO — no usar)
      notificaciones/route.ts
      config/route.ts
      perfil/route.ts
      usuarios/route.ts
      zonas/route.ts
      health/route.ts
      share/[token]/route.ts            Pre-proyecto publico (sin PII)
  components/
    Sidebar.tsx                         Dark #0f172a, colapsable 256/64px, nav por rol
    TopBar.tsx                          Busqueda global debounced, toggle dark/light, hint Cmd+K
    ThemeProvider.tsx                    dark/light, localStorage palex_theme, anti-FOUC
    CommandPalette.tsx                   Cmd+K, busca hospitales+visitas+preproyectos+proyectos
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
    rate-limit.ts                       checkRateLimit() (god node: 22 edges)
    visita-analysis.ts                  detectarRiesgos() + calcularScore() (score 0-100)
  middleware.ts                         Protege rutas, edge-compatible
  types/next-auth.d.ts                  Extiende Session, User, JWT con id, rol, nombre
prisma/
  schema.prisma                         Modelos: Hospital, Visita, PreProyecto, Proyecto, Hardware...
public/
  logo-palex.png
  manifest.json                         PWA, theme #00A99D
  sw.js                                 Service Worker
```

---

## 5. Modelos Prisma principales

```
Usuario       (Rol enum: ADMIN|VENTAS|PROYECTOS|TECNICO)
Zona          (agrupacion de hospitales)
Hospital      (nombre, ciudad, provincia, tipo, camas, zona)
Contacto      (nombre, cargo, email, telefono, hospital)
Visita        (titulo?, hospitalId, tipo, estado, fecha, datos:JSON, score, fotos:JSON)
Oportunidad   (DESACTIVADO — pipeline CRM)
HistorialEntry(DESACTIVADO — cambios etapa CRM)
PreProyecto   (titulo, hospital, responsable, fases, adjuntos)
Proyecto      (nombre, hospital, fases, modulos InLab)
Fase          (nombre, estado, fechas)
Hito          (nombre, fecha, fase)
HardwareTipo  (nombre, color hex — dinamico desde admin)
HardwareCatalogo (marca, modelo, referenciaPalex, tipoId @map("tipo_id"))
HardwareUnidad   (serie, estado: DISPONIBLE|ASIGNADO|EN_MANTENIMIENTO|RETIRADO|BAJA)
Comentario    (texto, autor, fecha — vinculado a visita o pre-proyecto)
ModuloInlab   (nombre, descripcion — catalogo de modulos InLab)
Config        (clave/valor configuracion app)
```

---

## 6. APIs — reglas importantes

- `/api/search`: busqueda unificada hospitales+visitas+preproyectos+proyectos. Busca por titulo de visita. Cache 30s.
- `/api/visitas` GET: select SIN `datos` (JSON grande), incluye `titulo`. Acepta `?desde=&hasta=`. Cache 15s.
- `/api/visitas/[id]` GET: devuelve `datos` completo + relaciones.
- POST visita acepta: `hospitalId`, `tipo`, `titulo`, `fecha`, `datos`, `preProyectoId`.
- PATCH visita acepta: `titulo`, `datos`, `estado`, `fecha`, `preProyectoId`, `contactoPrincipalId`.
- Seguridad: IDOR check en hospitales (zona) y visitas (propietario). Whitelist en PATCH hospitales/zonas.
- Rate limiting: checkRateLimit() en todas las APIs de lectura.

---

## 7. Estado actual — todo lo implementado (junio 2026)

### Auth y navegacion
- Login split-screen con shake en error
- Middleware edge-compatible en todas las rutas
- Sidebar dark colapsable, nav por rol
- TopBar con busqueda global, toggle dark/light, hint Cmd+K
- ThemeProvider dark/light con anti-FOUC
- Command Palette (Cmd+K) con busqueda hospitales+visitas+preproyectos+proyectos
- Atajos teclado: G+H/V/P/D, /, Escape

### Hospitales
- Lista con filtro zona, toggle grid/lista, busqueda, favoritos (localStorage)
- Detalle: KPIs visitas, tabs Contactos/Visitas/Timeline
- QR por hospital: generacion dinamica + descarga PNG
- Contactos: creables por todos, edit/delete solo ADMIN
- Timeline de actividad: historial cronologico completo

### Visitas
- Lista con titulo, busqueda (titulo/hospital/ciudad/tecnico), filtros avanzados (fecha/estado/tipo/zona), ordenacion 3 modos
- Quick-create modal: titulo + hospital + fecha + plantilla
- Titulo editable en cabecera del formulario (guarda onBlur)
- Calendario mensual: dots por estado, crear con fecha pre-rellena, ?desde=&hasta=
- Formulario 13 secciones: fotos por seccion, auto-save IndexedDB, offline
- Seccion s_termo: neveras/termografia (RFID + BT), SubHeaders visuales
- PDF profesional Palex, export JSON, CSV con titulo
- Score complejidad 0-100, detectarRiesgos() 14 reglas
- TodoChecklist, Notas de voz (dynamic), Comentarios (dynamic)
- Vista resumen 360 con edicion inline
- Vinculacion visita -> pre-proyecto con selector + progreso fases

### Pre-proyectos
- Lista + detalle con fases, tareas, hitos
- Adjuntos, comentarios
- PDF via window.print() con branding Palex
- Link compartir publico con token criptografico (sin PII)
- Boton "Nueva visita" desde cabecera del proyecto

### Proyectos (InLab)
- Detalle: fases, modulos InLab
- Hub de proyecto con acciones rapidas

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

### Admin
- CRUD completo: usuarios, zonas, hospitales, hardware, visitas
- Export CSV
- Asignacion zonas a usuarios

### Calidad tecnica
- Brand tokens en brand.ts (TEAL, ORANGE — importar, NO hardcodear)
- SVG icons en todo (NO emojis)
- EmptyState + Skeleton shimmer en todas las listas
- Rate limiting in-memory
- Cache-Control HTTP en APIs de lectura
- Error boundaries (error.tsx) en 15 rutas
- Seguridad: IDOR, mass assignment whitelist, crypto tokens, CSP header
- PWA: manifest + SW + IndexedDB
- Dark mode completo con anti-FOUC

---

## 8. Deuda tecnica y bugs conocidos

| Prioridad | Issue | Ubicacion |
|-----------|-------|-----------|
| ALTA | `/datos` es 100% mockup — no hay APIs reales | datos/page.tsx, _lib/mock-data.ts |
| ALTA | `mapaHtml` se guarda sin sanitizar (riesgo XSS) | dangerouslySetInnerHTML |
| ALTA | `GET /api/proyectos` devuelve todos sin filtro de zona | api/proyectos/route.ts |
| ALTA | Comentarios de visita no verifican acceso a la visita padre | api/visitas/[id]/comentarios |
| ALTA | Fases pre-proyecto no verifican pertenencia en PATCH | api/pre-proyectos/[id] |
| MEDIA | Dark mode incompleto en algunos drawers (estilos inline) | varios |
| MEDIA | `Tarea.asignadoA` es String libre, no FK a Usuario | schema.prisma |
| MEDIA | `/proyectos` no tiene enlace en ningun nav group del Sidebar | Sidebar.tsx |
| BAJA | `CACHE_VERSION = 'palex-v1'` hardcodeado en SW | public/sw.js |
| BAJA | JWT sin `maxAge` explicito (default 30 dias NextAuth) | auth.ts |

---

## 9. Pendiente — proximos sprints

### Sprint 11 — Seguridad y robustez
- [ ] Sanitizar mapaHtml (riesgo XSS con dangerouslySetInnerHTML)
- [ ] Filtro de zona en GET /api/proyectos
- [ ] Verificar acceso a visita padre en comentarios
- [ ] Verificar pertenencia al proyecto en PATCH fases
- [ ] Sentry para errores en produccion

### Sprint 12 — Calidad y testing
- [ ] Lighthouse audit (objetivo >90)
- [ ] Tests E2E con Playwright (login, crear visita, formulario)
- [ ] Dark mode completo en drawers/modales

### Sprint 13 — Datos reales
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

1. NUNCA tocar codigo sin propuesta previa + confirmacion de Ruben
2. NUNCA asumir — UNA sola pregunta si hay duda
3. Simplicidad primero (dev en solitario)
4. Mobile-first siempre
5. No insistir en deploy ni en push a GitHub

Formato obligatorio antes de implementar:
```
PROPUESTA / Que voy a hacer / Como / Archivos / Complejidad / Procedo?
```
