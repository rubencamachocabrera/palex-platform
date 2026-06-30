# GRAPH REPORT

**Nodos:** 2,818  |  **Aristas:** 7,436  |  **Comunidades:** 148  |  **Densidad:** 0.0000

---

## God Nodes (hubs de alta conectividad)

| Nodo | Grado | Descripción |
|------|-------|-------------|

---

## Comunidades detectadas

### Comunidades principales

#### C0 (87 nodos) — API Routes Hub (checkRateLimit, hospitales, proyectos, checkin)
Nodos clave: `route.ts`, `DELETE()`, `GET()`, `route.ts`, `GET()`

#### C1 (85 nodos) — Incidencias Module (list page, KPIs, drawer, SLA countdown)
Nodos clave: `GET()`, `route.ts`, `GET()`, `POST()`, `route.ts`

#### C7 (71 nodos) — Auth + App Layout (auth.ts, cerrarSesion, layout.tsx)
Nodos clave: `auth.ts`, `cerrarSesion()`, `layout.tsx`, `AdminLayout()`, `route.ts`

#### C8 (68 nodos) — Proyecto constants (EstadoModulo, ESTADO_MODULO_COLOR)
Nodos clave: `ESTADO_MODULO_COLOR`, `ESTADO_MODULO_LABEL`, `EstadoModulo`, `IconArrowLeft()`, `IconEdit()`

#### C13 (59 nodos) — Activity Log + Config (ALL_ENTIDADES, ACCION_CFG, /actividad)
Nodos clave: `page.tsx`, `ACCION_CFG`, `ALL_ENTIDADES`, `avatarColor()`, `DayGroup`

#### C15 (53 nodos) — Visita form (calcProgress, CampoField, CheckPills, 13 sections)
Nodos clave: `calcProgress()`, `CampoField()`, `CheckPills()`, `ContactoItem`, `exportarJSON()`

#### C16 (46 nodos) — App shell (not-found.tsx, root layout.tsx)
Nodos clave: `not-found.tsx`, `NotFound()`, `layout.tsx`, `AuthLayout()`, `error.tsx`

#### C18 (45 nodos) — Incidencias detail (CAT_FORM_EMPTY, diasDesde, SLA, timeline)
Nodos clave: `CAT_FORM_EMPTY`, `diasDesde()`, `diasHasta()`, `DonutChart()`, `EditUnidadDrawer()`

#### C19 (44 nodos) — Proyecto detail tabs (Adjunto, CatalogoItemPicker, ComentariosInInfo)
Nodos clave: `Adjunto`, `CatalogoItemPicker`, `ComentariosInInfo()`, `CONTACTO_FORM_EMPTY`, `ContactoPivot`

#### C20 (42 nodos) — Generic API route handlers (route.ts POST CRUD)
Nodos clave: `route.ts`, `POST()`, `route.ts`, `GET()`, `POST()`

#### C22 (35 nodos) — Admin activity/carga page (agruparPorMes)
Nodos clave: `page.tsx`, `agruparPorMes()`, `agruparPrevisionPorMes()`, `BarChart()`, `calcTrend()`

#### C23 (35 nodos) — Hardware enums (ALL_TIPOS, CATEGORIAS)
Nodos clave: `ALL_TIPOS`, `CATEGORIAS`, `dateGroupLabel()`, `EQUIPOS`, `esc()`

#### C24 (34 nodos) — Admin skeleton loaders (AdminLoading)
Nodos clave: `loading.tsx`, `AdminLoading()`, `page.tsx`, `CargaData`, `CargaTrabajoPage()`

#### C25 (34 nodos) — TagSelector component (TagItem, color pills)
Nodos clave: `TagSelector.tsx`, `TagItem`, `TagPills()`, `TagSelector()`, `TagSelectorProps`

#### C26 (34 nodos) — Toast system (god node, 42+ edges)
Nodos clave: `Toast.tsx`, `Toast`, `ToastContext`, `ToastContextValue`, `ToastItem()`

#### C27 (34 nodos) — Admin config page (ConfigApp, incidenciasActivo)
Nodos clave: `page.tsx`, `Config`, `ConfiguracionPage()`, `ModuleCard()`, `ModuloItem`

#### C29 (31 nodos) — Visitas/Proyecto GET route handlers
Nodos clave: `route.ts`, `GET()`, `route.ts`, `PATCH()`, `route.ts`

#### C30 (31 nodos) — Admin hardware page (AdminHardwarePage, CatalogoCard)
Nodos clave: `AdminHardwarePage()`, `CatalogoCard()`, `CatalogoItem`, `CatalogoTab()`, `COLORES_PRESET`

#### C31 (28 nodos) — CSV export utility (exportarCSV)
Nodos clave: `csv.ts`, `exportarCSV()`, `page.tsx`, `DraggableCard()`, `DroppableColumn()`

#### C32 (28 nodos) — Proyecto duration helpers (duracionProyecto)
Nodos clave: `page.tsx`, `duracionProyecto()`, `ESTADO_COLOR`, `ESTADO_LABEL`, `estadoEfectivo()`

#### C33 (27 nodos) — Datos analytics mocks (getConsumoMensual, getCorrelaciones)
Nodos clave: `getConsumoMensual()`, `getCorrelaciones()`, `getDiaSemana()`, `getForecast()`, `getIndicadores()`

#### C34 (26 nodos) — Timeline actividad page (avatarColor, feed)
Nodos clave: `page.tsx`, `avatarColor()`, `formatDate()`, `IconMapPin()`, `IconPencil()`

#### C35 (23 nodos) — Incidencias categories UI
Nodos clave: `page.tsx`, `CATEGORIAS`, `EQUIPOS`, `EQUIPOS_MAP`, `esc()`

#### C36 (23 nodos) — Hospital contactos page
Nodos clave: `page.tsx`, `Contacto`, `ContactoDropdown()`, `FILTROS_FECHA`, `formatDuration()`

#### C37 (22 nodos) — Datos area charts (AreaChart mockup)
Nodos clave: `page.tsx`, `AreaChart()`, `ComparadorAnios()`, `ComparadorMeses()`, `EVENTOS`

#### C38 (22 nodos) — Package dependencies (@auth/prisma-adapter)
Nodos clave: `dependencies`, `@auth/prisma-adapter`, `bcryptjs`, `@dnd-kit/core`, `@dnd-kit/sortable`

#### C39 (22 nodos) — Card component + date helpers
Nodos clave: `page.tsx`, `CardContent()`, `ESTADO_COLOR`, `ESTADO_LABEL`, `estadoEfectivo()`

#### C40 (21 nodos) — Hospital groups (CentroGrupo, avColor)
Nodos clave: `avColor()`, `CentroGrupo`, `Contacto`, `CONTACTO_EMPTY`, `FaseResumen`

#### C41 (21 nodos) — Proyecto Fases + Tareas (FaseProyecto, Tarea model)
Nodos clave: `Fase`, `Tarea`, `page.tsx`, `ESTADO_FASE`, `fmtFecha()`

#### C42 (20 nodos) — Comentarios + mentions (avColor, Comentario)
Nodos clave: `avColor()`, `Comentario`, `fechaRel()`, `Props`, `MentionInput.tsx`

#### C43 (20 nodos) — Offline sync (OfflineIndicator, useOfflineSync, IndexedDB)
Nodos clave: `OfflineIndicator.tsx`, `useOfflineSync.ts`, `SaveStatus`, `UseOfflineSyncOptions`, `useOnlineStatus()`

#### C44 (20 nodos) — TypeScript + build config (tsconfig.json)
Nodos clave: `tsconfig.json`, `compilerOptions`, `allowJs`, `esModuleInterop`, `incremental`

#### C45 (19 nodos) — Sidebar + ThemeProvider (dark/light toggle)
Nodos clave: `useSidebarToggle()`, `ThemeProvider.tsx`, `Ctx`, `Theme`, `ThemeCtx`

#### C46 (19 nodos) — Hardware temperatura analytics (getLecturasTemperatura, getTendencias)
Nodos clave: `getLecturasTemperatura()`, `getTendencias()`, `DESCS_INC`, `ESTADOS_INC`, `generarAlertasTransporte()`

#### C47 (18 nodos) — Onboarding wizard (ADMIN_STEPS, 8+3 steps)
Nodos clave: `OnboardingWizard.tsx`, `ADMIN_STEPS`, `FINAL_STEP`, `GENERAL_STEPS`, `IconAdmin()`

#### C48 (18 nodos) — Incidencias equipos enum (SERVICIO_TECNICO, APLICACIONES, etc.)
Nodos clave: `EQUIPOS`, `EstadoEquipo`, `SEV_CONFIG`, `TempGauge()`, `Alerta`

#### C49 (18 nodos) — Admin equipo workload page (avatarColor)
Nodos clave: `page.tsx`, `avatarColor()`, `ConfigApp`, `IconAlertCircle()`, `IconBell()`

#### C50 (17 nodos) — Datos forecast chart (ForecastChart)
Nodos clave: `ForecastChart()`, `Props`, `TabCorrelaciones.tsx`, `calcR2()`, `EJE_CONFIG`

#### C51 (17 nodos) — Visita PrintView + form-schema (PDF export)
Nodos clave: `PrintView`, `form-schema.ts`, `FieldType`, `FORM_SCHEMA`, `FormField`

#### C52 (17 nodos) — Design system MASTER.md (UI/UX Pro Max rules)
Nodos clave: `MASTER.md`, `Additional Forbidden Patterns`, `Anti-Patterns (Do NOT Use)`, `Buttons`, `Cards`

#### C53 (16 nodos) — Comparador page (ComparadorData, periodo selector, sparklines)
Nodos clave: `page.tsx`, `ComparadorData`, `ComparadorPage()`, `delta()`, `DeltaBadge()`

#### C54 (16 nodos) — Hardware flota tab (TabFlota, BateriaBar)
Nodos clave: `TabFlota.tsx`, `BateriaBar()`, `ESTADO_COLOR`, `ESTADO_LABEL`, `NeveraCard()`

#### C57 (16 nodos) — Kanban board (KanbanView, DnD @dnd-kit)
Nodos clave: `KanbanView.tsx`, `CardContent()`, `ESTADO_COLOR`, `ESTADO_LABEL`, `estadoEfectivo()`

#### C58 (16 nodos) — Share proyecto public page (ShareData, token)
Nodos clave: `page.tsx`, `ShareData`, `ContactoShare`, `ESTADO_COLOR`, `ESTADO_LABEL`

#### C59 (15 nodos) — Visitas calendario page (CalendarioPage)
Nodos clave: `page.tsx`, `CalendarioPage()`, `DIAS_SEMANA`, `diasEnMes()`, `ESTADO_COLOR`

#### C60 (15 nodos) — Datos donut/area charts (DonutChart, AreaChart)
Nodos clave: `AreaChart()`, `DonutChart()`, `TuboKey`, `HeatmapCalendar()`, `InsightsPanel()`

#### C61 (15 nodos) — Hardware temperature charts (TempChart, TendenciaChart)
Nodos clave: `TempChart()`, `TendenciaChart()`, `TabTendencias.tsx`, `ResumenCard()`, `LecturaTemperatura`

#### C62 (15 nodos) — CommandPalette (Cmd+K search, Accion)
Nodos clave: `CommandPalette.tsx`, `Accion`, `ACCIONES_BASE`, `IcoArrow()`, `IcoCalendar()`

#### C63 (15 nodos) — Route status colors (ESTADO_RUTA_COLOR/LABEL)
Nodos clave: `ESTADO_RUTA_COLOR`, `ESTADO_RUTA_LABEL`, `RutaCard()`, `getKpis()`, `getNeveras()`

#### C64 (14 nodos) — Hospital detail cards (fmtFechaHora, checkin UI)
Nodos clave: `Card()`, `fmtFechaHora()`, `garantiaStatus()`, `HardwarePassportPage()`, `INC_ESTADO_COLOR`

#### C65 (14 nodos) — Presence (getActiveUsers, collaborative editing)
Nodos clave: `presence.ts`, `getActiveUsers()`, `heartbeat()`, `lastCleanup`, `leave()`

#### C66 (13 nodos) — QuickActionsFAB (context actions, CustomEvent dispatch)
Nodos clave: `QuickActionsFAB.tsx`, `Action`, `IcoAlert()`, `IcoBuilding()`, `IcoCalendar()`

#### C67 (13 nodos) — Build scripts + CI config
Nodos clave: `scripts`, `build`, `db:generate`, `db:migrate`, `db:push`

#### C68 (13 nodos) — PWA manifest (background_color, icons)
Nodos clave: `manifest.json`, `background_color`, `categories`, `description`, `display`

#### C69 (12 nodos) — Docs sprint history (AGENTS.md implemented features)
Nodos clave: `Implemented Features Summary (Sprint 1-18)`, `Timeline Global de Actividad — /actividad, feed estilo GitHub, filtros por entidad`, `Check-in/Check-out Hospitales — CheckinHospital model, idempotent, live counter 60s`, `Pasaporte Hardware — /share/hardware/[id], public no-auth page, CSP exempt`, `iCal Feed — HMAC-SHA256 token auth, visitas + recordatorios + hitos`

#### C70 (12 nodos) — Sidebar navigation + icon set
Nodos clave: `Sidebar.tsx`, `Icons`, `NAV_GROUPS`, `NAV_GROUPS_ADMIN`, `NAV_GROUPS_PROYECTOS`

#### C71 (12 nodos) — Hardware explorador tab (TabExplorador, PAGE_SIZES)
Nodos clave: `TabExplorador.tsx`, `PAGE_SIZES`, `Props`, `SortDir`, `SortKey`

#### C72 (11 nodos) — Docs assistant rules + feature backlog
Nodos clave: `Assistant Rules — simplicity, mobile-first, UI/UX Pro Max`, `Feature Backlog — Resend email, VAPID push, offline, incidencias`, `Disabled Modules — CRM Pipeline, Incidencias toggle`, `Hardware Nomenclature — BC Robo, Zebra MC, Reader RFID, etc.`, `Prisma 7 Critical Rules`

#### C73 (11 nodos) — Admin hospitales CRUD form (HospitalesAdminPage)
Nodos clave: `FORM_EMPTY`, `HospitalesAdminPage()`, `SkeletonRow()`, `TIPO_COLOR`, `TIPO_LABELS_FULL`

#### C74 (10 nodos) — Docs API rules (AGENTS.md APIs section)
Nodos clave: `AGENTS.md`, `APIs — notas importantes`, `Checklist obligatorio antes de cada deploy a produccion`, `Completado (sesion 2026-05-22)`, `Estructura de ficheros clave`

#### C75 (10 nodos) — Docs conventions + brand tokens (TEAL, ORANGE)
Nodos clave: `Code Conventions — use client first line, brand.ts colors, SVG icons`, `Brand Tokens — TEAL=#00A99D, ORANGE=#F7941D (never hardcode hex)`, `Palex Platform — Hospital Project Management SaaS (internal tool)`, `Design System — Accessible & Ethical Style (WCAG, 44px touch, skip links)`, `Design System — Anti-Patterns (no neon, no motion-heavy, no emojis as icons)`

#### C76 (10 nodos) — Docs file structure + graphify rules
Nodos clave: `File Structure — src/app, components, hooks, lib`, `Graphify Query Rules — query/path/explain before raw grep`, `checkRateLimit() — God Node (22 edges, rate limiting across all APIs)`, `Graphify Knowledge Graph — 1229 nodes, 1607 edges, 115 communities, god nodes`, `openDB() — God Node (10 edges, IndexedDB offline)`

#### C77 (10 nodos) — Docs NextAuth v5 + Prisma models (27 tables)
Nodos clave: `NextAuth v5 Critical Rules`, `Prisma Data Models (27 tables, 15 enums)`, `API Endpoints (~50 REST routes) — hospitales, visitas, proyectos`, `Auth System — NextAuth v5 split config, JWT revocation, IDOR`, `Data Models — 27 tables, ER relationships, 15 enums`

#### C78 (10 nodos) — Stop status colors (ESTADO_PARADA_COLOR/LABEL)
Nodos clave: `ESTADO_PARADA_COLOR`, `ESTADO_PARADA_LABEL`, `ESTADO_RUTA_COLOR`, `ESTADO_RUTA_LABEL`, `TransporteMapaLeaflet()`

#### C79 (10 nodos) — Incidencias priority/state order (ESTADO_ORDER, GRAV_COLOR)
Nodos clave: `ESTADO_ORDER`, `GRAV_COLOR`, `GRAV_ORDER`, `SortDir`, `SortKey`

#### C80 (10 nodos) — ESLint + devDependencies
Nodos clave: `eslint.config.mjs`, `devDependencies`, `dotenv`, `eslint`, `@playwright/test`

#### C81 (10 nodos) — Incidencias diasDesde + Etapa helpers
Nodos clave: `diasDesde()`, `Etapa`, `ETAPA_COLOR`, `ETAPA_LABEL`, `ETAPAS`

#### C82 (9 nodos) — Docs deploy + Railway config + tech stack
Nodos clave: `Deploy Checklist & Railway Config`, `Tech Stack (Next.js 14+, Prisma 7, NextAuth v5, Redis, Railway)`, `Next.js 14+ App Router — server/client components, route groups, edge middleware`, `PWA Offline — IndexedDB + Service Worker, draft auto-save for visitas`, `Railway Deploy — auto-deploy on git push, prisma db push on start, healthcheck /api/health`

#### C83 (9 nodos) — BottomNav mobile (NavTab, glass, safe-area)
Nodos clave: `BottomNav.tsx`, `NavTab`, `tabs`, `PageTransition.tsx`, `PageTransition()`

#### C84 (9 nodos) — Severity labels (SEV_COLOR, SEV_LABEL)
Nodos clave: `SEV_COLOR`, `SEV_LABEL`, `timeAgo()`, `TIPO_LABEL`, `AlertaTransporte`

#### C85 (9 nodos) — Estado/gravedad labels (incidencias)
Nodos clave: `ESTADO_LABEL`, `GRAVEDAD_COLOR`, `KpiMini()`, `TIPO_LABEL`, `IncidenciaTransporte`

#### C86 (9 nodos) — Auth edge config + middleware (auth.config.ts)
Nodos clave: `auth.config.ts`, `middleware.ts`, `{ auth }`, `config`, `PROTECTED_PREFIXES`

#### C87 (8 nodos) — Admin auth navigation guards
Nodos clave: `Admin`, `Auth y navegacion`, `Calidad tecnica`, `CRM / Ventas`, `Dark mode (globals.css)`

#### C88 (8 nodos) — Admin analytics tab (TabAnalitica, ComparadorMeses)
Nodos clave: `TabAnalitica.tsx`, `ComparadorMeses()`, `DIAS`, `DiaSemanaHeatmap()`, `EstacionalidadChart()`

#### C89 (8 nodos) — Notas equipo API route (NotaPatch, CRUD)
Nodos clave: `NotaPatch`, `route.ts`, `GET()`, `NotaCreate`, `POST()`

#### C90 (8 nodos) — Package.json engine config
Nodos clave: `package.json`, `engines`, `node`, `name`, `prisma`

#### C91 (7 nodos) — NotificationManager (browser push, polling 60s)
Nodos clave: `NotificationManager.tsx`, `getShownIds()`, `IconBell()`, `IconX()`, `isDismissed()`

#### C92 (6 nodos) — Docs API rules + hospital score breakdown
Nodos clave: `API Rules — Rate limiting, Zod, IDOR, pagination`, `Hospital Health Score — 0-100 dynamic (visitas 30pts, proyectos 30pts, HW 20pts, llamadas 20pts, -15pts criticas)`, `Hospital Score API — GET /api/hospitales/[id]/score + batch /api/hospitales/score?ids=`, `Incidencias Equipo Enum — SERVICIO_TECNICO, APLICACIONES, COMERCIAL, MARKETING, PROYECTOS (5, no AMBOS)`, `SLA Pause Mechanism — slaPausadoEn + slaPausadoMs on PENDIENTE_CLIENTE/PROVEEDOR`

#### C93 (6 nodos) — Docs roadmap (feature backlog, tiers)
Nodos clave: `Roadmap de funcionalidades — analisis mayo 2026`, `TIER 1 — Productividad diaria (mayor ROI para el usuario)`, `TIER 2 — Colaboracion y visibilidad de equipo`, `TIER 3 — Datos e informes`, `TIER 4 — Campo y movilidad`

#### C94 (6 nodos) — Root app layout (geistSans, metadata)
Nodos clave: `layout.tsx`, `geistSans`, `metadata`, `RootLayout()`, `viewport`

#### C95 (6 nodos) — useFavoritos hook (TipoFavorito, DB-backed)
Nodos clave: `useFavoritos.ts`, `TipoFavorito`, `useFavoritos()`, `HospitalesPage()`, `PreProyectosPage()`

#### C96 (6 nodos) — iCal calendar route (foldLine, HMAC token)
Nodos clave: `route.ts`, `foldLine()`, `GET()`, `icalEscape()`, `toICalDate()`

#### C97 (6 nodos) — Hospital score lib (computeHospitalScore, 0-100)
Nodos clave: `hospital-score.ts`, `computeHospitalScore()`, `route.ts`, `GET()`, `route.ts`

#### C100 (6 nodos) — Service worker PWA (cacheFirst, offline)
Nodos clave: `sw.js`, `cacheFirst()`, `networkFirstAPI()`, `networkFirstPage()`, `PRECACHE_ASSETS`

#### C102 (5 nodos) — Docs NextAuth + Prisma critical rules
Nodos clave: `NextAuth v5 — CRITICO`, `Prisma — CRITICO`, `Roles del sistema`, `Stack tecnico (NO cambiar sin justificacion)`, `URL routing — CRITICO`

#### C103 (5 nodos) — Docs sprint history (pendiente, sprint 6)
Nodos clave: `Pendiente inmediato (proxima sesion)`, `Sprint 6 — Quick wins de alto impacto`, `Sprint 7 — Colaboracion`, `Sprint 8 — Datos y reportes`, `Sprint 9 — Calidad tecnica`

#### C104 (5 nodos) — Claude settings + hooks config
Nodos clave: `settings.json`, `hooks`, `PreToolUse`, `session_start.py`, `Hook SessionStart — inyecta CONTEXT.md y estado del grafo graphify. Ejecutado au`

#### C105 (5 nodos) — Prisma seed modulos (seed-modulos.ts)
Nodos clave: `seed-modulos.ts`, `adapter`, `db`, `main()`, `MODULOS`

#### C106 (5 nodos) — Sentry config (edge, server)
Nodos clave: `sentry.edge.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`, `onRequestError()`, `register()`

### Comunidades de ruido (Lighthouse / herramientas externas)

Las siguientes comunidades contienen nodos de archivos JSON de Lighthouse y otras herramientas externas.

| ID | Tamaño | Etiqueta |
|----|--------|----------|
| C2 | 80 | Lighthouse JSON noise (axe-core audits 1) |
| C3 | 80 | Lighthouse JSON noise (axe-core audits 2) |
| C4 | 79 | Lighthouse JSON noise (axe-core audits 3) |
| C5 | 79 | Lighthouse JSON noise (axe-core audits 4) |
| C6 | 76 | Lighthouse JSON noise (axe-core audits 5) |
| C9 | 68 | Lighthouse JSON noise (axe-core audits 6) |
| C10 | 68 | Lighthouse JSON noise (axe-core audits 7) |
| C11 | 68 | Lighthouse JSON noise (axe-core audits 8) |
| C12 | 67 | Lighthouse JSON noise (axe-core audits 9) |
| C14 | 56 | Graphify skill internals (core.py, BM25) |
| C17 | 46 | Lighthouse JSON noise (finalDisplayedUrl, fetchTime) |
| C21 | 38 | Graphify skill docs (SKILL.md, accessibility notes) |
| C28 | 33 | Lighthouse JSON noise (lighthouse-final.json) |
| C55 | 16 | Lighthouse JSON noise (lighthouse-desktop.json) |
| C56 | 16 | Lighthouse JSON noise (lighthouse-final3.json) |
| C98 | 6 | Lighthouse axe-core noise |
| C99 | 6 | Lighthouse axe-core noise |
| C101 | 5 | Graphify skill git sandbox notes |

### Comunidades pequeñas (< 5 nodos)

| ID | Tamaño | Etiqueta |
|----|--------|----------|
| C107 | 4 | IDOR access check (canAccessVisita, canAccessProyecto) |
| C108 | 4 | Lighthouse benchmarkIndex noise |
| C109 | 4 | Lighthouse runtimeError noise |
| C110 | 4 | Lighthouse benchmarkIndex noise |
| C111 | 4 | Lighthouse runtimeError noise |
| C112 | 4 | Lighthouse benchmarkIndex noise |
| C113 | 4 | Lighthouse runtimeError noise |
| C114 | 4 | Prisma DB seed (seed.ts) |
| C115 | 4 | Next.js README + Vercel docs |
| C116 | 4 | NextAuth JWT type declarations (next-auth.d.ts) |
| C117 | 3 | Error boundary component (error.tsx) |
| C118 | 3 | Docs hardware module + nomenclatura Palex |
| C119 | 3 | Error page props (error.tsx variant) |
| C120 | 3 | Claude settings local (permissions) |
| C121 | 3 | Error boundary component (error.tsx variant) |
| C122 | 3 | Error boundary component (error.tsx variant) |
| C123 | 3 | Error boundary component (error.tsx variant) |
| C124 | 3 | Error boundary component (error.tsx variant) |
| C125 | 3 | UI/UX Pro Max skill (search.py, format_output) |
| C126 | 3 | Hardware pasaporte share page (ShareData, /share/hardware) |
| C127 | 3 | Error boundary component (error.tsx variant) |
| C128 | 3 | Error boundary component (error.tsx variant) |
| C129 | 3 | Error boundary component (error.tsx variant) |
| C130 | 2 | Global error boundary (global-error.tsx) |
| C131 | 2 | Root page redirect (RootPage) |
| C132 | 2 | Generic API GET route |
| C133 | 2 | PostCSS config |
| C134 | 2 | Unauthorized page (401/403) |
| C135 | 1 | CLAUDE.md project instructions |
| C136 | 1 | Playwright auth setup (auth.setup.ts) |
| C137 | 1 | Playwright hospitales E2E tests |
| C138 | 1 | Playwright login E2E tests |
| C139 | 1 | Playwright navegacion E2E tests |
| C140 | 1 | Playwright pipeline E2E tests |
| C141 | 1 | Playwright proyectos E2E tests |
| C142 | 1 | Playwright visitas E2E tests |
| C143 | 1 | next.config.ts (CSP, headers) |
| C144 | 1 | Shared GET/POST API exports |
| C145 | 1 | Playwright config (playwright.config.ts) |
| C146 | 1 | Prisma config (prisma.config.ts, adapter-pg) |
| C147 | 1 | Sentry client config (sentry.client.config.ts) |