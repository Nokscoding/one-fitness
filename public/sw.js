const CACHE = 'one-fitness-v5'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/logo.svg', '/coach.svg', '/assets/coach-sprite.webp', '/assets/exercise-sprite.webp']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(event.request, copy))
    return response
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))))
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(data.title || 'One Fitness', {
    body: data.body || 'Ton coach a un rappel pour toi.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url || '/' }
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = event.notification.data?.url || '/'
  const url = new URL(raw, self.location.origin)
  if (url.searchParams.get('tab')) url.searchParams.set('from', 'push')
  event.waitUntil(clients.openWindow(url.toString()))
})
