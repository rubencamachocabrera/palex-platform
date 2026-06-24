# ARCHIVO HISTORICO — Sprints completados y deuda resuelta

> Este archivo contiene el historial de sprints completados y bugs resueltos.
> NO se importa como contexto — solo para consulta manual.
> Fuente activa: `AGENTS.md`

---

## Sprints completados

### Sprint 11 — UX y funcionalidad (COMPLETADO)
- [x] Eliminar visitas desde /visitas y ficha hospital (con confirmacion)
- [x] Fix dropdown nueva visita — selectores ajustados, overflow corregido
- [x] Navegacion contextual "Volver" — breadcrumb dinamico segun origen
- [x] Rediseño ancho detalle proyecto — overflow-x-hidden
- [x] Dashboard: accesos rapidos debajo de los 4 KPIs (por rol)
- [x] Estandarizar creacion visitas — modal unico con titulo + fecha + plantilla
- [x] Log de actividad solo ADMIN — modelo Prisma + API + pagina admin

### Sprint 12 — Seguridad, colaboracion y robustez (COMPLETADO)
- [x] XSS mapaHtml — sandbox iframe sin allow-same-origin
- [x] Filtro de zona en GET /api/proyectos + /api/proyectos/[id]
- [x] IDOR comentarios visita, fases proyecto, contactos proyecto
- [x] Acceso visitas por zona — GET/PATCH/DELETE por zona
- [x] Edicion colaborativa visitas — presencia en tiempo real
- [x] API /api/presence — tracking usuarios activos por entidad
- [x] Sentry para errores en produccion (client/server/edge)

### Sprint 13 — Calidad y testing (COMPLETADO)
- [x] Lighthouse: Performance 100, Accessibility 100, Best Practices 96, SEO 100
- [x] Tests E2E con Playwright (18 tests + auth setup + mobile viewport)
- [x] Dark mode completo en drawers/modales (20+ paginas)
- [x] Pulido visual global: skeleton-shimmer, card-hover, stagger-grid
- [x] Modal nueva visita mejorado: RadioPills + contacto principal
- [x] Auditoria responsive completa movil

### Sprint 15 — Tags, Menciones y Grupos (COMPLETADO)
- [x] Tags/Etiquetas: modelo Tag, pivots VisitaTag/ProyectoTag, TagSelector, Admin gestion
- [x] @Menciones en comentarios: MentionInput/MentionText, API menciones, notificaciones
- [x] Grupos hospitalarios: FK auto-referencial, cabecera/centros, indicadores lista

### Sprint 16 — Modo campo, Onboarding, Recordatorios (COMPLETADO)
- [x] BottomNav movil: 5 tabs (glass effect, safe area, TEAL active)
- [x] OnboardingWizard: pasos con SVG, slide animations, keyboard nav
- [x] API /api/onboarding: GET/PATCH onboardingCompletado
- [x] Modelo Recordatorio + API CRUD + pagina /recordatorios
- [x] Notificaciones recordatorios en TopBar, Dashboard Mi Dia

### Sprint 17 — Favoritos, Equipo, Excel, Notificaciones, iCal (COMPLETADO)
- [x] Modelo Favorito DB-backed: TipoFavorito, useFavoritos() hook
- [x] Panel de equipo ADMIN: /admin/equipo
- [x] Export Excel proyecto: 6 hojas xlsx
- [x] NotificationManager: Browser Notification API, polling 60s
- [x] calendar-token.ts + API /api/calendario/ical + perfil sync

### Sprint 18 — Heatmap, Alertas HW, Firma digital, Llamadas (COMPLETADO)
- [x] Heatmap carga de trabajo: /admin/carga-trabajo
- [x] Alertas hardware en TopBar y dashboard ADMIN
- [x] Firma digital cliente/tecnico en visitas: SignaturePad canvas
- [x] Modelo RegistroLlamada + API CRUD /api/llamadas + pagina /llamadas

---

## Roadmap corporativo completado

### Fase 1 — Seguridad critica — COMPLETADA
- Brute-force login: 5 intentos/min por IP
- CSP: eliminado unsafe-eval
- HSTS: max-age=31536000; includeSubDomains

### Fase 2 — Base de datos — COMPLETADA
- Connection pooling: max:20 en PrismaPg adapter
- 15 @@index en FKs frecuentes

### Fase 3 — Redis (Upstash) — COMPLETADA
- redis.ts: cliente Upstash con fallback in-memory
- rate-limit.ts + presence.ts async con Redis

### Fase 4 — Paginacion APIs — COMPLETADA
- hospitales: ?limit=200&page=N + "Cargar mas"
- proyectos: ?limit=100&page=N + "Cargar mas"

### Fase 6 — Validacion Zod + rate limiting — COMPLETADA
- Zod v4 schemas centralizados en schemas.ts
- ~50 rutas con checkRateLimit()

### Fase 7 — Code splitting — COMPLETADA
- proyectos/[id] de 4902→300 lineas, 10 tabs con next/dynamic

### Fase 8 — Rendimiento frontend — COMPLETADA
- SWR usePerfil(), polling reducido 60%, useReducer visita, loading skeletons

### Fase 9 — Revocacion JWT — COMPLETADA
- Check usuario.activo cada 5 min, sync rol automatico

---

## Deuda tecnica resuelta

| Issue | Sprint/Fase |
|-------|-------------|
| Dead links dashboard VENTAS | Auditoria |
| Dead link calendario | Auditoria |
| Fecha calendario perdida | Auditoria |
| Modal nueva visita cortado | Auditoria |
| Dark mode modal nueva visita | Auditoria |
| Dark mode /unauthorized y /not-found | Auditoria |
| Rate limit 2 rutas comentarios | Auditoria |
| Error boundaries 4 rutas | Auditoria |
| javascript:history.back() XSS | Auditoria |
| mapaHtml XSS iframe | Sprint 12 |
| GET /api/proyectos sin filtro zona | Sprint 12 |
| Comentarios visita sin IDOR | Sprint 12 |
| Fases proyecto sin IDOR | Sprint 12 |
| Contactos proyecto sin IDOR | Sprint 12 |
| CSP unsafe-eval | Fase 1 |
| Sin brute-force login | Fase 1 |
| Sin HSTS | Fase 1 |
| Sin connection pooling | Fase 2 |
| Sin indices en FKs | Fase 2 |
| Dark mode drawers | Sprint 13 |
| Tarea.asignadoA String libre | FK migration |
| CACHE_VERSION hardcodeado SW | Sprint 13 |
| JWT sin maxAge (30 dias) | 7 dias |

---

## Auditoria exhaustiva (junio 2026)
- Dead links corregidos: /visitas/nueva → /visitas?abrir=1, /ventas/hospitales → /hospitales
- Bug fecha calendario: abrirModal(fechaInicial?) preserva fecha seleccionada
- Modal nueva visita scroll safety: flex col + maxHeight calc(100vh-2rem)
- Dark mode completado en modales, /unauthorized, /not-found, mapa
- Error boundaries añadidos: llamadas, recordatorios, datos, transporte
- XSS fix: javascript:history.back() → router.back()
- Brand tokens: ~25 hardcoded #00A99D → TEAL importado
- Loading skeletons: dashboard/loading.tsx y mapa/loading.tsx
- useReducer: formulario visita consolida 8 useState
