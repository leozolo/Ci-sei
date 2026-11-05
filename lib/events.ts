import { sb } from '@/lib/supabase/client'
import { addDays, dayKey, startOfDay, weekendRange } from '@/lib/format'
import { msgs } from '@/lib/i18n/core'
import { isEventKey, updateCache } from '@/lib/query'
import type { EventRaw, EventView, RsvpStatus } from '@/lib/types'

export const EVENT_SELECT =
  'id,created_by,title,description,category,starts_at,ends_at,effective_end,city,location_name,address,external_url,image_path,is_cancelled,created_at,updated_at,' +
  'rsvps(user_id,status,guests),event_likes(user_id),saved_events(user_id),comments(count)'

/** Calcola contatori e stato personale a partire dai dati grezzi. */
export function enrich(raw: EventRaw, meId: string): EventView {
  const going: string[] = []
  const maybe: string[] = []
  const notGoing: string[] = []
  let guests = 0
  let myStatus: RsvpStatus | null = null
  let myGuests = 0
  for (const r of raw.rsvps ?? []) {
    if (r.status === 'going') {
      going.push(r.user_id)
      guests += r.guests || 0
    } else if (r.status === 'maybe') maybe.push(r.user_id)
    else notGoing.push(r.user_id)
    if (r.user_id === meId) {
      myStatus = r.status
      myGuests = r.guests || 0
    }
  }
  // chi guarda vede sé stesso per primo
  for (const list of [going, maybe, notGoing]) {
    const i = list.indexOf(meId)
    if (i > 0) list.unshift(...list.splice(i, 1))
  }
  const likes = raw.event_likes ?? []
  const commentCount = raw.comments?.[0]?.count ?? 0
  return {
    ...raw,
    going,
    maybe,
    notGoing,
    guests,
    people: going.length + guests,
    myStatus,
    myGuests,
    likeCount: likes.length,
    liked: likes.some((l) => l.user_id === meId),
    saved: (raw.saved_events ?? []).some((s) => s.user_id === meId),
    commentCount,
    score: going.length * 3 + guests + maybe.length * 1.5 + likes.length + Math.min(commentCount, 6) * 0.5,
  }
}

const enrichAll = (rows: unknown, meId: string) => ((rows ?? []) as EventRaw[]).map((r) => enrich(r, meId))
const nowIso = () => new Date().toISOString()

export async function fetchUpcoming(meId: string): Promise<EventView[]> {
  const { data, error } = await sb()
    .from('events')
    .select(EVENT_SELECT)
    .gte('effective_end', nowIso())
    .order('starts_at', { ascending: true })
    .limit(500)
  if (error) throw error
  return enrichAll(data, meId)
}

export async function fetchPast(meId: string, limit: number): Promise<EventView[]> {
  const { data, error } = await sb()
    .from('events')
    .select(EVENT_SELECT)
    .lt('effective_end', nowIso())
    .order('starts_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return enrichAll(data, meId)
}

/** Eventi che si sovrappongono all'intervallo [from, to). */
export async function fetchRange(meId: string, from: Date, to: Date): Promise<EventView[]> {
  const { data, error } = await sb()
    .from('events')
    .select(EVENT_SELECT)
    .lt('starts_at', to.toISOString())
    .gte('effective_end', from.toISOString())
    .order('starts_at', { ascending: true })
    .limit(1000)
  if (error) throw error
  return enrichAll(data, meId)
}

export async function fetchEvent(meId: string, id: string): Promise<EventView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await sb().from('events').select(EVENT_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? enrich(data as EventRaw, meId) : null
}

export async function fetchCreatedBy(meId: string, userId: string): Promise<EventView[]> {
  const { data, error } = await sb()
    .from('events')
    .select(EVENT_SELECT)
    .eq('created_by', userId)
    .order('starts_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return enrichAll(data, meId)
}

async function fetchByIds(meId: string, ids: string[]): Promise<EventView[]> {
  if (ids.length === 0) return []
  const { data, error } = await sb()
    .from('events')
    .select(EVENT_SELECT)
    .in('id', ids.slice(0, 300))
    .order('starts_at', { ascending: false })
  if (error) throw error
  return enrichAll(data, meId)
}

/** Eventi a cui una persona ha confermato "Partecipo". */
export async function fetchGoingFor(meId: string, userId: string): Promise<EventView[]> {
  const { data, error } = await sb()
    .from('rsvps')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'going')
    .order('updated_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return fetchByIds(meId, (data ?? []).map((r: { event_id: string }) => r.event_id))
}

export async function fetchSaved(meId: string): Promise<EventView[]> {
  const { data, error } = await sb()
    .from('saved_events')
    .select('event_id')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return fetchByIds(meId, (data ?? []).map((r: { event_id: string }) => r.event_id))
}

// ---------------------------------------------------------------------------
// Sezioni della bacheca

export function isUpcoming(e: Pick<EventView, 'effective_end'>, now = new Date()) {
  return new Date(e.effective_end).getTime() >= now.getTime()
}

/**
 * L'evento "cade" nell'intervallo [from, to)? Conta l'inizio; gli eventi su più
 * giorni (mostre, festival) contano anche se iniziati prima. Una serata che
 * finisce all'alba resta nel giorno in cui comincia.
 */
export function happensIn(e: Pick<EventView, 'starts_at' | 'ends_at' | 'effective_end'>, from: Date, to: Date) {
  const start = new Date(e.starts_at)
  if (start >= from && start < to) return true
  const end = new Date(e.effective_end)
  return start < from && end > from && !!e.ends_at && end.getTime() - start.getTime() > 20 * 3_600_000
}

export function buildSections(events: EventView[], now = new Date()) {
  const upcoming = events.filter((e) => isUpcoming(e, now))
  const active = upcoming.filter((e) => !e.is_cancelled)
  const [wkStart, wkEnd] = weekendRange(now)
  const weekAgo = now.getTime() - 7 * 24 * 3_600_000
  return {
    all: upcoming,
    mine: active.filter((e) => e.myStatus === 'going'),
    // prima ciò che inizia nel weekend, poi mostre e simili già in corso
    weekend: active
      .filter((e) => happensIn(e, wkStart, wkEnd))
      .sort((a, b) => Number(new Date(a.starts_at) < wkStart) - Number(new Date(b.starts_at) < wkStart)),
    // "Dove vanno tutti": per lunghezza della lista (il numero che si vede),
    // a parità contano forse, like e messaggi, poi la data.
    popular: active
      .filter((e) => e.people > 0)
      .sort((a, b) => b.people - a.people || b.score - a.score || a.starts_at.localeCompare(b.starts_at))
      .slice(0, 8),
    recent: active
      .filter((e) => new Date(e.created_at).getTime() >= weekAgo)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10),
  }
}

export interface DayGroup {
  key: string
  date: Date | null
  events: EventView[]
}

/** Raggruppa per giorno; gli eventi iniziati prima di oggi e ancora in corso vanno in "In corso". */
export function groupByDay(events: EventView[], now = new Date(), descending = false): DayGroup[] {
  const today = startOfDay(now)
  const groups = new Map<string, DayGroup>()
  for (const e of events) {
    const start = new Date(e.starts_at)
    const ongoing = !descending && start < today && isUpcoming(e, now)
    const key = ongoing ? 'ongoing' : dayKey(start)
    let g = groups.get(key)
    if (!g) {
      g = { key, date: ongoing ? null : startOfDay(start), events: [] }
      groups.set(key, g)
    }
    g.events.push(e)
  }
  const list = [...groups.values()]
  list.sort((a, b) => {
    if (a.key === 'ongoing') return -1
    if (b.key === 'ongoing') return 1
    return descending ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)
  })
  return list
}

export type WhenFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month' | `day:${string}`

/** Etichette dei filtri per data, lette nella lingua corrente. */
export const WHEN_LABELS: Record<string, string> = {
  get all() {
    return msgs().filters.when.all
  },
  get today() {
    return msgs().filters.when.today
  },
  get tomorrow() {
    return msgs().filters.when.tomorrow
  },
  get weekend() {
    return msgs().filters.when.weekend
  },
  get week() {
    return msgs().filters.when.week
  },
  get month() {
    return msgs().filters.when.month
  },
}

export function whenRange(filter: WhenFilter, now = new Date()): [Date, Date] | null {
  const today = startOfDay(now)
  switch (filter) {
    case 'all':
      return null
    case 'today':
      return [today, addDays(today, 1)]
    case 'tomorrow':
      return [addDays(today, 1), addDays(today, 2)]
    case 'weekend':
      return weekendRange(now)
    case 'week':
      return [today, addDays(today, 8)]
    case 'month':
      return [today, addDays(today, 31)]
    default: {
      const day = new Date(`${filter.slice(4)}T00:00:00`)
      return Number.isNaN(day.getTime()) ? null : [day, addDays(day, 1)]
    }
  }
}

// ---------------------------------------------------------------------------
// Ricerca (sul telefono: veloce e senza distinzione di accenti)

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function matchesSearch(e: EventView, query: string): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeText(
    [e.title, e.description, e.location_name, e.address, e.city, e.category].filter(Boolean).join(' '),
  )
  return words.every((w) => haystack.includes(w))
}

// ---------------------------------------------------------------------------
// Aggiornamenti ottimistici

export function withRsvp(e: EventView, meId: string, status: RsvpStatus | null, guests: number): EventView {
  const rsvps = e.rsvps.filter((r) => r.user_id !== meId)
  if (status) rsvps.push({ user_id: meId, status, guests: status === 'going' ? guests : 0 })
  return enrich({ ...e, rsvps }, meId)
}

export function withLike(e: EventView, meId: string, liked: boolean): EventView {
  const event_likes = e.event_likes.filter((l) => l.user_id !== meId)
  if (liked) event_likes.push({ user_id: meId })
  return enrich({ ...e, event_likes }, meId)
}

export function withSaved(e: EventView, meId: string, saved: boolean): EventView {
  return enrich({ ...e, saved_events: saved ? [{ user_id: meId }] : [] }, meId)
}

/** Applica una modifica a un evento in tutte le liste e schermate già caricate. */
export function patchEvent(eventId: string, update: (e: EventView) => EventView) {
  updateCache<unknown>(isEventKey, (data) => {
    if (Array.isArray(data)) return data.map((x: EventView) => (x && x.id === eventId ? update(x) : x))
    if (data && typeof data === 'object' && (data as EventView).id === eventId) return update(data as EventView)
    return data
  })
}
