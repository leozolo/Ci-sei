import { sb } from '@/lib/supabase/client'

/**
 * Le immagini stanno in bucket privati: per mostrarle servono URL firmati.
 * Qui li chiediamo a gruppi (una sola richiesta per molte immagini) e li
 * ricordiamo per una settimana, così il telefono riusa la cache delle foto.
 */

export type Bucket = 'event-images' | 'avatars'

const TTL_SECONDS = 60 * 60 * 24 * 7
const MIN_REMAINING_MS = 60 * 60 * 1000
const STORAGE_KEY = 'cisei:url-firmati'

interface Signed {
  url: string
  exp: number
}

const memory = new Map<string, Signed>()
let restored = false

const isExternal = (path: string) => /^https?:\/\//i.test(path)
const cacheKey = (bucket: Bucket, path: string) => `${bucket}/${path}`

function restore() {
  if (restored || typeof window === 'undefined') return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const now = Date.now()
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Signed>)) {
      if (v && typeof v.url === 'string' && v.exp - now > MIN_REMAINING_MS) memory.set(k, v)
    }
  } catch {
    // archivio locale non disponibile: si lavora solo in memoria
  }
}

let persistTimer: ReturnType<typeof setTimeout> | undefined
function persist() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      const recent = [...memory.entries()].slice(-400)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(recent)))
    } catch {
      // spazio esaurito o modalità privata
    }
  }, 600)
}

/** URL già pronto (sincrono), oppure null. */
export function peekImageUrl(bucket: Bucket, path: string | null | undefined): string | null {
  if (!path) return null
  if (isExternal(path)) return path
  if (typeof window === 'undefined') return null
  restore()
  const hit = memory.get(cacheKey(bucket, path))
  return hit && hit.exp - Date.now() > MIN_REMAINING_MS ? hit.url : null
}

export function forgetImageUrl(bucket: Bucket, path: string) {
  memory.delete(cacheKey(bucket, path))
  persist()
}

const queues = new Map<Bucket, Map<string, ((url: string | null) => void)[]>>()
const timers = new Map<Bucket, ReturnType<typeof setTimeout>>()

export function getImageUrl(bucket: Bucket, path: string): Promise<string | null> {
  const ready = peekImageUrl(bucket, path)
  if (ready) return Promise.resolve(ready)
  return new Promise((resolve) => {
    let queue = queues.get(bucket)
    if (!queue) {
      queue = new Map()
      queues.set(bucket, queue)
    }
    const waiting = queue.get(path) ?? []
    waiting.push(resolve)
    queue.set(path, waiting)
    if (!timers.has(bucket)) timers.set(bucket, setTimeout(() => void flush(bucket), 20))
  })
}

async function flush(bucket: Bucket) {
  timers.delete(bucket)
  const queue = queues.get(bucket)
  queues.delete(bucket)
  if (!queue || queue.size === 0) return
  const paths = [...queue.keys()]
  const signed = new Map<string, string>()
  try {
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await sb()
        .storage.from(bucket)
        .createSignedUrls(paths.slice(i, i + 100), TTL_SECONDS)
      if (error) throw error
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) signed.set(item.path, item.signedUrl)
      }
    }
  } catch (err) {
    console.warn('[immagini] impossibile ottenere gli URL', err)
  }
  const exp = Date.now() + TTL_SECONDS * 1000
  for (const [path, resolvers] of queue) {
    const url = signed.get(path) ?? null
    if (url) memory.set(cacheKey(bucket, path), { url, exp })
    for (const resolve of resolvers) resolve(url)
  }
  if (signed.size > 0) persist()
}

// ---------------------------------------------------------------------------
// Caricamento: ridimensiona sul telefono prima di inviare (più veloce, meno spazio)

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function compressImage(file: Blob, maxSide: number, quality = 0.85): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    if (scale === 1 && blob.size >= file.size && EXT[file.type]) return file
    return blob
  } catch {
    return file
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

export async function uploadImage(bucket: Bucket, userId: string, file: Blob, maxSide: number): Promise<string> {
  const blob = await compressImage(file, maxSide)
  const ext = EXT[blob.type]
  if (!ext) throw new Error('Formato non supportato: scegli una foto JPG, PNG o WebP.')
  if (blob.size > 10 * 1024 * 1024) throw new Error('Immagine troppo pesante (massimo 10 MB).')
  const path = `${userId}/${randomId()}.${ext}`
  const { error } = await sb()
    .storage.from(bucket)
    .upload(path, blob, { cacheControl: '31536000', contentType: blob.type, upsert: false })
  if (error) throw error
  return path
}

export async function removeImage(bucket: Bucket, path: string | null | undefined) {
  if (!path || isExternal(path)) return
  forgetImageUrl(bucket, path)
  await sb().storage.from(bucket).remove([path])
}
