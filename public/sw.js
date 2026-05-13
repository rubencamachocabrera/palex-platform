// Palex Medical — Service Worker
// Cache-first para assets estáticos, Network-first para APIs y navegación

const CACHE_VERSION = 'palex-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets que se cachean en la instalación
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/logo-palex.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache parcial — algunos assets no disponibles:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('palex-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptamos peticiones de nuestro origen
  if (url.origin !== location.origin) return;

  // Auth de NextAuth: nunca interceptar (tokens CSRF, sesion)
  if (url.pathname.startsWith('/api/auth/')) return;

  // API routes → Network-first, fallback a caché solo en GET
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Next.js internals (_next/static, _next/image) → Cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navegación (páginas HTML) → Network-first, fallback a shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Resto (imágenes, fuentes, etc.) → Cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ─── Estrategias ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — recurso no disponible', { status: 503 });
  }
}

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    // Solo cachear GET exitosos — nunca cachear PATCH/POST/DELETE
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin conexion y metodo mutacion: devolver error directo
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Sin conexión', offline: true }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Sin conexión', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Intentar desde caché
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback al dashboard cacheado
    const dashboard = await caches.match('/dashboard');
    if (dashboard) return dashboard;

    return new Response(
      '<html><body><h1>Sin conexión</h1><p>La app Palex no está disponible offline todavía.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── Background Sync — cola de visitas pendientes ──────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-visitas') {
    event.waitUntil(syncPendingVisitas());
  }
});

async function syncPendingVisitas() {
  // La lógica real de sync la maneja useOfflineSync.ts desde el cliente
  // El SW notifica a todos los clientes para que procesen la cola
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUESTED' });
  });
}

// ─── Push notifications (futuro) ───────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
