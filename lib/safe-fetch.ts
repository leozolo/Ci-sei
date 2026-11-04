import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Scarica pagine e immagini di siti esterni senza permettere di raggiungere
 * indirizzi interni (protezione SSRF), con limiti di tempo e dimensione.
 */

export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase()
  if (isIP(v) === 4) {
    const [a, b] = v.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  if (isIP(v) === 6) {
    if (v === '::' || v === '::1') return true
    if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7))
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v)
  }
  return true
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Protocollo non consentito')
  if (url.username || url.password) throw new Error('Credenziali nel link non consentite')
  if (url.port && !['80', '443', '8080', '8443'].includes(url.port)) throw new Error('Porta non consentita')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Indirizzo non consentito')
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error('Indirizzo non consentito')
  }
}

function userAgentFor(url: URL): string {
  // Instagram e Facebook mostrano i dati di anteprima solo ai "lettori di link"
  if (/(^|\.)(instagram|facebook|fb)\.com$/.test(url.hostname)) {
    return 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  }
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
}

export interface SafeResponse {
  ok: boolean
  status: number
  url: string
  contentType: string
  body: Uint8Array
}

export async function safeFetch(
  input: URL,
  opts: { accept: string; maxBytes: number; timeoutMs: number; truncate: boolean },
): Promise<SafeResponse> {
  let current = input
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(current)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
    try {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': userAgentFor(current),
          Accept: opts.accept,
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
        },
      })
      const location = res.headers.get('location')
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current)
        continue
      }
      const body = await readLimited(res, opts.maxBytes, opts.truncate)
      return { ok: res.ok, status: res.status, url: current.href, contentType: res.headers.get('content-type') ?? '', body }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('Troppi reindirizzamenti')
}

async function readLimited(res: Response, maxBytes: number, truncate: boolean): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      if (!truncate) throw new Error('File troppo grande')
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)))
      break
    }
    chunks.push(value)
  }
  const out = new Uint8Array(Math.min(total, maxBytes))
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

export function decodeHtml(body: Uint8Array, contentType: string): string {
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase() ?? 'utf-8'
  try {
    return new TextDecoder(charset).decode(body)
  } catch {
    return new TextDecoder('utf-8').decode(body)
  }
}
