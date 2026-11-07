import { randomBytes } from 'node:crypto'
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_NAME } from '@/lib/config'
import { messagesFor } from '@/lib/i18n/core'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locales'
import { pushContent } from '@/lib/notifications'
import type { BroadcastResult, NotificationRow } from '@/lib/types'

interface VapidKeys {
  publicKey: string
  privateKey: string
}

/**
 * Chiavi VAPID per le notifiche push. Se non sono nelle variabili d'ambiente
 * vengono generate una volta sola e salvate nel database (tabella privata).
 */
export async function getVapidKeys(admin: SupabaseClient): Promise<VapidKeys> {
  const envPublic = process.env.VAPID_PUBLIC_KEY
  const envPrivate = process.env.VAPID_PRIVATE_KEY
  if (envPublic && envPrivate) return { publicKey: envPublic, privateKey: envPrivate }

  const read = async (): Promise<VapidKeys | null> => {
    const { data, error } = await admin.from('app_secrets').select('value').eq('key', 'vapid').maybeSingle()
    if (error) throw error
    if (!data) return null
    const parsed = JSON.parse((data as { value: string }).value) as Partial<VapidKeys>
    return parsed.publicKey && parsed.privateKey ? { publicKey: parsed.publicKey, privateKey: parsed.privateKey } : null
  }

  const existing = await read()
  if (existing) return existing
  const generated = webpush.generateVAPIDKeys()
  await admin
    .from('app_secrets')
    .upsert({ key: 'vapid', value: JSON.stringify(generated) }, { onConflict: 'key', ignoreDuplicates: true })
  const saved = await read()
  if (!saved) throw new Error('Chiavi push non disponibili')
  return saved
}

function vapidSubject(origin: string): string {
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT
  return origin.startsWith('https://') && !origin.includes('localhost') ? origin : 'mailto:notifiche@example.com'
}

interface SubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

/** Invia come push le notifiche in attesa. Restituisce quante ne sono partite. */
export async function dispatchPendingPush(admin: SupabaseClient, origin: string): Promise<number> {
  const { data: claimed, error } = await admin.rpc('claim_pending_push', { p_limit: 200 })
  if (error) throw error
  const notes = (claimed ?? []) as NotificationRow[]
  if (notes.length === 0) return 0

  const keys = await getVapidKeys(admin)
  webpush.setVapidDetails(vapidSubject(origin), keys.publicKey, keys.privateKey)

  const userIds = [...new Set(notes.map((n) => n.user_id))]
  const people = [...new Set([...userIds, ...notes.map((n) => n.actor_id).filter((x): x is string => !!x)])]

  const [subsRes, profilesRes, unreadRes] = await Promise.all([
    admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds),
    admin.from('profiles').select('id, display_name, status, locale').in('id', people),
    admin.from('notifications').select('user_id').in('user_id', userIds).is('read_at', null).limit(5000),
  ])
  const subs = (subsRes.data ?? []) as SubscriptionRow[]
  if (subs.length === 0) return 0
  const profiles = (profilesRes.data ?? []) as { id: string; display_name: string; status: string; locale?: string | null }[]
  const names = new Map(profiles.map((p) => [p.id, p.display_name]))
  const locales = new Map<string, Locale>(profiles.map((p) => [p.id, isLocale(p.locale) ? p.locale : DEFAULT_LOCALE]))
  const active = new Set(profiles.filter((p) => p.status === 'active').map((p) => p.id))
  const unread = new Map<string, number>()
  for (const row of (unreadRes.data ?? []) as { user_id: string }[]) unread.set(row.user_id, (unread.get(row.user_id) ?? 0) + 1)

  const byUser = new Map<string, SubscriptionRow[]>()
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])

  const expired: string[] = []
  let sent = 0
  await Promise.all(
    notes
      .filter((n) => active.has(n.user_id))
      .flatMap((n) =>
        (byUser.get(n.user_id) ?? []).map(async (s) => {
          const locale = locales.get(n.user_id) ?? DEFAULT_LOCALE
          const actor = (n.actor_id && names.get(n.actor_id)) || messagesFor(locale).notifications.someone
          const { title, body } = pushContent(n.type, n.data ?? {}, actor, locale)
          const url = n.event_id
            ? `/eventi/${n.event_id}${n.type === 'new_comment' || n.type === 'comment_reply' ? '#commenti' : ''}`
            : '/notifiche'
          const payload = JSON.stringify({
            title,
            body,
            url,
            tag: n.event_id ? `${n.type}:${n.event_id}` : `n:${n.id}`,
            unread: unread.get(n.user_id) ?? 0,
          })
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
              TTL: 6 * 60 * 60,
              urgency: 'normal',
            })
            sent++
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) expired.push(s.id)
          }
        }),
      ),
  )
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired)
  return sent
}

// ---------------------------------------------------------------------------
// Notifiche a tutti (solo amministratori)

/** Telefoni iscritti alle notifiche dei membri attivi. */
async function activeSubscriptions(admin: SupabaseClient): Promise<SubscriptionRow[]> {
  const [subsRes, activeRes] = await Promise.all([
    admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth'),
    admin.from('profiles').select('id').eq('status', 'active'),
  ])
  if (subsRes.error) throw subsRes.error
  if (activeRes.error) throw activeRes.error
  const active = new Set(((activeRes.data ?? []) as { id: string }[]).map((p) => p.id))
  return ((subsRes.data ?? []) as SubscriptionRow[]).filter((s) => active.has(s.user_id))
}

/** Quante persone e quanti telefoni riceverebbero adesso una notifica a tutti. */
export async function broadcastReach(admin: SupabaseClient): Promise<{ people: number; devices: number }> {
  const subs = await activeSubscriptions(admin)
  return { people: new Set(subs.map((s) => s.user_id)).size, devices: subs.length }
}

/** Spedisce il messaggio a tutti i telefoni iscritti ed elimina quelli non più validi. */
async function sendToAll(admin: SupabaseClient, origin: string, broadcast: { id: string; body: string }) {
  const subs = await activeSubscriptions(admin)
  if (subs.length === 0) return { people: 0, delivered: 0, attempted: 0 }
  const keys = await getVapidKeys(admin)
  webpush.setVapidDetails(vapidSubject(origin), keys.publicKey, keys.privateKey)
  const payload = JSON.stringify({ title: APP_NAME, body: broadcast.body, url: '/', tag: `broadcast:${broadcast.id}` })

  const expired: string[] = []
  const reached = new Set<string>()
  let delivered = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 6 * 60 * 60,
          urgency: 'normal',
          timeout: 10_000,
        })
        delivered++
        reached.add(s.user_id)
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expired.push(s.id)
      }
    }),
  )
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired)
  return { people: reached.size, delivered, attempted: subs.length }
}

/**
 * Invia le notifiche a tutti arrivate all'orario (anche quelle con «Invia a tutti»).
 * Ognuna parte una volta sola: il database la prende in carico prima dell'invio.
 */
export async function dispatchDueBroadcasts(admin: SupabaseClient, origin: string): Promise<BroadcastResult[]> {
  const { data, error } = await admin.rpc('claim_due_broadcasts', { p_limit: 5 })
  if (error) throw error
  const results: BroadcastResult[] = []
  for (const b of (data ?? []) as { id: string; body: string }[]) {
    try {
      const counts = await sendToAll(admin, origin, b)
      await admin
        .from('broadcasts')
        .update({ status: 'sent', sent_at: new Date().toISOString(), ...counts })
        .eq('id', b.id)
      results.push({ id: b.id, ...counts })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send_failed'
      await admin.from('broadcasts').update({ status: 'failed', error: message.slice(0, 300) }).eq('id', b.id)
    }
  }
  return results
}

const CRON_KEY = 'broadcast_cron'

/** Indirizzo e codice segreto con cui il database chiama l'app per le notifiche programmate. */
export async function readCronConfig(admin: SupabaseClient): Promise<{ url: string; token: string } | null> {
  const { data, error } = await admin.from('app_secrets').select('value').eq('key', CRON_KEY).maybeSingle()
  if (error || !data) return null
  try {
    const parsed = JSON.parse((data as { value: string }).value) as { url?: string; token?: string }
    return parsed.token ? { url: parsed.url ?? '', token: parsed.token } : null
  } catch {
    return null
  }
}

/** Salva l'indirizzo che il database chiama ogni minuto (il codice segreto si crea una volta sola). */
export async function ensureCronConfig(admin: SupabaseClient, url: string): Promise<void> {
  const current = await readCronConfig(admin)
  if (current?.url === url) return
  const value = JSON.stringify({ url, token: current?.token ?? randomBytes(32).toString('hex') })
  const { error } = await admin.from('app_secrets').upsert({ key: CRON_KEY, value }, { onConflict: 'key' })
  if (error) throw error
}

/** Indirizzo pubblico dell'app: su Vercel quello di produzione, anche dalle anteprime. */
export function productionOrigin(request: Request): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return host ? `https://${host}` : new URL(request.url).origin
}
