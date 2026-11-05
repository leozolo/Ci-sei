import { msgs } from '@/lib/i18n/core'
import { sb } from '@/lib/supabase/client'

export type PushSupport = 'ok' | 'unsupported' | 'ios-install'

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

/** Chiave pubblica del server (null se le notifiche push non sono configurate). */
export async function fetchPushKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/key', { cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as { publicKey?: string | null }
    return json.publicKey ?? null
  } catch {
    return null
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration()
  return reg ? reg.pushManager.getSubscription() : null
}

function base64UrlToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Va chiamata dentro il tocco dell'utente (richiesta del permesso). */
export async function enablePush(publicKey: string): Promise<'on' | 'denied'> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const reg = await registration()
  if (!reg) throw new Error(msgs().errors.pushUnavailable)
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) })
  }
  const json = sub.toJSON()
  const { error } = await sb().rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  })
  if (error) throw error
  return 'on'
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => false)
  await sb().from('push_subscriptions').delete().eq('endpoint', endpoint)
}

/** Chiede al server di spedire le notifiche push appena create. */
export function pingPush() {
  try {
    void fetch('/api/push/dispatch', { method: 'POST', keepalive: true }).catch(() => undefined)
  } catch {
    // nessuna rete: le notifiche restano visibili nell'app
  }
}
