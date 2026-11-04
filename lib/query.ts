import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Piccola cache dati condivisa tra le schermate (stile SWR):
 * - deduplica le richieste e mostra subito i dati già caricati;
 * - si aggiorna quando l'app torna in primo piano o tramite invalidate();
 * - permette aggiornamenti ottimistici con updateCache().
 */

export type QueryKey = readonly (string | number | boolean | null | undefined)[]

interface Snapshot<T> {
  data: T | undefined
  error: unknown
  isLoading: boolean
}

interface Entry {
  key: QueryKey
  snapshot: Snapshot<unknown>
  fetcher?: () => Promise<unknown>
  listeners: Set<() => void>
  gen: number
  inflight: number
  updatedAt: number
}

const IDLE: Snapshot<never> = { data: undefined, error: undefined, isLoading: false }
const LOADING: Snapshot<never> = { data: undefined, error: undefined, isLoading: true }
const cache = new Map<string, Entry>()
const hashKey = (key: QueryKey) => JSON.stringify(key)

function entry(key: QueryKey): Entry {
  const h = hashKey(key)
  let e = cache.get(h)
  if (!e) {
    e = { key, snapshot: LOADING, listeners: new Set(), gen: 0, inflight: 0, updatedAt: 0 }
    cache.set(h, e)
  }
  return e
}

function emit(e: Entry, patch: Partial<Snapshot<unknown>>) {
  e.snapshot = { ...e.snapshot, ...patch }
  for (const listener of e.listeners) listener()
}

function run(e: Entry, force: boolean): Promise<void> {
  const fetcher = e.fetcher
  if (!fetcher) return Promise.resolve()
  if (!force && e.inflight !== 0 && e.inflight === e.gen) return Promise.resolve()
  const gen = ++e.gen
  e.inflight = gen
  if (e.snapshot.data === undefined && !e.snapshot.isLoading) emit(e, { isLoading: true })
  return fetcher().then(
    (data) => {
      if (gen !== e.gen) return
      e.inflight = 0
      e.updatedAt = Date.now()
      emit(e, { data, error: undefined, isLoading: false })
    },
    (error: unknown) => {
      if (gen !== e.gen) return
      e.inflight = 0
      if (process.env.NODE_ENV !== 'production') console.warn('[query]', e.key, error)
      emit(e, { error, isLoading: false })
    },
  )
}

export function useQuery<T>(
  key: QueryKey | null,
  fetcher: () => Promise<T>,
  options: { keepPrevious?: boolean; staleMs?: number } = {},
) {
  const h = key ? hashKey(key) : null
  const keyRef = useRef(key)
  keyRef.current = key
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!h || !keyRef.current) return () => {}
      const e = entry(keyRef.current)
      e.listeners.add(onChange)
      return () => {
        e.listeners.delete(onChange)
      }
    },
    [h],
  )
  const getSnapshot = useCallback(
    () => (h && keyRef.current ? entry(keyRef.current).snapshot : IDLE) as Snapshot<T>,
    [h],
  )
  const getServerSnapshot = useCallback(() => (h ? LOADING : IDLE) as Snapshot<T>, [h])
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const staleMs = options.staleMs ?? 3000
  useEffect(() => {
    if (!h || !keyRef.current) return
    const e = entry(keyRef.current)
    e.fetcher = () => fetcherRef.current()
    if (e.snapshot.data === undefined || Date.now() - e.updatedAt > staleMs) void run(e, false)
  }, [h, staleMs])

  const previous = useRef<T | undefined>(undefined)
  if (snap.data !== undefined) previous.current = snap.data
  const data = snap.data !== undefined ? snap.data : options.keepPrevious ? previous.current : undefined

  const refresh = useCallback(() => {
    if (!h || !keyRef.current) return Promise.resolve()
    return run(entry(keyRef.current), true)
  }, [h])

  return { data, error: snap.error, isLoading: snap.isLoading && data === undefined, refresh }
}

/** Ricarica i dati delle chiavi indicate (subito se visibili, altrimenti al prossimo uso). */
export function invalidate(match: (key: QueryKey) => boolean) {
  for (const e of cache.values()) {
    if (!match(e.key)) continue
    if (e.listeners.size > 0 && e.fetcher) void run(e, true)
    else e.updatedAt = 0
  }
}

/** Modifica subito i dati in cache (aggiornamento ottimistico). */
export function updateCache<T>(match: (key: QueryKey) => boolean, update: (data: T) => T) {
  for (const e of cache.values()) {
    if (!match(e.key) || e.snapshot.data === undefined) continue
    e.gen++
    emit(e, { data: update(e.snapshot.data as T) })
  }
}

export function setQueryData<T>(key: QueryKey, data: T) {
  const e = entry(key)
  e.gen++
  e.updatedAt = Date.now()
  emit(e, { data, error: undefined, isLoading: false })
}

/** Svuota tutto (es. al logout). */
export function clearCache() {
  for (const e of cache.values()) {
    e.gen++
    e.updatedAt = 0
    emit(e, { data: undefined, error: undefined, isLoading: true })
  }
}

export const isEventKey = (key: QueryKey) => key[0] === 'events' || key[0] === 'event'

let lastWake = 0
function onWake() {
  if (document.visibilityState !== 'visible') return
  const now = Date.now()
  if (now - lastWake < 5000) return
  lastWake = now
  invalidate(() => true)
}
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', onWake)
  window.addEventListener('focus', onWake)
  window.addEventListener('online', onWake)
}
