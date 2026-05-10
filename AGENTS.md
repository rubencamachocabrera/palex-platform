<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 🧠 PALEX PLATFORM — Contexto de Proyecto para IA

> Este fichero es la fuente de verdad para el asistente IA.
> **Actualizar siempre que cambie el estado del proyecto.**
> Última actualización: 2026-05-10

---

## Stack técnico (NO cambiar sin justificación)

- Framework: Next.js 14+ App Router
- Lenguaje: TypeScript estricto
- UI: Tailwind CSS + shadcn/ui
- DB: PostgreSQL vía Railway
- ORM: Prisma 7 con @prisma/adapter-pg (sin `url` en datasource)
- Auth: NextAuth.js v5 — auth.config.ts para Edge, auth.ts para server
- Deploy: Railway (pendiente — app nunca ha salido a producción)
- VCS: Git + GitHub: rubencamachocabrera

### Prisma — CRÍTICO
- NO usar `url` en el bloque `datasource` (usa adapter-pg)
- Prisma Client se importa desde @/lib/db.ts

### NextAuth v5 — CRÍTICO
- auth() solo en servidor / server components / API routes
- NUNCA usar useSession — está eliminado de toda la app
- Roles: ADMIN, VENTAS, PROYECTOS
- Para obtener rol en cliente: fetch("/api/perfil")
- NEXTAUTH_URL NO debe estar en .env.local (NextAuth v5 lo detecta automáticamente)

### URL routing — CRÍTICO
- El route group (dashboard) NO añade nada a la URL
- Rutas reales: /hospitales, /visitas, /ventas, /admin, /perfil
- NO usar /dashboard/hospitales, /dashboard/visitas, etc.

---

## Estructura de ficheros clave

src/app/(dashboard)/layout.tsx         — Sidebar + TopBar (auth requerida)
src/app/(dashboard)/page.tsx           — Dashboard por rol
src/app/(dashboard)/hospitales/page.tsx — Lista hospitales filtro zonas + grid/list
src/app/(dashboard)/hospitales/[id]/page.tsx — Detalle + KPIs + visitas
src/app/(dashboard)/visitas/[id]/page.tsx    — Formulario 13 secciones (~793 líneas)
src/app/(dashboard)/ventas/pipeline/page.tsx — CRM pipeline KPIs
src/app/(dashboard)/admin/             — CRUD usuarios, zonas, hospitales, visitas
src/app/(dashboard)/perfil/page.tsx    — Editar nombre + cambiar contraseña
src/components/Sidebar.tsx
src/components/TopBar.tsx              — Buscador global debounced 300ms
src/components/OfflineIndicator.tsx    — Badge "Sin conexión" en TopBar
src/components/ServiceWorkerRegistrar.tsx — Registra /public/sw.js
src/lib/db.ts                          — Prisma client singleton
src/lib/img-compress.ts                — comprimirImagen(file, maxPx, quality) Canvas API
src/lib/offline-db.ts                  — IndexedDB: drafts visitas + sync-queue
src/lib/csv.ts                         — Export CSV helper
src/hooks/useOfflineSync.ts            — useOfflineSync + useOnlineStatus
public/manifest.json                   — PWA manifest (theme #00A99D)
public/sw.js                           — Service Worker
public/icon-192x192.png + icon-512x512.png
public/logo-palex.png

---

## Módulos implementados (mayo 2026)

IMPLEMENTADO:
- Auth completa con middleware edge-compatible
- Sidebar con nav por rol
- TopBar con buscador global
- Dashboards por rol (ADMIN, VENTAS, PROYECTOS)
- Hospitales: lista zonas/grid, detalle KPIs+tabs, CRUD admin
- Formulario visita preproyecto: 13 secciones, fotos por sección, PDF profesional Palex, export JSON, auto-save
- Pipeline CRM: KPIs, filtros, panel detalle, crear/editar oportunidades
- Admin: usuarios, zonas, hospitales, visitas, export CSV
- Perfil: editar nombre, cambiar contraseña
- Seed datos de prueba
- PWA: manifest, service worker, IndexedDB offline store, sync queue, OfflineIndicator
- Performance: loading.tsx por cada ruta, dynamic import de PrintView, useMemo/useCallback en formulario, next.config (compress, image formats, security headers)
- Skeleton components en src/components/ui/Skeleton.tsx (Skeleton, SkeletonCard, SkeletonRow, SkeletonKPI, SkeletonFormSection)

PENDIENTE INMEDIATO:
- Integrar useOfflineSync en visitas/[id]/page.tsx
- Performance: loading.tsx por ruta, dynamic imports, React.memo (Task 19)

BACKLOG ALTA PRIORIDAD:
- Integrar useOfflineSync hook en el formulario de visita (auto-save offline real)

BACKLOG MEDIA:
- Panel riesgos automático, score complejidad, QR hospital
- Plantillas visita rápida, comparativa visita anterior

BACKLOG BAJA:
- Sketch plano táctil, agenda próxima visita, OCR tarjeta contacto

---

## Reglas del asistente

1. NUNCA tocar código sin propuesta previa + confirmación
2. NUNCA asumir — UNA pregunta si hay duda
3. Simplicidad primero (dev en solitario)
4. Mobile-first siempre
5. UI/UX alta calidad — teal #00A99D como color principal
6. No insistir en deploy

Formato obligatorio antes de implementar:
📋 PROPUESTA / Qué voy a hacer / Cómo / Archivos / Complejidad / ¿Procedo?

---

## Patrones y convenciones

- API routes: try/catch siempre, retornar { error: "..." } status 500
- Client fetching: fetch("/api/...") con guard r.ok y Array.isArray()
- Imágenes: comprimirImagen() de @/lib/img-compress.ts
- Color principal: #00A99D (teal)
- Tap targets móvil: mínimo 44px
- Formularios: RadioPills/CheckPills (no radio/checkbox nativos)

## Sesion 4 - Offline sync + Panel de analisis (2026-05-10)

### Archivos nuevos
- src/hooks/useOfflineSync.ts -- Hook: auto-save IndexedDB (2s debounce) + cola sync + flush al reconectar
- src/lib/offline-db.ts -- IndexedDB wrapper: stores "visitas" (drafts) y "sync-queue"
- src/components/OfflineIndicator.tsx -- Badge animado "Sin conexion" cuando offline
- src/lib/visita-analysis.ts -- Motor de analisis: detectarRiesgos() 14 reglas + calcularScore() 0-100
- src/components/visitas/AnalisisPanel.tsx -- Panel visual: gauge SVG circular + lista riesgos expandibles

### Integracion en page.tsx (visitas/[id])
- useOfflineSync integrado: auto-save IndexedDB + restaura borrador local si mas completo que servidor
- AnalisisPanel montado entre acordeon de secciones y TodoChecklist
- Indicador offline en barra sticky movil y barra flotante desktop
- Sin caracteres especiales en heredocs (usar ASCII puro para evitar truncacion)

### Regla critica aprendida
El Edit tool TRUNCA ficheros si old_string contiene caracteres Unicode (ellipsis, bullet, check mark).
Solucion: usar Python con f.write() en bytes para reparar o escribir fragmentos con Unicode.
