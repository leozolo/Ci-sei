import { sb } from '@/lib/supabase/client'
import { removeImage, uploadImage } from '@/lib/storage'
import { pingPush } from '@/lib/push-client'
import { msgs } from '@/lib/i18n/core'
import type { Locale } from '@/lib/i18n/locales'
import type { CommentRow, EventInput, EventRow, InviteRow, NotifyPrefKey, Profile, Role, RsvpStatus } from '@/lib/types'

/** Messaggio leggibile per gli errori più comuni. */
export function errorMessage(err: unknown, fallback = msgs().errors.generic): string {
  const t = msgs().errors
  const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (!msg) return fallback
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return t.offline
  if (/row-level security|permission denied|42501/i.test(msg)) return t.forbidden
  if (/jwt|session/i.test(msg)) return t.session
  // messaggi che arrivano in italiano dal database
  if (msg.includes('almeno un amministratore')) return t.lastAdmin
  if (msg.includes('Solo un amministratore')) return t.adminOnly
  if (msg.includes('stesso evento')) return fallback
  if (/^[A-ZÀ-Ú][^_]*$/.test(msg) && msg.length < 140) return msg
  return fallback
}

// ---------------------------------------------------------------------------
// Partecipazione, like, salvati

export async function setRsvp(eventId: string, meId: string, status: RsvpStatus | null, guests = 0) {
  if (status === null) {
    const { error } = await sb().from('rsvps').delete().eq('event_id', eventId).eq('user_id', meId)
    if (error) throw error
    return
  }
  const { error } = await sb()
    .from('rsvps')
    .upsert(
      { event_id: eventId, user_id: meId, status, guests: status === 'going' ? guests : 0 },
      { onConflict: 'event_id,user_id' },
    )
  if (error) throw error
  if (status === 'going') pingPush()
}

export async function setLiked(eventId: string, meId: string, liked: boolean) {
  const table = sb().from('event_likes')
  const { error } = liked
    ? await table.upsert({ event_id: eventId, user_id: meId }, { onConflict: 'event_id,user_id', ignoreDuplicates: true })
    : await table.delete().eq('event_id', eventId).eq('user_id', meId)
  if (error) throw error
}

export async function setSaved(eventId: string, meId: string, saved: boolean) {
  const table = sb().from('saved_events')
  const { error } = saved
    ? await table.upsert({ event_id: eventId, user_id: meId }, { onConflict: 'event_id,user_id', ignoreDuplicates: true })
    : await table.delete().eq('event_id', eventId).eq('user_id', meId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Eventi

export async function createEvent(meId: string, input: EventInput, image: Blob | null, alsoGoing: boolean) {
  const image_path = image ? await uploadImage('event-images', meId, image, 1600) : null
  const { data, error } = await sb().from('events').insert({ ...input, image_path }).select('id').single()
  if (error) {
    if (image_path) await removeImage('event-images', image_path).catch(() => undefined)
    throw error
  }
  const id = (data as { id: string }).id
  if (alsoGoing) await setRsvp(id, meId, 'going', 0).catch(() => undefined)
  pingPush()
  return id
}

/** image: undefined = invariata, null = rimossa, Blob = nuova locandina */
export async function updateEvent(
  meId: string,
  event: Pick<EventRow, 'id' | 'image_path'>,
  input: EventInput,
  image: Blob | null | undefined,
) {
  let image_path = event.image_path
  if (image instanceof Blob) image_path = await uploadImage('event-images', meId, image, 1600)
  else if (image === null) image_path = null
  const { error } = await sb().from('events').update({ ...input, image_path }).eq('id', event.id)
  if (error) {
    if (image instanceof Blob && image_path) await removeImage('event-images', image_path).catch(() => undefined)
    throw error
  }
  if (image !== undefined && event.image_path && event.image_path !== image_path) {
    await removeImage('event-images', event.image_path).catch(() => undefined)
  }
  pingPush()
}

export async function setCancelled(eventId: string, cancelled: boolean) {
  const { error } = await sb().from('events').update({ is_cancelled: cancelled }).eq('id', eventId)
  if (error) throw error
  pingPush()
}

export async function deleteEvent(event: Pick<EventRow, 'id' | 'image_path'>) {
  const { error } = await sb().from('events').delete().eq('id', event.id)
  if (error) throw error
  await removeImage('event-images', event.image_path).catch(() => undefined)
}

// ---------------------------------------------------------------------------
// Commenti

export async function addComment(eventId: string, body: string, parentId: string | null): Promise<CommentRow> {
  const { data, error } = await sb()
    .from('comments')
    .insert({ event_id: eventId, body: body.trim(), parent_id: parentId })
    .select('*')
    .single()
  if (error) throw error
  pingPush()
  return data as CommentRow
}

export async function deleteComment(id: string) {
  const { error } = await sb().from('comments').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Notifiche

export async function markAllRead(meId: string) {
  const { error } = await sb()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', meId)
    .is('read_at', null)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Profilo

export async function updateProfile(
  me: Pick<Profile, 'id' | 'avatar_url'>,
  changes: { display_name?: string; avatar?: Blob | null },
) {
  const patch: Partial<Profile> = {}
  if (changes.display_name !== undefined) patch.display_name = changes.display_name.trim().slice(0, 40)
  let uploaded: string | null = null
  if (changes.avatar instanceof Blob) {
    uploaded = await uploadImage('avatars', me.id, changes.avatar, 512)
    patch.avatar_url = uploaded
  } else if (changes.avatar === null) {
    patch.avatar_url = null
  }
  const { error } = await sb().from('profiles').update(patch).eq('id', me.id)
  if (error) {
    if (uploaded) await removeImage('avatars', uploaded).catch(() => undefined)
    throw error
  }
  if (changes.avatar !== undefined && me.avatar_url && me.avatar_url !== patch.avatar_url) {
    await removeImage('avatars', me.avatar_url).catch(() => undefined)
  }
}

/** Lingua dell'app salvata nel profilo: vale su ogni telefono e per le notifiche. */
export async function updateLocale(meId: string, locale: Locale) {
  const { error } = await sb().from('profiles').update({ locale }).eq('id', meId)
  if (error) throw error
}

export async function updateNotifyPrefs(meId: string, prefs: Partial<Record<NotifyPrefKey, boolean>>) {
  const { error } = await sb().from('profiles').update({ notify_prefs: prefs }).eq('id', meId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Gruppo e inviti

export async function joinGroup(code: string | null, displayName: string | null): Promise<Profile> {
  const { data, error } = await sb().rpc('join_group', { p_code: code, p_display_name: displayName })
  if (error) throw error
  return data as Profile
}

export function inviteErrorMessage(err: unknown): string {
  const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (msg.includes('invalid_invite')) return msgs().errors.invalidInvite
  if (msg.includes('invite_required')) return msgs().errors.inviteRequired
  if (msg.includes('removed')) return msgs().errors.removed
  return errorMessage(err)
}

export async function createInvite(maxUses: number, expiresInDays: number | null): Promise<InviteRow> {
  const expires_at = expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null
  const { data, error } = await sb().from('invites').insert({ max_uses: maxUses, expires_at }).select('*').single()
  if (error) throw error
  return data as InviteRow
}

export async function revokeInvite(id: string) {
  const { error } = await sb().from('invites').update({ revoked_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function setMemberStatus(id: string, status: 'active' | 'removed') {
  const { error } = await sb().from('profiles').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setMemberRole(id: string, role: Role) {
  const { error } = await sb().from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}
