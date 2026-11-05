/** Date e orari nella lingua scelta, sempre nel fuso orario del telefono. */

import { fmt, getLocale, intlLocale, msgs, plural } from '@/lib/i18n/core'
import type { Locale } from '@/lib/i18n/locales'

interface Formatters {
  weekdayShort: Intl.DateTimeFormat
  weekdayLong: Intl.DateTimeFormat
  monthShort: Intl.DateTimeFormat
  dayMonthShort: Intl.DateTimeFormat
  dayMonthLong: Intl.DateTimeFormat
  dayMonthYear: Intl.DateTimeFormat
  monthYear: Intl.DateTimeFormat
  time: Intl.DateTimeFormat
}

const cache = new Map<Locale, Formatters>()

function f(): Formatters {
  const locale = getLocale()
  let out = cache.get(locale)
  if (!out) {
    const tag = intlLocale(locale)
    out = {
      weekdayShort: new Intl.DateTimeFormat(tag, { weekday: 'short' }),
      weekdayLong: new Intl.DateTimeFormat(tag, { weekday: 'long' }),
      monthShort: new Intl.DateTimeFormat(tag, { month: 'short' }),
      dayMonthShort: new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' }),
      dayMonthLong: new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long' }),
      dayMonthYear: new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }),
      monthYear: new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }),
      time: new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    }
    cache.set(locale, out)
  }
  return out
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

export const pad = (n: number) => String(n).padStart(2, '0')
export const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v))
export const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase(intlLocale()) + s.slice(1) : s)
/** Le abbreviazioni con il punto ("nov.", "нояб.") restano senza punto. */
const noDot = (s: string) => s.replace(/\./g, '')

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

export const weekdayShort = (d: Date) => noDot(f().weekdayShort.format(d))

/** Iniziali dei giorni da lunedì a domenica: L M M G V S D, M T W T F S S, П В С Ч П С В */
export function weekdayInitials(): string[] {
  const narrow = new Intl.DateTimeFormat(intlLocale(), { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, i) => narrow.format(new Date(2024, 0, 1 + i)).toLocaleUpperCase(intlLocale()))
}
export const monthShort = (d: Date) => noDot(f().monthShort.format(d))
export const timeOf = (v: string | Date) => f().time.format(toDate(v))
/** "Novembre 2026", "November 2026", "Ноябрь 2026" */
export const monthTitle = (d: Date) => capitalize(f().monthYear.format(d).replace(/\s?г\.$/, ''))

const dayMonthShort = (d: Date) => noDot(f().dayMonthShort.format(d))

/** "da novembre 2026": in russo serve il giorno perché il mese vada al genitivo ("с 5 ноября 2026 г."). */
export function sinceDate(v: string | Date): string {
  const d = toDate(v)
  return getLocale() === 'ru' ? f().dayMonthYear.format(d) : f().monthYear.format(d)
}

/** "sab 8 nov", "Sat 8 Nov", "сб 8 нояб" */
export function shortDate(v: string | Date): string {
  const d = toDate(v)
  return `${weekdayShort(d)} ${dayMonthShort(d)}`
}

/** "Oggi", "Domani", "Sabato 8 novembre" */
export function dayHeading(v: string | Date, now = new Date()): string {
  const d = toDate(v)
  const t = msgs().dates
  if (isSameDay(d, now)) return t.today
  if (isSameDay(d, addDays(now, 1))) return t.tomorrow
  if (isSameDay(d, addDays(now, -1))) return t.yesterday
  const base = `${f().weekdayLong.format(d)} ${f().dayMonthLong.format(d)}`
  return capitalize(d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`)
}

/** "Stasera, 23:00", "Domani, 21:30", "sab 8 nov, 23:00" */
export function whenShort(v: string | Date, now = new Date()): string {
  const d = toDate(v)
  const t = msgs().dates
  const time = timeOf(d)
  if (isSameDay(d, now)) return fmt(t.dayTime, { day: d.getHours() >= 18 ? t.tonight : t.today, time })
  if (isSameDay(d, addDays(now, 1))) return fmt(t.dayTime, { day: t.tomorrow, time })
  const label = shortDate(d)
  return fmt(t.dayTime, { day: d.getFullYear() === now.getFullYear() ? label : `${label} ${d.getFullYear()}`, time })
}

/** Riga completa per il dettaglio evento. */
export function whenLong(e: { starts_at: string; ends_at: string | null }, now = new Date()): string {
  const start = toDate(e.starts_at)
  const end = e.ends_at ? toDate(e.ends_at) : null
  const withYear = start.getFullYear() !== now.getFullYear()
  const day = capitalize(
    `${f().weekdayLong.format(start)} ${withYear ? f().dayMonthYear.format(start) : f().dayMonthLong.format(start)}`,
  )
  if (!end) return `${day}, ${timeOf(start)}`
  if (end.getTime() - start.getTime() < DAY) return `${day}, ${timeOf(start)} – ${timeOf(end)}`
  return `${capitalize(f().dayMonthLong.format(start))} – ${f().dayMonthLong.format(end)}${withYear ? ` ${end.getFullYear()}` : ''}`
}

/** L'evento è già iniziato e non ancora finito? */
export function isOngoing(e: { starts_at: string; effective_end: string }, now = new Date()): boolean {
  return new Date(e.starts_at) <= now && new Date(e.effective_end) > now
}

/** Per gli eventi in corso: "fino alle 05:00" oppure "fino al 4 gen". */
export function untilLabel(e: { ends_at: string | null; effective_end: string }, now = new Date()): string {
  const end = toDate(e.ends_at ?? e.effective_end)
  const t = msgs().dates
  if (end.getTime() - now.getTime() < DAY) return fmt(t.until, { time: timeOf(end) })
  return fmt(t.untilDay, { date: dayMonthShort(end) })
}

/** "adesso", "5 min fa", "3 h fa", "ieri", "4 giorni fa", "8 nov" */
export function relativeTime(v: string | Date, now = new Date()): string {
  const d = toDate(v)
  const t = msgs().dates
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return t.now
  if (diff < HOUR) return fmt(t.minutesAgo, { n: Math.floor(diff / 60_000) })
  if (diff < DAY && isSameDay(d, now)) return fmt(t.hoursAgo, { n: Math.floor(diff / HOUR) })
  if (isSameDay(d, addDays(now, -1))) return t.yesterdayLower
  if (diff < 7 * DAY) return plural(t.daysAgo, Math.max(2, Math.round(diff / DAY)))
  return dayMonthShort(d) + (d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '')
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
