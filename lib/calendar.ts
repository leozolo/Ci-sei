import type { EventRow } from '@/lib/types'

type CalEvent = Pick<EventRow, 'id' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'location_name' | 'address'>

/** Se manca l'orario di fine, nel calendario l'evento dura 3 ore. */
export function calendarEnd(e: Pick<EventRow, 'starts_at' | 'ends_at'>): Date {
  return e.ends_at ? new Date(e.ends_at) : new Date(new Date(e.starts_at).getTime() + 3 * 3_600_000)
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const place = (e: CalEvent) => [e.location_name, e.address].filter(Boolean).join(', ')

export function googleCalendarUrl(e: CalEvent, link: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${utcStamp(new Date(e.starts_at))}/${utcStamp(calendarEnd(e))}`,
    details: [e.description, link].filter(Boolean).join('\n\n'),
    location: place(e),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Righe ICS di massimo 75 byte, come da specifica. */
function fold(line: string): string {
  const bytes = new TextEncoder()
  if (bytes.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  for (const ch of line) {
    if (bytes.encode(current + ch).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current)
      current = ch
    } else current += ch
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildIcs(e: CalEvent, link: string, appName: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeText(appName)}//IT`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@ci-sei`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(new Date(e.starts_at))}`,
    `DTEND:${utcStamp(calendarEnd(e))}`,
    `SUMMARY:${escapeText(e.title)}`,
    place(e) ? `LOCATION:${escapeText(place(e))}` : '',
    `DESCRIPTION:${escapeText([e.description, link].filter(Boolean).join('\n\n'))}`,
    `URL:${link}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function asciiSlug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'evento'
  )
}
