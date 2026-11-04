/** Date e orari in italiano, sempre nel fuso orario del telefono. */

const LOCALE = 'it-IT'
const fmtWeekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })
const fmtWeekdayLong = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' })
const fmtMonthShort = new Intl.DateTimeFormat(LOCALE, { month: 'short' })
const fmtDayMonthShort = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const fmtDayMonthLong = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' })
const fmtDayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
const fmtMonthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const fmtTime = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

const HOUR = 3_600_000
const DAY = 24 * HOUR

export const pad = (n: number) => String(n).padStart(2, '0')
export const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v))
export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Chiave del giorno locale: 2026-11-08 */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const weekdayShort = (d: Date) => fmtWeekdayShort.format(d).replace('.', '')
export const monthShort = (d: Date) => fmtMonthShort.format(d).replace('.', '')
export const timeOf = (v: string | Date) => fmtTime.format(toDate(v))
export const monthTitle = (d: Date) => capitalize(fmtMonthYear.format(d))

/** "sab 8 nov" */
export function shortDate(v: string | Date): string {
  const d = toDate(v)
  return `${weekdayShort(d)} ${fmtDayMonthShort.format(d).replace('.', '')}`
}

/** "Oggi", "Domani", "Sabato 8 novembre" */
export function dayHeading(v: string | Date, now = new Date()): string {
  const d = toDate(v)
  if (isSameDay(d, now)) return 'Oggi'
  if (isSameDay(d, addDays(now, 1))) return 'Domani'
  if (isSameDay(d, addDays(now, -1))) return 'Ieri'
  const base = `${fmtWeekdayLong.format(d)} ${fmtDayMonthLong.format(d)}`
  return capitalize(d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`)
}

/** "Stasera, 23:00", "Domani, 21:30", "sab 8 nov, 23:00" */
export function whenShort(v: string | Date, now = new Date()): string {
  const d = toDate(v)
  const time = timeOf(d)
  if (isSameDay(d, now)) return `${d.getHours() >= 18 ? 'Stasera' : 'Oggi'}, ${time}`
  if (isSameDay(d, addDays(now, 1))) return `Domani, ${time}`
  const label = shortDate(d)
  return d.getFullYear() === now.getFullYear() ? `${label}, ${time}` : `${label} ${d.getFullYear()}, ${time}`
}

/** Riga completa per il dettaglio evento. */
export function whenLong(e: { starts_at: string; ends_at: string | null }, now = new Date()): string {
  const start = toDate(e.starts_at)
  const end = e.ends_at ? toDate(e.ends_at) : null
  const withYear = start.getFullYear() !== now.getFullYear()
  const day = capitalize(
    `${fmtWeekdayLong.format(start)} ${withYear ? fmtDayMonthYear.format(start) : fmtDayMonthLong.format(start)}`,
  )
  if (!end) return `${day}, ${timeOf(start)}`
  if (end.getTime() - start.getTime() < DAY) return `${day}, ${timeOf(start)} – ${timeOf(end)}`
  return `${capitalize(fmtDayMonthLong.format(start))} – ${fmtDayMonthLong.format(end)}${withYear ? ` ${end.getFullYear()}` : ''}`
}

/** L'evento è già iniziato e non ancora finito? */
export function isOngoing(e: { starts_at: string; effective_end: string }, now = new Date()): boolean {
  return new Date(e.starts_at) <= now && new Date(e.effective_end) > now
}

/** Per gli eventi in corso: "fino alle 05:00" oppure "fino al 4 gen". */
export function untilLabel(e: { ends_at: string | null; effective_end: string }, now = new Date()): string {
  const end = toDate(e.ends_at ?? e.effective_end)
  if (end.getTime() - now.getTime() < DAY) return `fino alle ${timeOf(end)}`
  return `fino al ${fmtDayMonthShort.format(end).replace('.', '')}`
}

/** "adesso", "5 min fa", "3 h fa", "ieri", "4 giorni fa", "8 nov" */
export function relativeTime(v: string | Date, now = new Date()): string {
  const d = toDate(v)
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'adesso'
  if (diff < HOUR) return `${Math.floor(diff / 60_000)} min fa`
  if (diff < DAY && isSameDay(d, now)) return `${Math.floor(diff / HOUR)} h fa`
  if (isSameDay(d, addDays(now, -1))) return 'ieri'
  if (diff < 7 * DAY) return `${Math.max(2, Math.round(diff / DAY))} giorni fa`
  return fmtDayMonthShort.format(d).replace('.', '') + (d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '')
}

/** Valori per <input type="date"> e <input type="time"> */
export const toDateInput = (d: Date) => dayKey(d)
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Unisce data e ora locali in un Date. */
export function combineLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const out = new Date(y, m - 1, d, hh, mm, 0, 0)
  return Number.isNaN(out.getTime()) ? null : out
}

/** Da venerdì a domenica: [inizio, fine) del weekend corrente o del prossimo. */
export function weekendRange(now = new Date()): [Date, Date] {
  const day = now.getDay() // 0 = domenica
  const inWeekend = day === 5 || day === 6 || day === 0
  const start = inWeekend ? startOfDay(now) : startOfDay(addDays(now, 5 - day))
  const daysToSunday = (7 - day) % 7
  const end = addDays(startOfDay(addDays(now, daysToSunday)), 1)
  return [start, end]
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
