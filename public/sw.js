/**
 * Service worker for 법률AI PWA.
 *
 * Strategy:
 *   - Precache the offline fallback + core icons during install.
 *   - HTML/navigation: network-first with offline fallback.
 *   - Same-origin static assets (Next.js _next/static, /icon*, /manifest.json):
 *     stale-while-revalidate.
 *   - Everything else (cross-origin, /api/*, POST, etc.): bypass the worker.
 */

const VERSION = "v1";
const PRECACHE = `legaladvisor-precache-${VERSION}`;
const RUNTIME = `legaladvisor-runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== PRECACHE && k !== RUNTIME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  if (url.pathname === "/manifest.json") return true;
  if (
    /^\/(icon[-\w]*\.(png|svg)|apple-touch-icon\.png|favicon-\d+\.png|favicon\.ico)$/.test(
      url.pathname,
    )
  ) {
    return true;
  }
  return false;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept API routes — they need fresh responses and may stream.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests → network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          return res;
        } catch {
          const cache = await caches.open(PRECACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response("오프라인 상태입니다.", {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(req);
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached ?? (await networkFetch) ?? Response.error();
      })(),
    );
    return;
  }
});
