/* Ci sei? — service worker: installazione come app, notifiche push, pagina offline. */

const CACHE = 'ci-sei-v1'
const STATIC = ['/icons/icon-192.png', '/icons/badge-96.png']
const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

const OFFLINE_HTML = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Offline</title><style>html,body{margin:0;height:100%;background:#000;color:#f4f3ef;font:16px/1.45 system-ui,-apple-system,sans-serif}main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center}h1{font-size:20px;margin:0}p{margin:0;color:#a8a7ad;max-width:300px}button{margin-top:12px;border:0;border-radius:16px;background:#f4f3ef;color:#000;font:600 15px system-ui;padding:12px 20px}</style></head><body><main><h1>Sei offline</h1><p>Appena torna la connessione vedrai gli eventi aggiornati.</p><button onclick="location.reload()">Riprova</button></main></body></html>`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
    )
    return
  }

  // file statici con nome univoco: dalla cache, così l'app si apre all'istante
  if (!DEV && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Ci sei?'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options)
      if (typeof data.unread === 'number' && self.navigator.setAppBadge) {
        try {
          await self.navigator.setAppBadge(data.unread)
        } catch (e) {
          /* non supportato */
        }
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(target)
            } catch (e) {
              /* ignora */
            }
          }
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
