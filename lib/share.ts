import { whenLong } from '@/lib/format'
import type { EventRow } from '@/lib/types'

type ShareEvent = Pick<EventRow, 'id' | 'title' | 'starts_at' | 'ends_at' | 'location_name' | 'address'>

export function eventLink(id: string): string {
  return `${window.location.origin}/eventi/${id}`
}

export function placeText(e: Pick<EventRow, 'location_name' | 'address'>): string {
  return [e.location_name, e.address].filter(Boolean).join(', ')
}

export function shareText(e: ShareEvent): string {
  const place = placeText(e)
  return [`*${e.title}*`, `📅 ${whenLong(e)}`, place ? `📍 ${place}` : '', `Ci sei? 👉 ${eventLink(e.id)}`]
    .filter(Boolean)
    .join('\n')
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function mapsUrl(e: Pick<EventRow, 'location_name' | 'address'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeText(e))}`
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Condivisione nativa del telefono; false se non disponibile o annullata. */
export async function nativeShare(e: ShareEvent): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    await navigator.share({ title: e.title, text: shareText(e).replace(/\*/g, ''), url: eventLink(e.id) })
    return true
  } catch {
    return false
  }
}
