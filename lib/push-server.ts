import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { pushContent } from '@/lib/notifications'
import type { NotificationRow } from '@/lib/types'

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
    admin.from('profiles').select('id, display_name, status').in('id', people),
    admin.from('notifications').select('user_id').in('user_id', userIds).is('read_at', null).limit(5000),
  ])
  const subs = (subsRes.data ?? []) as SubscriptionRow[]
  if (subs.length === 0) return 0
  const profiles = (profilesRes.data ?? []) as { id: string; display_name: string; status: string }[]
  const names = new Map(profiles.map((p) => [p.id, p.display_name]))
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
          const actor = (n.actor_id && names.get(n.actor_id)) || 'Qualcuno'
          const { title, body } = pushContent(n.type, n.data ?? {}, actor)
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
