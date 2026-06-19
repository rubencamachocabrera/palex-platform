# CONTEXT — InLab Palex Platform
> Resumen compacto generado con graphifyy 0.8.30 (AST, 1229 nodos · 1607 edges · 115 comunidades).
> Actualizar con `python -m graphify update .` tras cambios de código.
> Commit base: `1a72ed4` (16 jun 2026 — sprint 9 auditoría)

---

## 1. Qué es el proyecto

Plataforma interna de **Palex Medical** para gestión de proyectos hospitalarios.
Nombre comercial: **InLab**. Uso privado, acceso restringido por rol.
- URL producción: `https://palex-platform-production.up.railway.app`
- Deploy automático desde `git push origin main` → Railway

---

## 2. Stack técnico

| Capa | Tecnología |
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
│   │   ├── dashboard/page.tsx  ← Dashboard por rol (Admin/Ventas/Proyectos)
│   │   ├── hospitales/
│   │   │   ├── page.tsx        ← Lista + filtro zona + grid/list + favoritos
│   │   │   └── [id]/page.tsx   ← Detalle: KPIs, tabs Contactos/Visitas/Timeline
│   │   ├── visitas/
│   │   │   ├── page.tsx        ← Lista + busqueda + quick-create modal
│   │   │   ├── calendario/page.tsx ← Vista mensual con dots por estado
│   │   │   └── [id]/page.tsx   ← Formulario 13 secciones, fotos, PDF, offline
│   │   ├── ventas/pipeline/
│   │   │   ├── page.tsx        ← CRM Kanban con @dnd-kit (DraggableCard, DroppableColumn)
│   │   │   └── [id]/page.tsx   ← Ficha oportunidad + historial de etapas
│   │   ├── pre-proyectos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── proyectos/
│   │   │   └── [id]/page.tsx   ← Detalle: fases, módulos Inlab, ProyectoDetallePage
│   │   ├── hardware/page.tsx   ← Tabs: Resumen/Inventario/Instalaciones/Catálogo/Alertas
│   │   ├── admin/              ← CRUD completo: usuarios, zonas, hospitales, hardware
│   │   ├── mapa/               ← Leaflet (MapaLeaflet), coordenadas por ciudad
│   │   ├── datos/              ← KPIs explotación de datos
│   │   └── perfil/page.tsx
│   ├── api/                    ← Todas las API routes (ver sección 6)
│   └── globals.css             ← Tailwind v4, dark mode via clase .dark, tokens CSS
├── components/
│   ├── Sidebar.tsx             ← Dark #0f172a, colapsable 256/64px, nav por ROL
│   ├── TopBar.tsx              ← Búsqueda global debounced, toggle dark/light, notificaciones
│   ├── ThemeProvider.tsx       ← Context dark/light, localStorage palex_theme, anti-FOUC
│   ├── CommandPalette.tsx      ← Cmd+K, cache 60s
│   ├── KeyboardShortcutsProvider.tsx
│   ├── Toast.tsx               ← Global ToastProvider + useToast() (god node: 42 edges)
│   ├── PageTransition.tsx
│   ├── OfflineIndicator.tsx
│   ├── ServiceWorkerRegistrar.tsx
│   └── ui/
│       ├── EmptyState.tsx      ← EmptyState() usado en todas las listas
│       ├── Icons.tsx           ← TODOS los iconos SVG del proyecto (NO emojis)
│       ├── PageHeader.tsx
│       └── Skeleton.tsx        ← cn(), Skeleton, SkeletonCard, SkeletonKPI...
├── hooks/
│   ├── useKeyboardShortcuts.ts ← Cmd+K, G+H/V/P/D, Escape
│   └── useOfflineSync.ts       ← useOfflineSync(), useOnlineStatus(), SaveStatus
├── lib/
│   ├── auth.config.ts          ← Edge-compatible
│   ├── auth.ts                 ← Server-side NextAuth
│   ├── brand.ts                ← TEAL=#00A99D, TEAL_LIGHT, TEAL_DARK, ORANGE=#F7941D
│   ├── csv.ts                  ← exportarCSV()
│   ├── db.ts                   ← Prisma singleton (SIEMPRE importar desde aquí)
│   ├── form-schema.ts          ← FORM_SCHEMA: 13 secciones formulario visita
│   ├── img-compress.ts         ← comprimirImagen() Canvas API
│   ├── offline-db.ts           ← IndexedDB: openDB, saveDraft, getDraft, enqueueSync...
│   ├── rate-limit.ts           ← checkRateLimit() (god node: 22 edges)
│   └── visita-analysis.ts      ← detectarRiesgos() + calcularScore() (score 0-100)
├── middleware.ts               ← Protege rutas, edge-compatible
└── types/next-auth.d.ts        ← Extiende Session, User, JWT con id, rol, nombre
```

---

## 4. Roles del sistema

```
ADMIN      → acceso total
VENTAS     → dashboard, hospitales, pipeline CRM
PROYECTOS  → dashboard, mis hospitales, mis visitas, calendario
TECNICO    → igual que PROYECTOS
```

Obtener rol en cliente: `fetch("/api/perfil")` — **NUNCA** `useSession` (eliminado).

---

## 5. Autenticación

- `auth()` solo en servidor / server components / API routes
- Variable env: `AUTH_SECRET` (no NEXTAUTH_SECRET), `AUTH_URL` en Railway
- Middleware en `src/middleware.ts` protege todas las rutas dashboard
- Login en `(auth)/login/page.tsx` → `signIn("credentials", {...})`
- Community 42 (cohesión 0.24): `authConfig`, `{ auth }`, `PROTECTED_PREFIXES`

---

## 6. API Routes principales

```
/api/auth/[...nextauth]    ← NextAuth handler
/api/hospitales            ← GET (Cache 30s), POST
/api/hospitales/[id]       ← GET (verifica zona no-ADMIN, take:50 visitas), PATCH (whitelist campos), DELETE
/api/hospitales/[id]/contactos
/api/hospitales/[id]/timeline
/api/visitas               ← GET select sin `datos`, ?desde=&hasta= (Cache 15s)
/api/visitas/[id]          ← GET con `datos` completo
/api/oportunidades         ← CRM pipeline (Cache 15s)
/api/oportunidades/[id]
/api/pre-proyectos
/api/pre-proyectos/[id]/adjuntos
/api/hardware              ← CRUD hardware (GET Cache 60s)
/api/hardware/tipos        ← HardwareTipo dinámico
/api/hardware/unidades     ← GET Cache 30s — POST/PUT requieren ADMIN o PROYECTOS
/api/notificaciones
/api/perfil                ← Devuelve { rol: ... } — usar d?.rol (NO d?.role)
/api/search                ← Búsqueda unificada hospitales+visitas (max 6+5, Cache 30s)
/api/config                ← GET/PATCH configuración app
/api/health                ← Healthcheck Railway
/api/share/[token]         ← Pre-proyecto público (sin email/PII de contactos)
/api/proyectos/[id]/mapa/compartir ← Token generado con crypto.randomBytes(18)
/api/zonas/[id]            ← PATCH con whitelist (nombre, descripcion, activo)
```

**Regla crítica:** El campo `datos` (JSON formulario completo) SOLO se devuelve en `/api/visitas/[id]`.

---

## 7. Base de datos — Prisma 7

**CRÍTICO:**
- NO usar `url` en bloque `datasource` (usa adapter-pg)
- Siempre importar Prisma desde `@/lib/db.ts`
- `npx prisma db push` para cambios (nunca `migrate` en producción sin revisar)
- `npx prisma generate` después de cada cambio en `schema.prisma`
- Config real en `prisma.config.ts` (raíz)
- `@map("nombre_diferente")` cuando hay conflicto nombre relación/columna DB
- `orderBy` sobre relación: `{ tipo: { nombre: "asc" } }` NO `{ tipo: "asc" }`
- `--accept-data-loss` solo cubre DROP columnas con datos, NO añadir NOT NULL sin default

**Modelos principales:**
```
Hospital, Contacto, Visita (campo datos: JSON), Oportunidad, HistorialEntry
PreProyecto, Adjunto, Proyecto, Fase, ProyectoModulo, Hito
HardwareTipo (dinámico, color hex), HardwareCatalogo (referenciaPalex), HardwareUnidad
Usuario (Rol enum: ADMIN|VENTAS|PROYECTOS|TECNICO), Zona, ModuloInlab, Config
```

---

## 8. Módulos principales

### Hospitales
- Lista: filtro zona, toggle grid/lista, búsqueda, `useFavoritos()`
- Detalle: KPIs visitas, tabs Contactos/Visitas, CRUD contactos, timeline actividad

### Visitas (formulario 13 secciones)
- `FORM_SCHEMA` en `lib/form-schema.ts` — `getSections()`, `initFormData()`
- `AnalisisPanel()` → `calcularScore()` + `detectarRiesgos()` (14 reglas, score 0-100)
- PDF profesional, export JSON, `TodoChecklist`, `VoiceNotes`, offline con IndexedDB
- `useOfflineSync()` — restaura borrador si más completo que servidor
- Sección s_termo: neveras/termografía (RFID + BT), SubHeaders visuales

### Visitas Calendario
- Solo carga visitas del mes visible (`?desde=&hasta=`)
- `CalendarioPage()`: `diasEnMes()`, `fechaKey()`, `primerDiaMes()`, `DIAS_SEMANA`

### CRM / Ventas Pipeline
- Kanban con @dnd-kit: `DraggableCard()`, `DroppableColumn()`
- Etapas enum Prisma: `IDENTIFICADO | PRIMERA_VISITA | PROPUESTA | NEGOCIACION | GANADO | PERDIDO`
- ⚠️ CRÍTICO: usar `PRIMERA_VISITA` (NO `CONTACTADO`) — ambos archivos deben coincidir con el enum
- `valorPonderado()`, `fmtEuros()`, `PROB_DEFECTO`, `PROB_BAR_COLOR`
- Ficha oportunidad: `PipelineFichaPage()` + `HistorialEntry` de cambios de etapa

### Hardware
- `HardwareTipo` dinámico con color hex desde admin
- `HardwareCatalogo`: `referenciaPalex` (mostrar en teal monospace), `tipoId @map("tipo_id")`
- `HardwareUnidad` estados: `DISPONIBLE|ASIGNADO|EN_MANTENIMIENTO|RETIRADO|BAJA`
- Community 3 (cohesión 0.05): `CAT_FORM_EMPTY`, `EditUnidadDrawer()`, `HW_ESTADO`...

### Proyectos
- `ProyectoDetallePage()`: fases, módulos Inlab, `ESTADO_MODULO_COLOR`
- `EstadoModulo`, `ProyectoModulo`, `Fase`

### Admin
- CRUD: usuarios (asignación zonas), zonas, hospitales, hardware, visitas
- Export CSV: `exportarCSV()` en `lib/csv.ts`

---

## 9. UI/UX — Reglas críticas

```typescript
// Brand tokens — SIEMPRE importar, NUNCA hardcodear
import { TEAL, TEAL_LIGHT, TEAL_DARK, ORANGE, ORANGE_LIGHT, ORANGE_DARK } from "@/lib/brand"
// TEAL = "#00A99D"  |  ORANGE = "#F7941D"
```

- `"use client"` debe ser la PRIMERA línea (sin nada antes)
- Iconos: SIEMPRE SVG de `src/components/ui/Icons.tsx` (NO emojis)
- Tap targets móvil: mínimo 44px altura
- `EmptyState()` en todas las listas vacías
- `Skeleton` shimmer en todas las cargas
- `useToast()` para feedback — god node más conectado (42 edges)
- Dark mode: clase `.dark` en `<html>`, variables CSS, `@variant dark` en Tailwind v4
- `comprimirImagen()` de `img-compress.ts` antes de guardar fotos

---

## 10. URL routing — CRÍTICO

El route group `(dashboard)` NO añade nada a la URL:
```
/dashboard      /hospitales      /visitas
/ventas/pipeline /pre-proyectos  /proyectos
/hardware       /mapa            /datos
/admin          /perfil
```
**NO usar** `/dashboard/hospitales`, `/dashboard/visitas`, etc.

---

## 11. Sidebar — Nav por rol

```typescript
// NAV_GROUPS      → PROYECTOS + TECNICO
// NAV_GROUPS_VENTAS → VENTAS
// NAV_GROUPS_ADMIN  → ADMIN
```
Dark `#0f172a`, colapsable 256/64px. `Icons` objeto SVG en `Sidebar.tsx:L30`.

---

## 12. Nomenclatura hardware Palex

| Nombre correcto | Descripción |
|----------------|-------------|
| BC Robo | Autómata dispensación tubos (NO "BCRobot") |
| Zebra MC | Terminal móvil handheld |
| Zebra Impresora | Impresora etiquetas código de barras |
| Reader RFID | Lector RFID fijo |
| Gateway BT | Gateway Bluetooth neveras |
| Mini-PC | PC industrial termografía |
| Nevera | Cadena de frío muestras biológicas |

---

## 13. God Nodes (nodos más conectados)

1. `useToast()` — 42 edges → `src/components/Toast.tsx:L94`
2. `checkRateLimit()` — 22 edges → `src/lib/rate-limit.ts`
3. `compilerOptions` — 16 edges → `tsconfig.json`
4. `openDB()` — 10 edges → `src/lib/offline-db.ts:L33`
5. `promisify()` — 10 edges → `src/lib/offline-db.ts:L70`
6. `EmptyState()` — bridge entre 6 comunidades → `src/components/ui/EmptyState.tsx`
7. `authConfig` — bridge auth → `src/lib/auth.config.ts`

---

## 14. Checklist deploy a producción

1. `git status` — todos los archivos modificados staged
2. `npx tsc --noEmit` — cero errores
3. `npx next build` — recomendado si tocas API routes o server components
4. `git push origin main` → Railway auto-despliega

**Railway:**
- Config: `railway.toml` (NO `railway.json`)
- Build: `npx prisma generate && next build`
- Start: `npx prisma db push --accept-data-loss && npm start`
- Healthcheck: `/api/health`, timeout 120s
- Vars: `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`

---

## 15. Comandos graphify (mantener el grafo actualizado)

```bash
# Tras modificar código (AST, sin coste LLM):
python -m graphify update .

# Consultar el grafo para entender contexto:
python -m graphify query "pregunta sobre el código" --budget 3000

# Trazar relación entre dos símbolos:
python -m graphify path "useToast()" "HospitalesAdminPage()"

# Explicar un símbolo:
python -m graphify explain "calcularScore()"
```

---

## 16. Estado actual (junio 2026, auditado 2026-06-19)

**Completado (sprints 1-9):**
- Auth completa (login, middleware, roles)
- Hospitales: lista, detalle, contactos, timeline de actividad, QR
- Visitas: formulario 13 secciones, calendario, PDF, offline, análisis, comentarios
- CRM Pipeline: Kanban @dnd-kit, historial etapas, ficha oportunidad
- Hardware: tipos dinámicos, catálogo, inventario, drawer admin
- Admin: CRUD completo, export CSV
- Mapa Leaflet, Explotación de datos (/datos — mockup, arquitectura lista para API real)
- Pre-proyectos con adjuntos, PDF, comentarios
- Vincular visita → proyecto con selector + progreso fases
- Vista "Mi Día" en dashboard (Ventas + Proyectos)
- Búsqueda avanzada: filtros fecha, estado, tipo, zona en /visitas
- PWA: manifest + SW + IndexedDB
- Dark mode + ThemeProvider + anti-FOUC
- Command Palette (Cmd+K), atajos teclado
- Error boundaries (error.tsx) en 15 rutas
- Seguridad: IDOR, mass assignment whitelist, crypto tokens, CSP header

**Bugs conocidos / deuda técnica (backlog):**
- `/datos` es 100% mockup — no hay APIs reales detrás
- Dark mode incompleto en algunos drawers (estilos inline no respetan `.dark`)
- `Tarea.asignadoA` es String libre (no FK a Usuario)
- `/proyectos` no tiene enlace en ningún nav group
- `CACHE_VERSION = 'palex-v1'` hardcodeado en SW (incrementar en cada deploy relevante)
- JWT sin `maxAge` explícito (usa default 30 días de NextAuth)
- `mapaHtml` se guarda sin sanitizar (riesgo XSS si se renderiza con dangerouslySetInnerHTML)
- `GET /api/proyectos` devuelve todos los proyectos sin filtro de zona
- Comentarios de visita no verifican acceso a la visita padre
- Fases de pre-proyecto no verifican pertenencia al proyecto en PATCH
- Modelo Visita no tiene campo `titulo` — las visitas no se pueden nombrar

**Pendiente (próximos sprints):**

Sprint 10 — UX visitas + vinculación:
- Añadir campo `titulo` a modelo Visita (schema + API + modal + lista)
- UI selector visita → oportunidad en formulario (backend listo, falta frontend)
- Conectar /datos a APIs reales

Sprint 11 — Calidad y producción:
- Sentry para errores en producción
- Lighthouse audit (objetivo >90)
- Tests E2E con Playwright
- Sanitizar mapaHtml (XSS)
- Filtro zona en GET /api/proyectos
- Verificar acceso en comentarios y fases
