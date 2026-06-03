# Graph Report - .  (2026-06-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1229 nodes · 1607 edges · 115 communities (94 shown, 21 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfdf2b1b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 112|Community 112]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 42 edges
2. `checkRateLimit()` - 22 edges
3. `compilerOptions` - 16 edges
4. `PALEX PLATFORM — Contexto de Proyecto para IA` - 15 edges
5. `scripts` - 13 edges
6. `UI/UX Pro Max - Design Intelligence` - 13 edges
7. `str` - 12 edges
8. `DesignSystemGenerator` - 11 edges
9. `openDB()` - 10 edges
10. `promisify()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `MaterialDrawer()` --calls--> `useToast()`  [INFERRED]
  src/app/(dashboard)/admin/hardware/page.tsx → src/components/Toast.tsx
- `HospitalesAdminPage()` --calls--> `useToast()`  [INFERRED]
  src/app/(dashboard)/admin/hospitales/page.tsx → src/components/Toast.tsx
- `TiposModal()` --calls--> `useToast()`  [INFERRED]
  src/app/(dashboard)/admin/hardware/page.tsx → src/components/Toast.tsx
- `UnidadesModal()` --calls--> `useToast()`  [INFERRED]
  src/app/(dashboard)/admin/hardware/page.tsx → src/components/Toast.tsx
- `CatalogoTab()` --calls--> `useToast()`  [INFERRED]
  src/app/(dashboard)/admin/hardware/page.tsx → src/components/Toast.tsx

## Import Cycles
- None detected.

## Communities (115 total, 21 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (42): bool, BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (33): geistSans, metadata, viewport, OfflineIndicator(), ServiceWorkerRegistrar(), useSidebarToggle(), Ctx, Theme (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (37): Adjunto, CatalogoItemPicker, CONTACTO_FORM_EMPTY, ContactoPivot, EntradaTimeline, Fase, FASE_ESTADO_COLOR, fmtFechaInput() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (20): CAT_FORM_EMPTY, diasDesde(), EditUnidadDrawer(), fmtAntiguedad(), HardwareCatalogo, HardwareUnidad, HW_ESTADO, InstalacionesTab() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (41): Admin, APIs — notas importantes, Auth y navegacion, Calidad tecnica, Checklist obligatorio antes de cada deploy a produccion, Completado (sesion 2026-05-22), Completado (sesion 2026-05-29), CRM / Ventas (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (41): 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Layout & Responsive (HIGH), 5. Typography & Color (MEDIUM), 6. Animation (MEDIUM), 7. Style Selection (MEDIUM), 8. Charts & Data (LOW) (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (17): Accion, ACCIONES_BASE, CommandPalette(), KeyboardShortcutsProvider(), PageTransition(), Icons, NAV_GROUPS, NAV_GROUPS_ADMIN (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (19): agruparPorMes(), agruparPrevisionPorMes(), calcTrend(), DashboardAdmin(), DashboardProyectos(), DashboardVentas(), ESTADO_COLOR, ESTADO_LABEL (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (14): ContactoItem, Foto, FotosMap, OportunidadItem, PreProyectoItem, PrintView, SECTION_ICON, VisitaData (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (23): IconAlertCircle(), IconAlertTriangle(), IconArrowLeft(), IconArrowRight(), IconBriefcase(), IconCalendar(), IconCamera(), IconChevronRight() (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (12): CatalogoCard(), CatalogoItem, COLORES_PRESET, ESTADO_INFO, FORM_EMPTY, ringStyle, UnidadItem, CatalogoDoc (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (19): GET(), POST(), checkRateLimit(), lastCleanup, maybePurge(), RateLimitEntry, RateLimitOptions, store (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (23): useToast(), Config, ConfiguracionPage(), ModuloItem, ModulosInlabSection(), PlantillasSection(), AlertasTab(), AsignarUnidadModal() (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (12): avatarColor(), IconProps, isRol(), Rol, ROL_CONFIG, RolConfig, ROLES, RolPill() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (14): CardContent(), ESTADO_COLOR, ESTADO_LABEL, estadoEfectivo(), ESTADOS, FaseResumen, fmtFecha(), Hospital (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (21): DraggableCard(), Etapa, ETAPA_COLOR, ETAPA_LABEL, ETAPAS, fmtEuros(), FORM_VACIO, FormState (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (12): EVENTOS, generarDatos(), Hospital, PeriodoKey, PERIODOS, PuntoTemporal, SEASONAL_MULT, seededRand() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (7): cn(), Skeleton(), SkeletonCard(), SkeletonFormSection(), SkeletonKPI(), SkeletonProps, SkeletonRow()

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (13): FORM_EMPTY, HospitalesAdminPage(), TIPO_COLOR, TIPO_LABELS_FULL, Zona, exportarCSV(), exportarExcel(), exportarExcelSimple() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (17): CONTACTO_EMPTY, fechaRel(), HospitalDetailPage(), TIMELINE_COLOR, TIMELINE_FILTROS, TimelineEvento, TimelineFiltro, TIPO_COLOR (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (10): ESTADO_MODULO_COLOR, ESTADO_MODULO_LABEL, EstadoModulo, ModuloInlab, Proyecto, ProyectoDetallePage(), ProyectoModulo, fmtFecha() (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (20): dependencies, @auth/prisma-adapter, bcryptjs, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, next, next-auth (+12 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (14): FieldType, FORM_SCHEMA, FormField, FormSection, getSections(), initFormData(), ESTADO_LABEL, Foto (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (16): Additional Forbidden Patterns, Anti-Patterns (Do NOT Use), Buttons, Cards, Color Palette, Component Specs, Design System Master File, Global Rules (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (5): Hospital, ModalProps, ModuloInlab, Proyecto, ProyectoModulo

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (15): ShareData, ContactoShare, ESTADO_COLOR, ESTADO_LABEL, FASE_COLOR, FaseShare, fmt(), HitoShare (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (9): CalendarioPage(), DIAS_SEMANA, diasEnMes(), ESTADO_COLOR, ESTADO_LABEL, fechaKey(), MESES, primerDiaMes() (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (11): HospitalesPage(), TIPO_ICON, useFavoritos(), Vista, Hospital, TIPO_LABELS, IconActivity(), IconBuilding() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (11): ESTADO_COLOR, ESTADO_LABEL, Visita, BreadcrumbItem, PageHeader(), PageHeaderProps, ESTADO_BAR, fechaRelativa() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (5): COORDS_POR_CIUDAD, HospitalMapa, TIPO_LABELS, ZONE_PALETTE, MapaLeaflet

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (10): AnalisisVisita, analizarVisita(), calcularScore(), detectarRiesgos(), Riesgo, RiesgoNivel, ScoreDetalle, AnalisisPanel() (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (13): scripts, build, db:generate, db:migrate, db:push, db:seed, db:seed-modulos, db:studio (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (12): background_color, categories, description, display, icons, lang, name, orientation (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (6): Toast, ToastContext, ToastContextValue, ToastType, Zona, ZonasPage()

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (5): avatarColor(), ConfigApp, PerfilData, PerfilPage(), ROL_CONFIG

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (11): devDependencies, dotenv, eslint, eslint-config-next, @playwright/test, @types/bcryptjs, @types/node, @types/pg (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (5): EmptyState(), EmptyStateAction, EmptyStateProps, IconType, ILLUSTRATIONS

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (9): diasDesde(), Etapa, ETAPA_COLOR, ETAPA_LABEL, ETAPAS, HistorialEntry, Oportunidad, PipelineFichaPage() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.24
Nodes (7): authConfig, { auth }, config, PROTECTED_PREFIXES, { auth }, config, PROTECTED_PREFIXES

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (7): engines, node, name, prisma, seed, private, version

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (3): Comentario, ComentariosPanel(), Props

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (3): adapter, db, MODULOS

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): AudioNota, RecordState, VoiceNotes(), VoiceNotesProps

### Community 50 - "Community 50"
Cohesion: 0.83
Nodes (3): GET(), getOrCreateConfig(), PATCH()

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (3): JWT, Session, User

## Knowledge Gaps
- **435 isolated node(s):** `allow`, `bool`, `eslintConfig`, `{ auth }`, `PROTECTED_PREFIXES` (+430 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 12` to `Community 2`, `Community 3`, `Community 37`, `Community 38`, `Community 10`, `Community 14`, `Community 20`, `Community 30`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `EmptyState()` connect `Community 40` to `Community 7`, `Community 17`, `Community 21`, `Community 27`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `authConfig` connect `Community 42` to `Community 13`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `useToast()` (e.g. with `AlertasTab()` and `AsignarUnidadModal()`) actually correct?**
  _`useToast()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **What connects `allow`, `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words` to the rest of the system?**
  _461 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05974025974025974 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07346938775510205 - nodes in this community are weakly interconnected._