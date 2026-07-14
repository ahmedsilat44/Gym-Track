const CACHE = 'velocity-performance-v2'
const SHELL = ['./', './manifest.webmanifest', './icons/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match('./')
        return Response.error()
      }),
  )
})
