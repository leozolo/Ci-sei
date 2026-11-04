import type { LinkPreview } from '@/lib/types'

/**
 * Estrae titolo, immagine, data e luogo da una pagina evento (Dice, Eventbrite,
 * Resident Advisor, Instagram, siti dei locali…). Usa i dati strutturati
 * schema.org "Event" quando ci sono, altrimenti i meta tag Open Graph.
 * Funzione pura: nessun accesso alla rete.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', euro: '€', middot: '·',
  agrave: 'à', aacute: 'á', egrave: 'è', eacute: 'é', igrave: 'ì', iacute: 'í', ograve: 'ò', oacute: 'ó',
  ugrave: 'ù', uacute: 'ú', Agrave: 'À', Egrave: 'È', Eacute: 'É', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  ccedil: 'ç', ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match
    }
    return NAMED_ENTITIES[code] ?? NAMED_ENTITIES[code.toLowerCase()] ?? match
  })
}

function clean(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const out = decodeEntities(v).replace(/\s+/g, ' ').trim()
  return out || undefined
}

function cleanMultiline(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const out = decodeEntities(v)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return out || undefined
}

function limit(v: string | undefined, max: number): string | undefined {
  if (!v) return undefined
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? ''
  return attrs
}

export function parseMetaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = parseAttributes(tag)
    const key = (a.property || a.name || a.itemprop || '').toLowerCase()
    if (key && a.content && !(key in out)) out[key] = a.content
  }
  return out
}

interface LdEvent {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  image?: string
  locationName?: string
  address?: string
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined
}

function firstImage(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) {
    for (const item of v) {
      const found = firstImage(item)
      if (found) return found
    }
    return undefined
  }
  if (v && typeof v === 'object') return str((v as Record<string, unknown>).url) ?? str((v as Record<string, unknown>).contentUrl)
  return undefined
}

function toEvent(obj: Record<string, unknown>): LdEvent {
  const loc = Array.isArray(obj.location) ? obj.location[0] : obj.location
  let locationName: string | undefined
  let address: string | undefined
  if (typeof loc === 'string') locationName = loc
  else if (loc && typeof loc === 'object') {
    const l = loc as Record<string, unknown>
    if (!String(l['@type'] ?? '').includes('Virtual')) {
      locationName = str(l.name)
      const a = l.address
      if (typeof a === 'string') address = a
      else if (a && typeof a === 'object') {
        const ad = a as Record<string, unknown>
        const cityLine = [str(ad.postalCode), str(ad.addressLocality)].filter(Boolean).join(' ')
        address = [str(ad.streetAddress), cityLine].filter(Boolean).join(', ') || undefined
      }
    }
  }
  return {
    name: str(obj.name),
    description: str(obj.description),
    startDate: str(obj.startDate),
    endDate: str(obj.endDate),
    image: firstImage(obj.image),
    locationName,
    address,
  }
}

function isEventType(t: unknown): boolean {
  const types = Array.isArray(t) ? t : [t]
  return types.some((x) => typeof x === 'string' && /(^|:)(\w*Event|Festival)$/.test(x))
}

function walk(node: unknown, depth = 0): LdEvent | null {
  if (!node || depth > 6) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = walk(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object') return null
  const obj = node as Record<string, unknown>
  if (isEventType(obj['@type'])) return toEvent(obj)
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const found = walk(value, depth + 1)
      if (found) return found
    }
  }
  return null
}

export function findJsonLdEvent(html: string): LdEvent | null {
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const raw = m[1].trim().replace(/^<!--|-->$/g, '')
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      try {
        json = JSON.parse(decodeEntities(raw))
      } catch {
        continue
      }
    }
    const found = walk(json)
    if (found) return found
  }
  return null
}

function absolutize(url: string | undefined, base: string): string | undefined {
  if (!url) return undefined
  try {
    const out = new URL(decodeEntities(url.trim()), base)
    return out.protocol === 'https:' || out.protocol === 'http:' ? out.href : undefined
  } catch {
    return undefined
  }
}

export function parseLinkPreview(html: string, pageUrl: string): LinkPreview {
  const meta = parseMetaTags(html)
  const ld = findJsonLdEvent(html)
  const host = (() => {
    try {
      return new URL(pageUrl).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()
  const titleTag = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1])

  let title = clean(ld?.name) ?? clean(meta['og:title']) ?? clean(meta['twitter:title']) ?? titleTag
  let description =
    cleanMultiline(ld?.description) ??
    cleanMultiline(meta['og:description']) ??
    cleanMultiline(meta['description']) ??
    cleanMultiline(meta['twitter:description'])
  const image = absolutize(
    ld?.image ?? meta['og:image:secure_url'] ?? meta['og:image'] ?? meta['twitter:image'] ?? meta['twitter:image:src'],
    pageUrl,
  )

  // Instagram: il titolo è "Nome on Instagram: "didascalia"" → teniamo la didascalia
  if (/(^|\.)instagram\.com$/.test(host)) {
    const caption = /\b(?:on|su) Instagram:\s*["“]([\s\S]+?)["”]\s*$/i.exec(title ?? '')?.[1]
    if (caption) {
      description = cleanMultiline(caption)
      title = clean(caption.split(/\n|(?<=[.!?])\s/)[0])
    } else if (title && /instagram/i.test(title)) {
      title = undefined
    }
  }

  return {
    url: pageUrl,
    title: limit(title, 120),
    description: limit(description, 2000),
    image,
    siteName: clean(meta['og:site_name']) ?? (host || undefined),
    startDate: clean(ld?.startDate),
    endDate: clean(ld?.endDate),
    locationName: limit(clean(ld?.locationName), 200),
    address: limit(clean(ld?.address), 300),
  }
}
