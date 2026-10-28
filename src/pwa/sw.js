// DSA Streak service worker. A plain script: no imports, no modules.
// tools/build.js fills in the three lines marked "@build" (see tools/pwa-build.js).
//
// Rules:
//  - Install: save every app file in a cache named after this build. NO skipWaiting here:
//    a new version waits until the person taps "Reload" in the app (message SKIP_WAITING).
//  - Fetch: for same-origin GET requests, the cache answers first, the network is the fallback.
//  - Activate: delete the caches of older builds (only ones that start with our own prefix,
//    because other apps on the same website address may keep their own caches).
const VERSION = 'dev'; // @build:version
const PRECACHE_URLS = []; // @build:precache
const DEV = true; // @build:dev

const CACHE_PREFIX = 'dsa-streak-';
const CACHE_NAME = CACHE_PREFIX + VERSION;

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

// Save all files. If ANY file fails, the install fails and the old version keeps running.
async function precache() {
  const cache = await caches.open(CACHE_NAME);
  // cache: 'reload' skips the browser's own HTTP cache, so we never save stale files.
  await Promise.all(PRECACHE_URLS.map(async (path) => {
    const response = await fetch(new Request(scopeUrl(path), { cache: 'reload' }));
    if (!response.ok) throw new Error(`Could not cache ${path} (${response.status})`);
    await cache.put(scopeUrl(path), response);
  }));
}

async function deleteOldCaches() {
  const names = await caches.keys();
  await Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    .map((name) => caches.delete(name)));
}

async function answer(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Remember good answers for next time (offline).
    if (response && response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline and not saved: opening the app (any page address) shows the app itself.
    if (request.mode === 'navigate') {
      const page = await cache.match(scopeUrl('./index.html'));
      if (page) return page;
    }
    throw error;
  }
}

self.addEventListener('install', (event) => {
  if (!DEV) event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (DEV) return; // dev server: always use the network
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(answer(request));
});
