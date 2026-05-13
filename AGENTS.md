<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# PALEX PLATFORM — Contexto de Proyecto para IA

> Fuente de verdad para cualquier asistente IA (Cowork, Claude Code, etc).
> Actualizar siempre que cambie el estado del proyecto.
> Ultima actualizacion: 2026-05-13

---

## Stack tecnico (NO cambiar sin justificacion)

- Framework: Next.js 14+ App Router, TypeScript estricto
- UI: Tailwind CSS + shadcn/ui
- DB: PostgreSQL via Railway
- ORM: Prisma 7 con @prisma/adapter-pg
- Auth: NextAuth.js v5 — auth.config.ts para Edge, auth.ts para server
- Deploy: Railway (produccion activa)
- URL produccion: https://palex-platform-production.up.railway.app
- VCS: Git + GitHub: rubencamachocabrera

### Prisma — CRITICO
- NO usar `url` en el bloque `datasource` (usa adapter-pg, la URL va en env)
- Prisma Client se importa SIEMPRE desde @/lib/db.ts
- Para schema changes: `npx prisma db push` (nunca migrate en produccion sin revisar)

### NextAuth v5 — CRITICO
- auth() solo en servidor / server components / API routes
- NUNCA usar useSession — esta eliminado de toda la app
- Para obtener rol en cliente: fetch("/api/perfil")
- Variable de entorno: AUTH_SECRET (no NEXTAUTH_SECRET), AUTH_URL en Railway

### URL routing — CRITICO
- El route group (dashboard) NO aniade nada a la URL
- Rutas reales: /dashboard, /hospitales, /visitas, /ventas, /admin, /perfil
- NO usar /dashboard/hospitales, /dashboard/visitas, etc.

### Roles del sistema
- ADMIN: acceso total
- VENTAS: dashboard, hospitales, pipeline CRM
- PROYECTOS: dashboard, mis hospitales, mis visitas, calendario
- TECNICO: igual que PROYECTOS (mismo nav group en Sidebar)

---

## Estructura de ficheros clave

```
src/
  app/
    (auth)/login/page.tsx           -- Login split-screen animado
    (dashboard)/
      layout.tsx                    -- Sidebar + TopBar + KeyboardShortcutsProvider
      dashboard/page.tsx            -- Dashboard por rol
      hospitales/page.tsx           -- Lista hospitales filtro zonas + grid/list
      hospitales/[id]/page.tsx      -- Detalle + KPIs + contactos + visitas
      visitas/page.tsx              -- Lista visitas, busqueda, ordenacion, quick-create modal
      visitas/calendario/page.tsx   -- Vista calendario mensual, dots por estado
      visitas/[id]/page.tsx         -- Formulario 13 secciones, fotos, PDF, offline
      ventas/pipeline/page.tsx      -- CRM pipeline KPIs + kanban
      admin/                        -- CRUD usuarios, zonas, hospitales, visitas
      perfil/page.tsx               -- Editar nombre + cambiar contrasena
    api/
      auth/[...nextauth]/route.ts
      search/route.ts               -- Busqueda unificada (hospitales + visitas, sin datos JSON)
      hospitales/route.ts           -- Cache-Control 30s
      hospitales/[id]/route.ts
      hospitales/[id]/contactos/route.ts
      visitas/route.ts              -- select (sin datos), filtro ?desde=&hasta=, Cache-Control 15s
      visitas/[id]/route.ts
      oportunidades/route.ts
      oportunidades/[id]/route.ts
      usuarios/route.ts
      zonas/route.ts
      perfil/route.ts
      health/route.ts
  components/
    Sidebar.tsx                     -- Colapsable 256/64px, nav por rol, useMemo allHrefs
    TopBar.tsx                      -- Busqueda global via /api/search
    CommandPalette.tsx              -- Cmd+K, busqueda hospitales+visitas, cache 60s modulo
    KeyboardShortcutsProvider.tsx   -- Monta CommandPalette + useKeyboardShortcuts
    Toast.tsx                       -- Global toast provider
    OfflineIndicator.tsx
    ServiceWorkerRegistrar.tsx
    ui/
      EmptyState.tsx
      Icons.tsx                     -- SVG icons (NO emojis)
      PageHeader.tsx
      Skeleton.tsx
    visitas/
      AnalisisPanel.tsx
      PrintView.tsx
      TodoChecklist.tsx
      VoiceNotes.tsx
  hooks/
    useKeyboardShortcuts.ts         -- Cmd+K, G+H/V/P/D, Escape
    useOfflineSync.ts
  lib/
    auth.config.ts                  -- Edge-compatible config
    auth.ts                         -- Server-side NextAuth
    brand.ts                        -- TEAL, TEAL_LIGHT, ORANGE tokens
    csv.ts                          -- Export CSV helper
    db.ts                           -- Prisma singleton
    form-schema.ts                  -- Schema 13 secciones formulario visita
    img-compress.ts                 -- comprimirImagen() Canvas API
    offline-db.ts                   -- IndexedDB drafts + sync-queue
    rate-limit.ts                   -- In-memory rate limiter (windowMs)
    visita-analysis.ts              -- detectarRiesgos() + calcularScore()
  middleware.ts                     -- Protege rutas, edge-compatible
  types/next-auth.d.ts
prisma/
  schema.prisma                     -- Rol enum: ADMIN VENTAS PROYECTOS TECNICO
public/
  logo-palex.png
  manifest.json                     -- PWA, theme #00A99D
  sw.js                             -- Service Worker
```

---

## Funcionalidades implementadas (mayo 2026)

### Auth y navegacion
- Login split-screen: panel izquierdo teal animado + panel derecho card con shake en error
- Middleware edge-compatible protegiendo todas las rutas dashboard
- Sidebar colapsable (256 <-> 64px), persistencia localStorage, mobile hamburger
- TopBar con busqueda global debounced -> /api/search
- Command Palette (Cmd+K / Ctrl+K): busca hospitales + visitas, atajos teclado G+H/V/P/D
- Active state preciso en sidebar (sin doble-activo en rutas hijas)

### Hospitales
- Lista con filtro zona, toggle grid/lista, busqueda por nombre
- Detalle: KPIs visitas, tabs Contactos/Visitas, skeleton loading
- Contactos creables por todos los roles (edit/delete solo ADMIN)
- CRUD admin completo

### Visitas
- Lista con busqueda hospital/ciudad, ordenacion 3 modos, EmptyState contextual
- Quick-create desde lista (mini-modal hospital picker)
- Vista Calendario mensual: dots por estado, panel lateral, crear visita con fecha pre-rellena
  - Solo carga visitas del mes visible (?desde=&hasta= en API)
- Formulario visita preproyecto: 13 secciones, fotos por seccion, auto-save IndexedDB
  - PDF profesional Palex, export JSON, TodoChecklist, Notas de voz, AnalisisPanel
  - Score complejidad 0-100, detectarRiesgos() 14 reglas
  - Offline: useOfflineSync, restaura borrador si mas completo que servidor

### CRM / Ventas
- Pipeline Kanban con KPIs, filtros, crear/editar oportunidades
- EmptyState por etapa

### Admin
- CRUD completo: usuarios, zonas, hospitales, visitas
- Export CSV (csv.ts)
- Asignacion zonas a usuarios desde modal

### Calidad tecnica
- CSS brand tokens (brand.ts): TEAL #00A99D, ORANGE #F7941D
- SVG icons en todo (NO emojis)
- EmptyState + Skeleton shimmer en todas las listas
- Rate limiting en-memory (rate-limit.ts)
- Cache-Control HTTP en APIs de lectura
- PWA: manifest + SW + IndexedDB offline store

---

## APIs — notas importantes

- /api/search: endpoint unificado para busqueda. Usa select sin campo `datos` (JSON grande).
  Devuelve max 6 hospitales + 5 visitas. Cache-Control private, max-age=30.
- /api/visitas GET: usa select (sin `datos`), acepta ?desde=&hasta= para calendario.
  Cache-Control private, max-age=15.
- /api/visitas GET: el campo `datos` (JSON formulario completo) SOLO se devuelve en /api/visitas/[id].
- CommandPalette: cache modulo-level 60s TTL para evitar re-fetch en cada apertura.

---

## Pendiente (proxima sesion)

### Sprint 5 resto
- [ ] Quick-create visita desde /visitas (mini-modal ya existe, conectar con backend)
- [ ] Boton "Exportar CSV" en /visitas y /pipeline (csv.ts ya existe)
- [ ] Admin pages: revisar emojis restantes en admin/usuarios, admin/hospitales, admin/zonas

### Sprint 6 — CRM avanzado
- [ ] Drag & drop Kanban con @dnd-kit
- [ ] Ficha oportunidad con historial de cambios de etapa
- [ ] Badge sidebar: oportunidades >7 dias sin actividad
- [ ] Vincular visita -> oportunidad desde formulario

### Sprint 7 — Nuevas funcionalidades
- [ ] Modulo Proyectos CRUD completo
- [ ] Notificaciones internas (bell en TopBar)
- [ ] QR del hospital
- [ ] Modo oscuro completo
- [ ] Plantillas de visita rapida

### Sprint 8 — Calidad tecnica
- [ ] Error boundaries por modulo
- [ ] Lighthouse audit (objetivo >90)
- [ ] Sentry para errores en produccion
- [ ] Tests E2E con Playwright (login, crear visita, pipeline)

---

## Patrones y convenciones de codigo

- API routes: try/catch siempre, retornar { error: "..." } status 500
- Client fetching: fetch("/api/...") con guard r.ok y Array.isArray()
- Imagenes: comprimirImagen() de @/lib/img-compress.ts antes de guardar
- Color principal: TEAL = "#00A99D" (importar de @/lib/brand.ts, NO hardcodear)
- Tap targets movil: minimo 44px altura
- Formularios: RadioPills/CheckPills (no radio/checkbox nativos)
- "use client" debe ser la PRIMERA LINEA del archivo (sin nada antes, ni comentarios)

---

## Reglas del asistente

1. NUNCA tocar codigo sin propuesta previa + confirmacion de Ruben
2. NUNCA asumir — UNA sola pregunta si hay duda
3. Simplicidad primero (dev en solitario)
4. Mobile-first siempre
5. No insistir en deploy ni en push a GitHub

Formato obligatorio antes de implementar:
  PROPUESTA / Que voy a hacer / Como / Archivos / Complejidad / Procedo?

---

## Patrones criticos — sandbox de Cowork (solo relevante en Cowork, no en Claude Code CLI)

### Git en sandbox — NUNCA usar git add / git commit normales
El sandbox monta el workspace via /sessions/.../mnt/. El git index ve TODOS los archivos del
repo del usuario, pero el mount del sandbox solo tiene el directorio seleccionado. Cualquier
`git add .` o `git commit` marca como eliminados todos los archivos fuera del mount.

Usar SIEMPRE el flujo GIT_INDEX_FILE seguro:
  1. clear_locks() recursivo en .git (os.rename, nunca os.unlink)
  2. read-tree HEAD en indice temporal (GIT_INDEX_FILE=/tmp/xxx.idx)
  3. hash-object -w + update-index --add --cacheinfo para cada archivo
  4. Verificar size > 0 antes de commitear (blob vacio = archivo truncado)
  5. write-tree + commit-tree
  6. Escribir ref directamente: open(".git/refs/heads/main","w").write(commit)

### Write/Edit tool trunca archivos > ~100 lineas en silencio
Para archivos grandes usar Python: open(path,"w").write(content)
Verificar con: wc -l archivo && tail -5 archivo
Si truncado, append con: open(path,"a").write(missing_content)

### index.lock — usar os.rename(), nunca os.unlink()
Limpiar recursivamente con os.walk() (incluye refs/heads/main.lock).

### update-index: usar siempre --add --cacheinfo
Sin --add falla (rc=128) para archivos nuevos o directorios nuevos en el arbol.
