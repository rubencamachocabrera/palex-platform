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

## Ideas de features — Sesion junio 2026

### 1. Plantillas de proyecto inteligentes (PRIORIDAD ALTA — esfuerzo bajo)
Al crear proyecto, elegir plantilla (ej: "Instalacion BC Robo estandar") que auto-crea:
- 11 fases con duraciones estimadas
- Tareas predefinidas por fase
- Hitos clave con fechas calculadas desde fecha inicio
- Hardware necesario pre-asignado del catalogo
- Checklist de materiales tipicos
ADMIN gestiona plantillas. Reutiliza modelos existentes (FaseProyecto, Tarea, Hito).

### 2. Panel de notas del equipo (PRIORIDAD ALTA — esfuerzo bajo)
Feed lateral en sidebar para comunicacion interna:
- Notas con @menciones (reutiliza MentionInput/MentionText existentes)
- Contexto automatico: si escribes desde /hospitales/5 se adjunta "desde Hospital X"
- Notas ancladas (pinned) por ADMIN
- Reacciones rapidas (check = "visto") para evitar "ok" spam
- Hilos para respuestas sin ensuciar feed
- Boton "Crear recordatorio" o "Crear tarea" desde una nota
- Email automatico al mencionado (Resend)
Modelo: NotaEquipo (id, texto, autorId, mencionIds JSON, contexto JSON, fijada, parentId, creadoEn)
API: /api/notas con CRUD + filtros

### 3. Timeline global de actividad (PRIORIDAD ALTA — esfuerzo bajo)
Feed tipo GitHub con TODA la actividad de la organizacion:
- "Carlos completo fase INSTALACION en Hospital Virgen del Rocio"
- "Ana creo 3 tareas en proyecto Clinic Barcelona"
Filtrable por zona, usuario, tipo, fecha.
LogActividad ya existe en DB — solo falta frontend con iconos, avatares, filtros.

### 4. Scoring de hospitales (PRIORIDAD ALTA — esfuerzo bajo)
Indicador de salud 0-100 por hospital, auto-calculado:
- Frecuencia visitas (25%): visitas ultimos 90d vs media
- Estado proyectos (25%): % fases completadas, retrasos
- Hardware operativo (20%): % equipos OK vs mantenimiento/baja
- Seguimiento comercial (15%): llamadas recientes
- Documentacion (15%): contactos completos, datos actualizados
Semaforo en lista hospitales + score en ficha + ranking por zona en dashboard ADMIN.

### 5. Briefing matutino automatico (PRIORIDAD ALTA — esfuerzo medio)
Email diario 8:00 + tarjeta resumen al abrir dashboard:
- Visitas planificadas hoy (direccion + contacto principal)
- Tareas vencidas o que vencen hoy
- Recordatorios pendientes
- Proyectos en riesgo en su zona
- Menciones sin leer
Necesita: Resend para email, cron job o Railway scheduled task.

### 6. Modo presentacion proyecto (PRIORIDAD ALTA — esfuerzo medio)
Boton "Presentar" en detalle proyecto → slides ejecutivas pantalla completa:
- Slide 1: Titulo + hospital + estado + progress ring grande
- Slide 2: Gantt visual con fases y fechas
- Slide 3: KPIs (presupuesto, tareas, hardware instalado)
- Slide 4: Proximos hitos y riesgos
- Slide 5: Equipo y contactos
Navegable con flechas. Para reuniones con el hospital sin PowerPoint.

### 7. Quick Actions flotantes por contexto (esfuerzo bajo)
Boton flotante (+) que cambia segun pagina actual:
- En /hospitales/5: "Nueva visita aqui", "Llamar", "Nueva tarea"
- En /proyectos/3: "Anadir tarea", "Registrar hito", "Subir adjunto"
- En movil: speed dial tipo FAB Material Design.

### 8. Comparador de periodos (esfuerzo bajo)
Selector "Comparar con: mes/trimestre/ano anterior" en dashboard y listas:
- Deltas con flechas verdes/rojas: "Visitas: 23 (+15% vs mes anterior)"
- Mini sparklines de tendencia.

### 9. Pasaporte hardware (esfuerzo medio)
Pagina publica por unidad (via QR fisico pegado al equipo):
- Modelo, serie, compra, garantia con countdown
- Hospital actual, proyecto asociado
- Historico de estados, visitas donde se menciono
- Documentacion tecnica del catalogo
- Log de incidencias

### 10. Resumen semanal ADMIN (esfuerzo medio)
Email cada lunes + vista en app:
- Visitas realizadas vs planificadas por usuario
- Proyectos que cambiaron de estado
- Hardware movido (asignaciones, bajas)
- Alertas activas
- Top performer de la semana
- Comparativa con semana anterior

### 11. Ruta optimizada mapa (esfuerzo alto)
Con 3-4 visitas planificadas, mapa muestra ruta optima:
- Ordena visitas por proximidad geografica
- Distancia y tiempo estimado entre paradas
- Reorganizar arrastrando
- Boton "Abrir en Google Maps" con ruta completa

### 12. Check-in/Check-out hospitales (esfuerzo medio)
Registro de presencia en hospital:
- Check-in al llegar (manual o geolocalizacion)
- Check-out al salir, registra duracion
- En ficha hospital: "Tiempo total: 47h este trimestre"
- En perfil tecnico: "Horas en campo esta semana: 32h"
Modelo: RegistroPresencia (usuarioId, hospitalId, checkIn, checkOut, duracion)

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
