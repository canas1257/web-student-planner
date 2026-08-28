const CACHE_NAME = 'ruangbelajar-app-v2'
const scopeUrl = () => new URL('./', self.registration.scope).href
const appAsset = (path) => new URL(path, self.registration.scope).href
const APP_SHELL = [
  scopeUrl(),
  appAsset('manifest.webmanifest'),
  appAsset('icons/icon-192.png'),
  appAsset('icons/icon-512.png'),
  appAsset('icons/maskable-512.png'),
  appAsset('icons/badge-96.png'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(scopeUrl(), copy))
          return response
        })
        .catch(() => caches.match(scopeUrl())),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        return response
      })
      return cached || network
    }),
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data?.json() || {} } catch { payload = { data: { body: event.data?.text() || '' } } }
  const details = payload.notification || payload.data || {}
  const data = payload.data || {}
  const title = details.title || 'RuangBelajar'
  const targetUrl = payload.fcmOptions?.link || data.url || scopeUrl()

  event.waitUntil(self.registration.showNotification(title, {
    body: details.body || 'Ada pengingat belajar baru untukmu.',
    icon: appAsset('icons/icon-192.png'),
    badge: appAsset('icons/badge-96.png'),
    tag: data.tag || data.jobId || 'ruangbelajar-update',
    renotify: Boolean(data.renotify),
    data: { ...data, url: targetUrl },
    vibrate: [180, 80, 180],
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || scopeUrl(), scopeUrl()).href
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => client.url.startsWith(scopeUrl()))
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await existing.navigate(targetUrl)
        return existing
      }
      return clients.openWindow(targetUrl)
    }),
  )
})
