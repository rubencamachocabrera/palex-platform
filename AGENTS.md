<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

# PALEX PLATFORM — Contexto de Proyecto para IA

> Fuente de verdad para cualquier asistente IA (Cowork, Claude Code, etc).
> Actualizar siempre que cambie el estado del proyecto.
> Ultima actualizacion: 2026-05-29

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
- El config real de Prisma 7 esta en `prisma.config.ts` (raiz del proyecto)
- Railway ejecuta `prisma db push` en el START (no en el build) — ver railway.toml
- `--accept-data-loss` solo cubre DROP de columnas con datos, NO cubre anadir columna NOT NULL sin default
- NUNCA nombrar un campo de relacion igual que una columna DB existente (ej: relacion `tipo` + columna antigua `tipo`) → Prisma 7 se confunde y genera ADD COLUMN tipo NOT NULL
- Cuando haya conflicto de nombre entre relacion y columna DB: usar `@map("nombre_diferente")` en el campo FK escalar (ej: `tipoId String? @map("tipo_id")`)
- `orderBy` sobre campo de relacion necesita sintaxis anidada: `{ tipo: { nombre: "asc" } }` — NO `{ tipo: "asc" }`
- Ejecutar `npx prisma generate` despues de cualquier cambio en schema.prisma

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
      visitas/[id]/page.tsx         -- Formulario 13 secciones, fotos, PDF, offline, context strip, progress map 13 segs, score badge, sectionToast, vista resumen overlay
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
    Sidebar.tsx                     -- Dark sidebar #0f172a, colapsable 256/64px, overflow-hidden fix flash, nav por rol
    TopBar.tsx                      -- Busqueda global, toggle dark/light (sol/luna), hint ⌘K, dark: variants
    ThemeProvider.tsx               -- Context dark/light, localStorage palex_theme, clase .dark en <html>, transicion suave
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
- Sidebar dark pro #0f172a, colapsable 256/64px, nav por rol, overflow-hidden fix flash botones ocultos
- TopBar: busqueda global debounced, toggle dark/light (sol/luna animado), hint ⌘K en search, dark variants
- ThemeProvider: dark/light persistido en localStorage (palex_theme), clase .dark en <html>, anti-FOUC script inline, transicion suave 250ms
- Command Palette (Cmd+K / Ctrl+K): busca hospitales + visitas, atajos teclado G+H/V/P/D
- Active state preciso en sidebar (sin doble-activo en rutas hijas)

### Dark mode (globals.css)
- @variant dark — soporte dark: variants Tailwind v4
- Overrides globales: bg-white/gray, text-gray, border, inputs, tints de estado, sombras, hover
- Skeleton shimmer adaptado a dark
- Seleccion de texto en teal
- Scrollbar dark
- Nuevas clases: .glass-panel, .text-gradient, .glow-teal, .glow-teal-sm, .shine-hover, .animate-gradient

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

## Completado (sesion 2026-05-22)
- [x] Quick-create visita desde /visitas (conectado con backend)
- [x] Exportar CSV en /visitas y /pipeline
- [x] Notificaciones: dismiss al clic, marcar todas leidas, auto-refresh 3min
- [x] Vista Resumen edicion inline por seccion (InlineFieldEditor)
- [x] Sidebar paleta navy #1c2b45 + item Explotacion de datos
- [x] Nuevo modulo /datos con KPIs en tiempo real + roadmap
- [x] Atajo teclado / para buscar en TopBar
- [x] Middleware protege /datos /pre-proyectos /hardware
- [x] Errores de carga con estado visual + reintentar (hospitales)
- [x] SVG en lugar de simbolos unicode en admin

## Completado (sesion 2026-05-29)
- [x] Seccion "Neveras y Termografia" en formulario visita (s_termo):
  - SubHeaders visuales (label teal + linea divisoria), sin valor en DB, excluidos del progreso
  - Icono termometro SVG en SECTION_ICON
  - Opciones correctas: "Solo temperatura (RFID)", "Solo ubicacion (BT)", "Temperatura y ubicacion"
  - Hints con dispositivos necesarios en cada campo de infraestructura
- [x] Modulo Hardware COMPLETO rediseno SUPER PRO:
  - Schema Prisma: TipoHardware enum → HardwareTipo model dinamico
  - HardwareCatalogo: tipoId @map("tipo_id"), referenciaPalex, proveedor, fichaUrl
  - APIs: /api/hardware/tipos (GET+POST), /api/hardware/tipos/[id] (PATCH+DELETE)
  - Admin /admin/hardware: drawer lateral, color picker tipos, card grid catalogo, tab inventario
  - User /hardware: tabs Resumen/Inventario/Instalaciones/Catalogo/Alertas
  - CatalogoTab: card grid con franja de color tipo, referenciaPalex en teal mono, pills dinamicos
- [x] railway.toml corregido: --accept-data-loss + healthcheckTimeout 120s
- [x] Fix Prisma 7: @map("tipo_id") en tipoId para evitar conflicto nombre relacion/columna
- [x] Fix TypeScript: orderBy relacion necesita { tipo: { nombre: "asc" } } no { tipo: "asc" }

---

## Roadmap de funcionalidades — analisis mayo 2026

> Priorizadas por impacto real en usuarios (no solo tecnologia)

### TIER 1 — Productividad diaria (mayor ROI para el usuario)

1. **Comentarios en visitas y proyectos** — Sistema de notas internas del equipo vinculadas a cada visita o pre-proyecto. Cada comentario tiene autor, fecha y puede adjuntar hasta 2 fotos. Base para la colaboracion real.

2. **Vista "Mi Dia"** — Widget en Dashboard que muestra: tareas vencidas o de hoy, visitas del dia, deadlines de fases de proyecto. Personalizado por rol. El usuario abre la app y sabe exactamente que tiene que hacer.

3. **Busqueda avanzada con filtros** — Extender /visitas y /pre-proyectos con filtros combinables: fecha (desde/hasta), estado, zona, tecnico asignado, hospital. Actualmente solo se filtra por nombre.

4. **Drag & drop en Kanban CRM** — Con @dnd-kit. Arrastrar oportunidades entre columnas. Actualiza etapa via PATCH inmediato. Es la mejora de UX mas esperada en pipeline.

5. **QR por hospital** — En la ficha de hospital, boton "Ver QR" genera un codigo QR con la URL publica del hospital. El tecnico lo escanea en campo para abrir la ficha rapidamente en movil.

6. **Favoritos / Acceso rapido** — Estrella en hospitales y proyectos para anclarlos al inicio del sidebar o dashboard. Persiste en localStorage (o DB). Muy util para usuarios que trabajan siempre con los mismos 5-10 centros.

### TIER 2 — Colaboracion y visibilidad de equipo

7. **Panel de equipo (ADMIN)** — Vista de "quien hace que": tabla de usuarios con su ultima visita, proyectos activos, tareas vencidas. Sin navegacion profunda, solo el resumen de cada persona. Solo visible para ADMIN.

8. **Historial de cambios en oportunidades CRM** — Timeline de cambios de etapa con fecha, usuario y nota opcional. Cuando una op pasa de Propuesta a Ganado, queda registrado quien lo movio. Critico para trazabilidad comercial.

9. **Timeline de actividad por hospital** — En la ficha de hospital, una pestaña "Actividad" con el historial cronologico: visitas realizadas, oportunidades creadas, proyectos vinculados, contactos anadidos. Una vista completa del historial con ese centro.

10. **Etiquetas / Tags** — Sistema de etiquetas libres para hospitales y visitas. El admin define las etiquetas (p.ej: "Cliente activo", "Sin contrato", "Zona norte") y los usuarios las aplican. Permite filtrar y agrupar de forma flexible.

### TIER 3 — Datos e informes

11. **Informe PDF de pre-proyecto completo** — Generar un PDF profesional Palex con toda la info del pre-proyecto: fases, tareas, hitos, responsables, fechas, notas. Complementa el PDF de visita ya existente.

12. **Exportar proyecto a Excel formateado** — Usando la lib xlsx o similar, generar un Excel con hojas separadas: resumen, fases, tareas, contactos. Mas util que CSV para el cliente final.

13. **KPIs de rendimiento por usuario / zona** — En /datos: tasa conversion visita→oportunidad, tiempo medio de ciclo de venta, visitas por mes por zona. Solo accesible para ADMIN y VENTAS.

14. **Informe de actividad semanal** — PDF o email automatico cada lunes con: visitas de la semana anterior, proyectos avanzados, tareas completadas. Generado bajo demanda desde perfil o enviado por cron.

### TIER 4 — Campo y movilidad

15. **Modo campo simplificado** — Vista minimalista del formulario de visita con solo los campos mas importantes y botones grandes (44px+). Para uso rapido desde movil en campo. Toggle "Modo campo / Modo completo".

16. **Firma digital del cliente** — En el PDF del informe de visita, canvas de firma tactil. El cliente firma en el tablet del tecnico y la firma se incrusta en el PDF final. Profesionaliza enormemente la entrega del informe.

17. **Notificaciones push del navegador** — Web Push API para alertas criticas: tarea vencida, proyecto por vencer manana, nueva asignacion. El usuario recibe notificacion aunque la app este cerrada.

18. **Sincronizacion bidireccional de calendario** — Exportar visitas agendadas a Google Calendar / Outlook via iCal (.ics). El tecnico tiene sus visitas en su calendario personal.

### TIER 5 — Diferenciadores premium

19. **Onboarding guiado (nuevo usuario)** — Wizard de 4 pasos al primer login: 1) Ver tu zona asignada, 2) Crear primera visita, 3) Explorar hospitales, 4) Abrir pipeline. Con tooltips interactivos tipo Intro.js.

20. **Vista Gantt de fases** — En el detalle del pre-proyecto, una vista de timeline horizontal con las fases como barras. Solo lectura inicialmente. Muy visual para presentar al cliente o en reuniones.

21. **Acceso compartido con contrasena** — En los links de compartir (/share/...), opcion de proteger con PIN de 4 digitos configurable por el creador. Mas seguro para informes confidenciales.

22. **Registro rapido de llamada** — Desde la ficha de hospital, boton "Registrar llamada" que abre un micro-formulario (2 campos: motivo + resultado) y crea un log sin abrir el formulario completo de visita. Ideal para comerciales.

23. **Mencion de usuarios en comentarios** — En el sistema de comentarios (feature 1), escribir @nombre autocompleta usuarios del equipo y envia una notificacion interna al mencionado.

24. **Hospitales relacionados / Grupo** — Vincular hospitales del mismo grupo hospitalario entre si. En la ficha de uno se muestran los "hospitales hermanos". Util para grupos como HM, Quiron, etc.

25. **Recordatorios personales** — Desde cualquier hospital u oportunidad, crear un recordatorio con fecha: "Llamar el 15/06". Aparece en "Mi Dia" y en las notificaciones cuando llega la fecha.

---

## Pendiente inmediato (proxima sesion)

### Sprint 6 — Quick wins de alto impacto
- [ ] Drag & drop Kanban (@dnd-kit) — Ver feature #4
- [ ] QR por hospital — Ver feature #5
- [ ] Historial cambios de etapa en oportunidades — Ver feature #8
- [ ] Vincular visita -> oportunidad desde formulario visita

### Sprint 7 — Colaboracion
- [ ] Comentarios en visitas y proyectos — Ver feature #1
- [ ] Vista "Mi Dia" en dashboard — Ver feature #2
- [ ] Timeline de actividad por hospital — Ver feature #9

### Sprint 8 — Datos y reportes
- [ ] Informe PDF pre-proyecto completo — Ver feature #11
- [ ] KPIs de rendimiento en /datos — Ver feature #13
- [ ] Busqueda avanzada con filtros — Ver feature #3

### Sprint 9 — Calidad tecnica
- [ ] Error boundaries por modulo
- [ ] Lighthouse audit (objetivo >90)
- [ ] Sentry para errores en produccion
- [ ] Tests E2E con Playwright (login, crear visita, pipeline)

---

## Checklist obligatorio antes de cada deploy a produccion

1. `git status` — verificar que TODOS los archivos modificados estan staged. Un archivo editado localmente pero no commiteado rompe el build en Railway.
2. `npx tsc --noEmit` — debe terminar sin output (cero errores). Si hay errores, NO hacer push.
3. `npx next build` — opcional pero recomendado si el cambio toca API routes o server components.
4. Solo entonces: `git push origin main`

NUNCA asumir que porque "funciona local" esta commiteado. Siempre `git status` antes del push.

---

## Railway — configuracion de deploy

- El archivo de config real es `railway.toml` (raiz del proyecto) — NO `railway.json` (ignorado)
- `railway.toml` actual:
  - build: `npx prisma generate && next build`
  - start: `npx prisma db push --accept-data-loss && npm start`
  - healthcheck: `/api/health`, timeout 120s
- `railway.json` NO existe (fue eliminado, causaba confusion)
- Si el healthcheck falla: revisar Deploy Logs → buscar el error REAL antes del "healthcheck timeout"

---

## Nomenclatura hardware Palex (APRENDER — usar siempre estos nombres exactos)

Productos que Palex instala en hospitales y laboratorios:

| Nombre correcto    | Descripcion                                              | Notas                          |
|--------------------|----------------------------------------------------------|--------------------------------|
| BC Robo            | Automat de dispensacion de tubos (Blood Collection Robot)| NO "BCRobot" ni "BC Robot"     |
| Zebra MC           | Terminal movil / handheld (lector codigos + Android)     | Ej: Zebra MC3300, MC9300       |
| Zebra Impresora    | Impresora de etiquetas de codigo de barras               | Ej: Zebra ZD421, ZT411         |
| Reader RFID        | Lector RFID fijo (conectado por red al laboratorio)      | Necesita toma de datos + corriente |
| Gateway BT         | Gateway Bluetooth (conecta neveras BT al sistema)        | Necesita toma de datos + corriente en centro de salud |
| Mini-PC            | PC industrial para el software de termografia en lab     | Necesita toma de datos + corriente |
| Nevera             | Nevera de cadena de frio para muestras biologicas        | Monitorizacion via RFID o BT   |
| Pantalla           | Monitor conectado al mini-PC en laboratorio              | Opcional, necesita corriente adicional |

### Sistema de termografia / neveras (s_termo en formulario visita)
- "Solo temperatura (RFID)": sensor RFID en nevera + Reader RFID en laboratorio
- "Solo ubicacion (BT)": sensor BT en nevera + Gateway BT en centros de salud
- "Temperatura y ubicacion": ambos sistemas combinados
- Cada ruta = circuito de recogida que parte del laboratorio y visita varios centros de salud
- Infraestructura laboratorio necesita: 3 tomas de datos (Reader RFID + Gateway BT + mini-PC) y 3-4 enchufes

### Modulo Hardware en la plataforma
- `HardwareTipo`: tipos dinamicos creables desde admin (no enum hardcodeado)
  - Ejemplos: "BC Robo", "Zebra MC", "Zebra Impresora", "Reader RFID", "Gateway BT", "Nevera", "Mini-PC"
  - Cada tipo tiene color hex para badge visual
- `HardwareCatalogo`: catalogo de modelos (marca + modelo + referenciaPalex + proveedor + precio + fichaUrl)
  - `referenciaPalex`: codigo interno Palex del modelo (ej: PAL-1234) — mostrar siempre en teal monospace
  - `tipoId String? @map("tipo_id")`: FK a HardwareTipo — el @map es CRITICO para evitar conflicto con columnas antiguas
- `HardwareUnidad`: unidades fisicas (nº serie, estado, hospital asignado, garantia)
  - Estados: DISPONIBLE, ASIGNADO, EN_MANTENIMIENTO, RETIRADO, BAJA

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
