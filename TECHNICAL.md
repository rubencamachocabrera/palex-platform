# Documento Tecnico — Plataforma de Gestion de Proyectos Hospitalarios

> Documento de referencia tecnica completo.
> Ultima actualizacion: 2026-06-24.

---

## 1. Vision general

### Que es
Plataforma web interna para la planificacion y gestion de proyectos hospitalarios. Permite a los equipos tecnicos coordinar visitas a hospitales, hacer seguimiento de proyectos de instalacion de equipamiento medico, gestionar inventario de hardware y mantener toda la informacion de centros hospitalarios centralizada.

### Para quien
- **Tecnicos de campo**: registran visitas tecnicas, documentan instalaciones, firman digitalmente y trabajan offline.
- **Jefes de proyecto**: gestionan fases, tareas, hitos, materiales y equipos en proyectos hospitalarios.
- **Administradores**: supervisan al equipo, gestionan usuarios/zonas, controlan hardware y monitorizan la actividad.
- **Comerciales** (rol VENTAS): acceso basico a hospitales y dashboard (modulo CRM desactivado actualmente).

### Uso privado
Acceso restringido por credenciales y roles. No es un producto SaaS — es una herramienta interna con deploy propio.

### URL de produccion
`https://palex-platform-production.up.railway.app`

---

## 2. Stack tecnico

### Tecnologias principales

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| Framework | Next.js (App Router) | 16.2.6 | SSR/SSG, routing, API routes, middleware |
| Lenguaje | TypeScript | 5.x | Tipado estricto en todo el proyecto |
| UI | Tailwind CSS | v4 | Estilos utility-first, dark mode via clase `.dark` |
| Base de datos | PostgreSQL | - | Alojado en Railway, datos persistentes |
| ORM | Prisma | 7.8.0 | Schema declarativo, adapter-pg (sin URL directa en datasource) |
| Auth | NextAuth.js | v5 beta.31 | Autenticacion, sesiones JWT, roles |
| Cache/Estado | Upstash Redis | 1.38.0 | Rate limiting distribuido, presencia colaborativa |
| Error tracking | Sentry | 10.59.0 | Client/server/edge, global-error boundary |
| Offline | IndexedDB + Service Worker | - | PWA, auto-save borradores visitas |
| Frontend | React | 19.2.4 | UI, hooks, SWR para cache |
| Deploy | Railway | nixpacks | Auto-deploy desde `git push origin main` |

### Dependencias clave

| Libreria | Uso |
|----------|-----|
| `swr` 2.4.1 | Cache y revalidacion de datos (hook `usePerfil()`) |
| `zod` 4.4.3 | Validacion de schemas en APIs (centralizados en `schemas.ts`) |
| `bcryptjs` 3.0.3 | Hash de contraseñas |
| `pg` 8.20.0 | Driver PostgreSQL nativo para Prisma adapter |
| `qrcode` 1.5.4 | Generacion de codigos QR por hospital |
| `xlsx` 0.18.5 | Export de proyectos a Excel (6 hojas) |
| `@dnd-kit/*` | Drag & drop para Kanban de proyectos |
| `@upstash/redis` 1.38.0 | Redis serverless con fallback in-memory |

### Dependencias de desarrollo

| Libreria | Uso |
|----------|-----|
| `@playwright/test` 1.61.0 | Tests E2E (18 tests + auth setup) |
| `eslint` + `eslint-config-next` | Linting |
| `dotenv` | Variables de entorno en desarrollo |

---

## 3. Arquitectura

### Patron general
Next.js App Router con separacion clara:
- **Route groups**: `(auth)` para login, `(dashboard)` para app principal (NO aparece en URL)
- **API Routes**: ~50 endpoints REST en `src/app/api/`
- **Server Components**: pages que hacen fetch en servidor
- **Client Components**: formularios, interacciones, hooks (`"use client"` como primera linea)
- **Edge Middleware**: proteccion de rutas sin Prisma (edge-compatible)

### Flujo de una peticion

```
Browser → Middleware (Edge)
  ├─ Ruta protegida sin auth → redirect /login
  ├─ /login con auth → redirect /dashboard
  └─ OK → Next.js App Router
       ├─ Page (Server Component) → renderizado en servidor
       └─ API Route → auth() + rate limit + Zod validation + Prisma query → JSON
```

### Estructura de directorios

```
src/
├── app/                    # Pages y API routes (App Router)
│   ├── (auth)/             # Login (split-screen animado)
│   ├── (dashboard)/        # Toda la app (NO añade nada a la URL)
│   │   ├── layout.tsx      # Sidebar + TopBar + OnboardingWizard + BottomNav
│   │   ├── dashboard/      # Panel principal por rol
│   │   ├── hospitales/     # Lista + detalle con tabs
│   │   ├── visitas/        # Lista + calendario + formulario 13 secciones
│   │   ├── proyectos/      # Lista + detalle con 10 tabs (code-split)
│   │   ├── hardware/       # Inventario, catalogo, alertas
│   │   ├── llamadas/       # Registro de llamadas
│   │   ├── recordatorios/  # Recordatorios personales
│   │   ├── admin/          # CRUD usuarios, zonas, hardware, tags, log, equipo, heatmap
│   │   ├── mapa/           # Leaflet con hospitales geolocalizados
│   │   ├── datos/          # KPIs explotacion (MOCKUP)
│   │   └── perfil/         # Configuracion personal
│   └── api/                # ~50 endpoints REST
│       ├── auth/           # NextAuth handler
│       ├── hospitales/     # CRUD + contactos + timeline
│       ├── visitas/        # CRUD + comentarios
│       ├── proyectos/      # CRUD + 9 sub-rutas (fases, tareas, hitos...)
│       ├── hardware/       # CRUD + tipos + unidades
│       ├── llamadas/       # CRUD registro llamadas
│       └── ...             # tags, recordatorios, favoritos, search, perfil, etc.
├── components/             # Componentes React reutilizables
│   ├── Sidebar.tsx         # Navegacion lateral colapsable
│   ├── TopBar.tsx          # Busqueda global + notificaciones
│   ├── Toast.tsx           # Sistema de notificaciones (god node: 42 conexiones)
│   ├── OnboardingWizard.tsx # Tour interactivo 8+3 pasos
│   └── ui/                 # EmptyState, Icons (SVG), Skeleton, PageHeader
├── hooks/                  # Custom hooks
│   ├── usePerfil.ts        # SWR cache compartido (rol, nombre, id)
│   ├── useFavoritos.ts     # Favoritos DB-backed con optimistic updates
│   └── useOfflineSync.ts   # Auto-save IndexedDB + sync
├── lib/                    # Utilidades del servidor y cliente
│   ├── db.ts               # Singleton Prisma (connection pool max:20)
│   ├── auth.ts             # NextAuth server (JWT + revocacion)
│   ├── auth.config.ts      # NextAuth edge-compatible
│   ├── rate-limit.ts       # Rate limiting (Redis + fallback in-memory)
│   ├── schemas.ts          # Zod v4 schemas centralizados
│   ├── brand.ts            # Tokens de color (TEAL, ORANGE)
│   └── redis.ts            # Cliente Upstash Redis
└── middleware.ts           # Proteccion de rutas (Edge)
```

### Grafo de dependencias (Graphify)

El analisis del codebase con Graphify revela:
- **1.229 nodos** y **1.607 aristas** organizados en **115 comunidades**
- **Sin ciclos de importacion** detectados
- **God nodes** (nodos mas conectados, abstracciones centrales):
  1. `useToast()` — 42 conexiones (sistema de notificaciones global)
  2. `checkRateLimit()` — 22 conexiones (rate limiting en todas las APIs)
  3. `openDB()` — 10 conexiones (IndexedDB para offline)

---

## 4. Modelo de datos

### Diagrama de relaciones

```
                                    ┌─────────────┐
                                    │   Usuario   │
                                    │ (Rol enum)  │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
              UsuarioZona            ┌─────┴─────┐          ┌────┴────┐
              (pivot M:N)            │   Visita   │          │Proyecto │
                    │                │ (13 secs)  │          │(10 tabs)│
                    ▼                └─────┬──────┘          └────┬────┘
              ┌─────────┐                 │                      │
              │  Zona   │                 │                      │
              └────┬────┘           ┌─────┼─────┐          ┌────┼────────┐
                   │                │     │     │          │    │        │
                   ▼           Comentario │  VisitaTag  FaseProyecto  Tarea
              ┌──────────┐    (menciones) │  (pivot)    (11 tipos)  (subtareas)
              │ Hospital │                │                │
              │(grupos)  │◄───────────────┘           ┌────┼────┐
              └────┬─────┘                            │    │    │
                   │                                Hito  │  SolicitudMaterial
              ┌────┼──────────┐                           │    (lineas)
              │    │          │                    EntradaTimeline
          Contacto │   HardwareUnidad             (eventos/citas)
              │    │          │
              │    │    ┌─────┴──────┐            ┌──────────────┐
              │    │    │HardwareCat │            │ProyectoModulo│
              │    │    │(docs)      │            │(pivot)       │
              │    │    └─────┬──────┘            └──────┬───────┘
              │    │          │                          │
              │    │    HardwareTipo              ModuloInlab
              │    │    (color hex)               (catalogo)
              │    │
              │  RegistroLlamada
              │  (6 resultados)
              │
         ProyectoContacto
         (pivot M:N)
```

### Modelos principales (27 tablas)

#### Entidades de negocio

| Modelo | Tabla DB | Descripcion | Campos clave |
|--------|----------|-------------|--------------|
| **Usuario** | `usuarios` | Usuarios del sistema | nombre, email, password (bcrypt), rol (enum), activo, onboardingCompletado |
| **Zona** | `zonas` | Agrupacion geografica | nombre (unique), descripcion, activo |
| **Hospital** | `hospitales` | Centro hospitalario | nombre, ciudad, provincia, tipo (7 enum), camas, zonaId, grupoId (auto-ref), lat/lng |
| **Contacto** | `contactos` | Persona de contacto en hospital | nombre, cargo, email, telefono, principal (bool) |
| **Visita** | `visitas` | Visita tecnica a hospital | titulo, tipo (PROYECTOS/VENTAS), estado (3 enum), fecha, datos (JSON 13 secs), fotos (JSON), score (0-100) |
| **Proyecto** | `pre_proyectos` | Proyecto de instalacion | titulo, estado (5 enum), prioridad, presupuesto, refContrato, refConcurso, shareToken, mapaHtml |
| **RegistroLlamada** | `registros_llamadas` | Registro de llamada telefonica | asunto, duracion, resultado (6 tipos), seguimiento (bool), fechaSeguimiento |

#### Entidades de proyecto

| Modelo | Tabla DB | Descripcion |
|--------|----------|-------------|
| **FaseProyecto** | `fases_pre_proyectos` | 11 tipos de fase (FIRMA_CONTRATO → SOPORTE_POST), estado, responsable |
| **Tarea** | `tareas` | Tareas con subtareas (auto-referencial parentId), prioridad (4 niveles), asignadoAId FK |
| **Hito** | `hitos` | Hitos con fecha plan/real, completado |
| **EntradaTimeline** | `entradas_timeline` | Timeline: EVENTO, COMENTARIO, CITA (con persona, lugar, importancia) |
| **SolicitudMaterial** | `solicitudes_material` | Solicitudes con estado (6 enum) + lineas de material |
| **Adjunto** | `adjuntos` | Archivos base64 en DB (pendiente migracion a object storage) |
| **ProyectoModulo** | `pre_proyectos_modulos` | Pivot proyecto-modulo con estado (PENDIENTE → VALIDADO) |

#### Hardware

| Modelo | Tabla DB | Descripcion |
|--------|----------|-------------|
| **HardwareTipo** | `hardware_tipos` | Tipos dinamicos con color hex |
| **HardwareCatalogo** | `hardware_catalogo` | Marca, modelo, referenciaPalex, proveedor, precio, garantiaMeses |
| **HardwareUnidad** | `hardware_unidades` | Unidades individuales: numSerie, estado (5 enum), hospital, fechaGarantia, proximoMantenimiento |
| **HardwareCatalogoDoc** | `hardware_catalogo_docs` | Documentos del catalogo (base64) |

#### Tablas auxiliares

| Modelo | Tabla DB | Descripcion |
|--------|----------|-------------|
| **Comentario** | `comentarios` | Texto + fotos + mencionIds (JSON), vinculado a visita O proyecto |
| **Tag** | `tags` | Etiquetas con color, tipo (VISITA/PROYECTO), orden, activo |
| **VisitaTag** / **ProyectoTag** | pivots | Asignacion de tags M:N |
| **Recordatorio** | `recordatorios` | Recordatorios personales con fecha, completado, ownership |
| **Favorito** | `favoritos` | Favoritos DB-backed (HOSPITAL/PROYECTO), unique constraint |
| **LogActividad** | `log_actividad` | Auditoria: accion, entidad, detalle, usuario, fecha |
| **PlantillaVisita** | `plantillas_visita` | Plantillas para pre-rellenar visitas |
| **ConfigApp** | `config_app` | Configuracion app (clave/valor) |
| **ModuloInlab** | `modulos_inlab` | Catalogo de modulos InLab |

### Enums (15 totales)

| Enum | Valores | Uso |
|------|---------|-----|
| `Rol` | ADMIN, VENTAS, PROYECTOS, TECNICO | Permisos de usuario |
| `TipoHospital` | 7 tipos (publico, privado, clinica, lab, centro salud, universidad, otro) | Clasificacion de centros |
| `TipoVisita` | PROYECTOS, VENTAS | Tipo de visita tecnica |
| `EstadoVisita` | BORRADOR, COMPLETADA, ARCHIVADA | Ciclo de vida visita |
| `EstadoProyecto` | NUEVO, EN_CURSO, PAUSADO, COMPLETADO, CANCELADO | Estado del proyecto |
| `TipoFase` | 11 fases (FIRMA_CONTRATO → SOPORTE_POST) | Fases de un proyecto |
| `EstadoFase` | PENDIENTE, EN_PROGRESO, COMPLETADO, BLOQUEADO | Estado de cada fase |
| `EstadoModulo` | PENDIENTE, EN_INSTALACION, INSTALADO, FORMACION, VALIDADO | Ciclo del modulo |
| `EstadoHardware` | DISPONIBLE, ASIGNADO, EN_MANTENIMIENTO, RETIRADO, BAJA | Estado de unidad HW |
| `EstadoSolicitud` | 6 estados (PENDIENTE → CANCELADA) | Solicitudes de material |
| `EstadoTarea` | PENDIENTE, EN_PROGRESO, COMPLETADA, CANCELADA | Estado de tarea |
| `PrioridadTarea` | BAJA, MEDIA, ALTA, CRITICA | Prioridad de tarea |
| `TipoTag` | VISITA, PROYECTO | Tipo de etiqueta |
| `TipoEntrada` | EVENTO, COMENTARIO, CITA | Tipo de entrada timeline |
| `TipoFavorito` | HOSPITAL, PROYECTO | Tipo de favorito |

### Indices de base de datos (15)

Indices en FKs mas frecuentes para evitar full table scans:
- Hospital[zonaId], Contacto[hospitalId]
- Visita[hospitalId, usuarioId, fecha]
- Proyecto[hospitalId, responsableId]
- FaseProyecto[proyectoId], Tarea[proyectoId, asignadoAId], Hito[proyectoId]
- EntradaTimeline[proyectoId], SolicitudMaterial[proyectoId], Adjunto[proyectoId]
- Comentario[visitaId, proyectoId]
- HardwareUnidad[hospitalId, catalogoId]
- LogActividad[creadoEn, usuarioId]
- Recordatorio[usuarioId+fecha, fecha]
- Favorito[usuarioId]
- RegistroLlamada[usuarioId+fecha, hospitalId]

---

## 5. Sistema de autenticacion y roles

### NextAuth v5

**Arquitectura split:**
- `auth.config.ts` — Configuracion edge-compatible (sin Prisma), usada por el middleware
- `auth.ts` — Configuracion server-side con Prisma, callbacks JWT+session, revocacion

**Flujo de login:**
1. Usuario envia email + password en `/login`
2. NextAuth `authorize()` busca usuario en DB, compara hash bcrypt
3. Brute-force protection: `checkRateLimitByKey()` — 5 intentos/min por IP
4. Si OK: genera JWT con `{ id, rol, nombre }`, maxAge 7 dias
5. Middleware Edge verifica JWT en cada request protegido

**Revocacion de sesion (Fase 9):**
- Callback `jwt` en `auth.ts` verifica `usuario.activo` cada 5 minutos (cache in-memory)
- Si admin desactiva usuario → pierde acceso en <5 min sin re-login
- Si admin cambia rol → nuevo rol efectivo en <5 min
- Si la DB falla durante el check, se mantiene el token existente (graceful degradation)

### Roles y permisos

| Rol | Dashboard | Hospitales | Visitas | Proyectos | Hardware | Admin | Llamadas |
|-----|-----------|------------|---------|-----------|----------|-------|----------|
| ADMIN | Si (KPIs globales) | Todos | Todas | Todos | Si + alertas | Si (completo) | Todas |
| PROYECTOS | Si (mi dia) | Solo su zona | Solo su zona | Solo responsable/zona | Lectura | No | Solo su zona |
| TECNICO | Si (mi dia) | Solo su zona | Solo su zona | Solo responsable/zona | Lectura | No | Solo su zona |
| VENTAS | Si (mi dia) | Solo su zona | Solo su zona | No | No | No | Solo su zona |

**Seguridad IDOR:**
- Hospitales: filtro por zona del usuario (no-ADMIN)
- Visitas: propietario, ADMIN, o misma zona del hospital
- Proyectos: responsable, ADMIN, o zona del hospital
- Llamadas: filtro por zona
- Contactos de proyecto: verificacion de responsableId
- Comentarios de visita: acceso por zona + propietario

---

## 6. API REST

### Endpoints (~50 rutas)

#### Hospitales
| Metodo | Ruta | Descripcion | Cache |
|--------|------|-------------|-------|
| GET | `/api/hospitales` | Lista paginada (?limit=200&page=N) | 30s |
| POST | `/api/hospitales` | Crear hospital | - |
| GET | `/api/hospitales/[id]` | Detalle (verifica zona, take:50 relaciones) | - |
| PATCH | `/api/hospitales/[id]` | Editar (whitelist campos) | - |
| DELETE | `/api/hospitales/[id]` | Eliminar | - |
| GET/POST | `/api/hospitales/[id]/contactos` | CRUD contactos | - |
| GET | `/api/hospitales/[id]/timeline` | Timeline de actividad | - |

#### Visitas
| Metodo | Ruta | Descripcion | Cache |
|--------|------|-------------|-------|
| GET | `/api/visitas` | Lista SIN campo `datos` (JSON grande), ?desde=&hasta= | 15s |
| POST | `/api/visitas` | Crear (hospitalId, tipo, titulo, fecha, datos, proyectoId, contactoPrincipalId) | - |
| GET | `/api/visitas/[id]` | Detalle CON `datos` completo + relaciones | - |
| PATCH | `/api/visitas/[id]` | Editar (titulo, datos, estado, fecha, proyectoId, tagIds) | - |
| DELETE | `/api/visitas/[id]` | Eliminar | - |
| GET/POST | `/api/visitas/[id]/comentarios` | Comentarios con mencionIds | - |

#### Proyectos
| Metodo | Ruta | Descripcion | Cache |
|--------|------|-------------|-------|
| GET | `/api/proyectos` | Lista paginada (?limit=100&page=N) | - |
| POST | `/api/proyectos` | Crear (acepta moduloIds, refConcurso) | - |
| GET | `/api/proyectos/[id]` | Detalle con modulos + tags | - |
| PATCH | `/api/proyectos/[id]` | Editar (whitelist + tagIds) | - |
| DELETE | `/api/proyectos/[id]` | Eliminar | - |
| PATCH | `/api/proyectos/[id]/fases/[faseId]` | Actualizar fase (auto-actualiza estado proyecto) | - |
| CRUD | `/api/proyectos/[id]/tareas` | Tareas con subtareas | - |
| CRUD | `/api/proyectos/[id]/hitos` | Hitos | - |
| CRUD | `/api/proyectos/[id]/entradas` | Timeline (eventos, comentarios, citas) | - |
| CRUD | `/api/proyectos/[id]/solicitudes` | Solicitudes de material + lineas | - |
| CRUD | `/api/proyectos/[id]/contactos` | Pivot proyecto-contacto | - |
| CRUD | `/api/proyectos/[id]/adjuntos` | Archivos adjuntos | - |
| CRUD | `/api/proyectos/[id]/comentarios` | Comentarios con fotos | - |
| GET/POST | `/api/proyectos/[id]/modulos` | Modulos InLab (POST reemplaza todos) | - |
| PATCH/DELETE | `/api/proyectos/[id]/modulos/[moduloId]` | Estado modulo individual | - |
| POST/DELETE | `/api/proyectos/[id]/share` | Generar/revocar token publico | - |
| GET | `/api/proyectos/[id]/excel` | Export Excel 6 hojas (xlsx) | - |

#### Otros
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/search` | Busqueda unificada hospitales+visitas+proyectos (Cache 30s) |
| GET/POST | `/api/tags` | Tags (filtro ?tipo=VISITA/PROYECTO). POST solo ADMIN |
| PATCH/DELETE | `/api/tags/[id]` | Editar/eliminar tag (solo ADMIN) |
| GET/POST | `/api/llamadas` | Registro de llamadas (filtro zona, ?desde=&hasta=) |
| GET/PATCH/DELETE | `/api/llamadas/[id]` | Llamada individual (owner o ADMIN) |
| GET/POST | `/api/recordatorios` | Recordatorios personales (ownership check) |
| PATCH/DELETE | `/api/recordatorios/[id]` | Recordatorio individual |
| GET/POST | `/api/favoritos` | Toggle favorito (GET ?tipo, POST create/delete) |
| GET | `/api/calendario/ical` | Feed .ics con HMAC token auth |
| POST | `/api/presence` | Heartbeat presencia colaborativa |
| GET | `/api/usuarios/menciones` | Busqueda usuarios para @menciones |
| GET/PATCH | `/api/onboarding` | Estado onboarding usuario |
| GET/PATCH | `/api/perfil` | Perfil (rol, onboardingCompletado, calendarToken) |
| GET | `/api/notificaciones` | Alertas por rol |
| GET | `/api/admin/carga-trabajo` | Heatmap visitas/usuario/dia (solo ADMIN) |
| GET | `/api/log-actividad` | Logs paginados (solo ADMIN) |
| GET | `/api/share/[token]` | Proyecto publico (sin PII) |
| GET | `/api/health` | Healthcheck Railway |

### Seguridad de APIs

- **Rate limiting**: `checkRateLimit()` en todas las rutas. GET 60/min, POST/PATCH/DELETE 30/min, presence 120/min.
- **Validacion**: Zod v4 schemas centralizados en `schemas.ts` con helper `parseBody()`.
- **IDOR**: verificacion de zona + propietario/responsable en cada ruta.
- **Mass assignment**: whitelist explicita en cada PATCH.
- **Brute-force login**: 5 intentos/min por IP via `checkRateLimitByKey()`.
- **Cache-Control HTTP**: en APIs de lectura (15s visitas, 30s hospitales/search, 60s hardware).

---

## 7. Funcionalidades por modulo

### 7.1 Hospitales
- Lista con filtro por zona, busqueda, toggle grid/lista
- Detalle con KPIs de visitas, tabs: Contactos, Visitas, Timeline, Llamadas
- QR por hospital: generacion dinamica + descarga PNG
- Favoritos DB-backed con optimistic updates (cross-device)
- Grupos hospitalarios: FK auto-referencial, hospital cabecera con N centros
- Paginacion con boton "Cargar mas" (200 por pagina)

### 7.2 Visitas tecnicas
- Formulario de 13 secciones con auto-save en IndexedDB (offline)
- Titulo editable en cabecera (guarda onBlur)
- Fotos por seccion (compresion Canvas API antes de guardar)
- Score de complejidad 0-100 con 14 reglas de deteccion de riesgos
- Firma digital (cliente + tecnico) via SignaturePad canvas
- PDF profesional con branding
- Quick-create modal estandarizado (desde /visitas, hospital o proyecto)
- Calendario mensual con dots por estado
- Edicion colaborativa: presencia en tiempo real (heartbeat 15s, data poll 10s)
- Tags de color asignables
- Plantillas para pre-rellenar campos
- Vinculacion visita → proyecto con progreso de fases

### 7.3 Proyectos
- 10 tabs (code-split con `next/dynamic` — lazy loading):
  - **Cockpit**: KPIs, progreso fases, resumen rapido
  - **Info**: datos generales, hospital, responsable, fechas
  - **Tareas**: CRUD con subtareas, prioridad, asignacion por FK a usuario
  - **Timeline**: diario con eventos, comentarios, citas
  - **Materiales**: solicitudes con lineas y estados
  - **Contactos**: pivot proyecto-contacto
  - **Visitas**: visitas vinculadas al proyecto
  - **Modulos**: modulos InLab con estados (PENDIENTE → VALIDADO)
  - **Adjuntos**: archivos adjuntos (base64)
  - **Resumen**: vista 360 completa
- Fases con 11 tipos y auto-actualizacion de estado proyecto
- Vista Kanban drag-drop en lista
- Export Excel 6 hojas (xlsx)
- Link compartir publico con token criptografico (sin PII)
- Tags de color asignables
- Paginacion con "Cargar mas" (100 por pagina)

### 7.4 Hardware
- **HardwareTipo**: tipos dinamicos con color hex gestionados desde admin
- **HardwareCatalogo**: marca, modelo, referenciaPalex, proveedor, precio, garantia
- **HardwareUnidad**: unidades individuales con numSerie, estado, hospital asignado
- Tabs: Resumen, Inventario, Instalaciones, Catalogo, Alertas
- Alertas automaticas: garantias vencidas + mantenimientos vencidos (ADMIN)
- Admin: drawer lateral, color picker, card grid

### 7.5 Llamadas
- Registro rapido con hospital, contacto, duracion, asunto, notas
- 6 tipos de resultado con colores (Contactado, No contesta, Buzon de voz, Info enviada, Reunion agendada, Otro)
- Seguimiento con fecha toggle inline
- KPIs, filtros (fecha/hospital/resultado/busqueda), cards expandibles con edicion inline
- Tab en ficha de hospital con ultimas 10 llamadas
- Integrado en dashboard "Mi Dia"

### 7.6 Dashboard
- KPIs por rol (visitas, proyectos, tareas, llamadas)
- Widget "Mi Dia": visitas hoy, tareas vencidas, recordatorios, llamadas de seguimiento
- Accesos rapidos: links a hospitales, visitas, proyectos, etc.
- Seccion Favoritos con acceso rapido a hospitales/proyectos
- Acciones rapidas campo (movil): Nueva visita, Visitas hoy, Calendario
- ADMIN: banner alertas hardware

### 7.7 Admin (solo ADMIN)
- CRUD completo: usuarios, zonas, hospitales, hardware
- Gestion de tags/etiquetas: crear, editar, activar/desactivar, eliminar
- Log de actividad: registro de acciones con usuario, entidad, fecha
- Panel de equipo: card grid con workload por usuario (visitas, proyectos, ultimo acceso)
- Heatmap carga de trabajo: grid GitHub-style (filas=usuarios, columnas=dias)
- Export CSV

### 7.8 Comentarios
- @Menciones: textarea con dropdown debounced y keyboard nav (ArrowUp/Down, Enter, Escape)
- Formato almacenamiento: `@[userId:Nombre]`, renderizado como pills teal
- Notificaciones en TopBar con icono @ teal
- Disponible en visitas y proyectos

### 7.9 Recordatorios
- CRUD inline con agrupacion temporal: Vencidos (rojo), Hoy (amber), Proximos (teal), Completados (gris)
- Notificaciones en TopBar (icono reloj TEAL)
- Integrado en dashboard "Mi Dia"

### 7.10 Busqueda y navegacion
- Busqueda global debounced en TopBar
- CommandPalette (Cmd+K): busca hospitales+visitas+proyectos con cache 60s
- Atajos teclado: G+H (hospitales), G+V (visitas), G+P (proyectos), G+D (dashboard)
- Dark mode: toggle en TopBar, persistencia localStorage, anti-FOUC

### 7.11 Modo campo movil
- BottomNav: 5 tabs fijos (Dashboard, Visitas, Hospitales, Proyectos, Mas)
- Glass effect: backdrop-blur + semi-transparente, safe area insets
- "Mas" abre sidebar overlay
- Tap targets: minimo 44px

### 7.12 Onboarding
- 8 pasos generales + 3 extra para ADMIN (11 total)
- SVG ilustraciones custom por paso, slide animations (translateX)
- Keyboard nav (flechas, Enter, Escape), boton Saltar
- Admin puede reiniciar onboarding de usuarios

### 7.13 Notificaciones
- Browser Notification API (no Push API)
- Banner de permisos: fixed bottom-right, glass effect
- Polling /api/notificaciones cada 60s
- Preferencias en /perfil con toggle

### 7.14 Calendario iCal
- Feed .ics con visitas, recordatorios pendientes, hitos proximos
- Auth via HMAC-SHA256 token (determinista, sin storage DB)
- URL copiable en /perfil para Google Calendar, Outlook, Apple Calendar

---

## 8. Frontend — Componentes y patrones

### Componentes clave

| Componente | Descripcion | Importancia |
|-----------|-------------|-------------|
| `Toast.tsx` | Provider global de notificaciones | **God node** (42 conexiones) — usado en toda la app |
| `Sidebar.tsx` | Nav lateral colapsable (256/64px), dark #0f172a, nav por rol | Layout principal |
| `TopBar.tsx` | Busqueda global, dark/light toggle, notificaciones dropdown | Layout principal |
| `CommandPalette.tsx` | Busqueda rapida Cmd+K con cache SWR | Productividad |
| `OnboardingWizard.tsx` | Tour interactivo 8+3 pasos (role-aware) | Primera experiencia |
| `TagSelector.tsx` | Selector/pills de tags con colores | Reutilizable (visitas + proyectos) |
| `MentionInput.tsx` | Textarea con @menciones dropdown | Reutilizable (comentarios) |
| `BottomNav.tsx` | Nav movil 5 tabs (glass effect, safe area) | Experiencia movil |
| `SignaturePad.tsx` | Canvas firma digital (dynamic import) | Visitas |

### Hooks custom

| Hook | Descripcion |
|------|-------------|
| `usePerfil()` | SWR cache compartido de perfil (rol, nombre, id). Usado en 10+ paginas. deduplicado 60s. |
| `useFavoritos()` | Favoritos DB-backed con optimistic updates y rollback on error |
| `useOfflineSync()` | Auto-save en IndexedDB, deteccion online/offline, SaveStatus |
| `useKeyboardShortcuts()` | Atajos globales: Cmd+K, G+H/V/P/D, Escape |

### Patrones de UI
- **Brand tokens**: colores en `brand.ts` (TEAL=#00A99D, ORANGE=#F7941D). NUNCA hardcodear hex.
- **Iconos**: SIEMPRE SVG desde `components/ui/Icons.tsx`. NUNCA emojis.
- **Listas vacias**: `EmptyState()` en todas las listas.
- **Carga**: `Skeleton` shimmer en todas las cargas.
- **Formularios**: RadioPills/CheckPills (no radio/checkbox nativos).
- **Dark mode**: clase `.dark` en `<html>`, variables CSS, globals.css con overrides.
- **Animaciones**: skeleton-shimmer, stagger-grid, card-hover lift, stagger-nav.

---

## 9. Infraestructura

### Deploy (Railway)

**Archivo**: `railway.toml`
```
Build:  npx prisma generate && next build
Start:  npx prisma db push --accept-data-loss && npm start
Health: /api/health (timeout 120s)
Restart: on_failure (max 3 retries)
```

**Variables de entorno:**
| Variable | Proposito |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `AUTH_SECRET` | Secreto para JWT NextAuth |
| `AUTH_URL` | URL base de la app |
| `UPSTASH_REDIS_REST_URL` | Redis serverless (opcional, fallback in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis (opcional) |
| `SENTRY_DSN` | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | Upload source maps |

### Base de datos

- PostgreSQL en Railway
- Connection pool: max 20 conexiones (PrismaPg adapter)
- 15 indices en FKs frecuentes
- Sin migraciones en produccion — `prisma db push` directo
- `--accept-data-loss` solo cubre DROP columnas, NO añadir NOT NULL sin default

### Redis (Upstash)

- Rate limiting distribuido (`checkRateLimit()` con Redis + fallback in-memory)
- Presencia colaborativa (`heartbeat/getActiveUsers/leave` con Redis hash + TTL)
- Graceful fallback: si no hay env vars Redis → funciona todo in-memory
- Cliente en `src/lib/redis.ts` con patron lazy singleton

### PWA

- `manifest.json` con theme #00A99D
- `sw.js` Service Worker (network-first strategy)
- IndexedDB (`offline-db.ts`): `openDB()`, `saveDraft()`, `getDraft()`, `enqueueSync()`
- Offline: auto-save de borradores de visita, deteccion online/offline

---

## 10. Seguridad

### Headers HTTP (next.config.ts)

| Header | Valor | Proposito |
|--------|-------|-----------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; ...` | XSS prevention (sin unsafe-eval) |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | HSTS 1 año |
| X-Frame-Options | `DENY` | Clickjacking prevention |
| X-Content-Type-Options | `nosniff` | MIME sniffing prevention |
| Referrer-Policy | `strict-origin-when-cross-origin` | Control de referrer |

### Protecciones

| Amenaza | Mitigacion |
|---------|-----------|
| Brute-force login | `checkRateLimitByKey()` — 5 intentos/min por IP |
| IDOR | Verificacion zona + propietario/responsable en cada API |
| Mass assignment | Whitelist explicita en todos los PATCH |
| XSS iframe | `sandbox` sin `allow-same-origin` en mapaHtml |
| XSS navigation | `router.back()` en vez de `javascript:history.back()` |
| Session hijacking | JWT maxAge 7 dias, revocacion <5 min |
| Token compartir | Crypto random token para share publico (sin PII) |
| Rate limiting | Redis distribuido en ~50 rutas API |
| Validation | Zod v4 schemas en POST/PATCH |

### Sentry

- Client config: `sentry.client.config.ts` (tracesSampleRate 0.2)
- Server config: `sentry.server.config.ts`
- Edge config: `sentry.edge.config.ts`
- `instrumentation.ts`: onRequestError hook
- Error boundaries: `error.tsx` en 15 rutas + `global-error.tsx`

---

## 11. Testing y calidad

### Lighthouse (ultima auditoria)

| Metrica | Puntuacion |
|---------|-----------|
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |

### Playwright E2E

- **18 tests** organizados en 3 suites:
  - `visitas.spec.ts`: 5 tests (lista, busqueda, modal creacion, detalle, calendario)
  - `proyectos.spec.ts`: 4 tests (lista, kanban, detalle tabs, navegacion)
  - `navegacion.spec.ts`: 9 tests (dashboard, sidebar, Cmd+K, dark mode, mobile viewport)
- Auth setup compartido (`auth.setup.ts` con storageState)
- Viewport mobile incluido

### Accesibilidad

- WCAG AA contraste en todos los textos
- Touch targets minimo 44x44px
- Skip-link en layout (`<main id="main-content">`)
- Sin `maximumScale:1` (no bloquea zoom)
- Toggle password con area de toque suficiente
- `aria-hidden` en iconos decorativos, `role="dialog"` en modales

---

## 12. Rendimiento

### Optimizaciones implementadas

| Area | Optimizacion | Impacto |
|------|-------------|---------|
| SWR | `usePerfil()` compartido en 10+ paginas (dedup 60s) | Elimina fetches duplicados de /api/perfil |
| Code splitting | 10 tabs de proyecto con `next/dynamic` (4902→300 lineas) | Bundle mas pequeño, lazy loading |
| Connection pool | PrismaPg max:20 conexiones | Evita agotamiento pool en Railway |
| Indices DB | 15 indices en FKs frecuentes | Evita full table scans |
| Paginacion | hospitales (200/pag) + proyectos (100/pag) | Evita cargar miles de registros |
| Polling | heartbeat 15s, data poll 10s (reducido 60%) | Menos peticiones al servidor |
| useReducer | Formulario visita: 8 useState → 1 reducer | Menos re-renders |
| Compresion | `compress: true` en next.config | Gzip/Brotli automatico |
| Imagenes | `formats: ["image/avif", "image/webp"]` | Formatos optimizados |
| Cache HTTP | Cache-Control en APIs de lectura | Reduce carga al servidor |
| Loading | Skeleton shimmer en dashboard y mapa (server components) | Percepcion de velocidad |

---

## 13. Estado actual y deuda tecnica

### Completado (sprints 1-18 + hardening corporativo)
Todo el detalle de funcionalidades implementadas esta en la seccion 7. El historial de sprints esta en `AGENTS-ARCHIVE.md`.

### Deuda tecnica activa

| Prioridad | Issue | Detalle |
|-----------|-------|---------|
| **ALTA** | `/datos` es mockup | datos/page.tsx — no hay APIs reales (Sprint 14 aplazado) |
| MEDIA | Object storage (F5) | Fotos y adjuntos guardados como base64 en DB. Necesario migrar a R2/S3 antes de 20 usuarios concurrentes (~2-3 dias) |
| BAJA | bodyParser size limits | next.config.ts sin limite de body |
| BAJA | Dynamic imports pendientes | DnD, QR, ComentariosPanel, SignaturePad sin lazy loading |
| BAJA | Cache Redis servidor | Agregaciones costosas sin cache Redis con TTL |

### Backlog (no priorizado)
- Notificaciones por email (Resend o similar)
- Notificaciones push movil (VAPID + FCM/OneSignal)
- Offline completo: crear registros sin conexion
- Conectar /datos a APIs reales

---

## 14. Comandos de desarrollo

```bash
# Desarrollo
npm run dev                    # Next.js dev server
npx prisma studio             # GUI base de datos

# Base de datos
npx prisma generate           # Generar cliente tras cambiar schema
npx prisma db push             # Aplicar cambios a DB
npx prisma db seed             # Seed datos iniciales

# Testing
npm run test:e2e               # Playwright headless
npm run test:e2e:ui            # Playwright con UI

# Deploy
npx tsc --noEmit               # Type check (cero errores requerido)
npx next build                 # Build local (recomendado antes de push)
git push origin main           # Railway auto-despliega

# Graphify (knowledge graph)
graphify update .              # Actualizar grafo tras cambios (sin API cost)
graphify query "<pregunta>"    # Consultar arquitectura
graphify path "A" "B"          # Camino entre dos conceptos
graphify explain "<concepto>"  # Explicacion de un nodo
```
