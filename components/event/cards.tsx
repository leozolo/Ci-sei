'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { AvatarStack } from '@/components/avatar'
import { MarkerCircle, MarkerCross, MarkerTick } from '@/components/marker'
import { Poster } from '@/components/media'
import { categoryById } from '@/lib/categories'
import { cityLabel } from '@/lib/city'
import { cn } from '@/lib/cn'
import { isOngoing, shortDate, timeOf, untilLabel, whenShort } from '@/lib/format'
import { fmt, msgs } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import type { EventView, RsvpStatus } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Piccoli elementi                                                    */

/** Il segno del pennarello per la tua risposta. */
export function StatusMark({ status, withLabel, className }: { status: RsvpStatus; withLabel?: boolean; className?: string }) {
  const { m } = useI18n()
  const label = m.list.status[status]
  const mark =
    status === 'going' ? (
      <MarkerTick className="size-[18px] text-going" />
    ) : status === 'maybe' ? (
      <MarkerCircle className="size-[18px] text-maybe" />
    ) : (
      <MarkerCross className="size-[16px] text-no" />
    )
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold', className)} title={label}>
      {mark}
      {withLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  )
}

export function CategoryTag({ category, className }: { category: string; className?: string }) {
  const c = categoryById(category)
  const Icon = c.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium text-muted', className)}>
      <Icon className="size-4" strokeWidth={1.9} aria-hidden />
      {c.one}
    </span>
  )
}

export function CancelledTag() {
  const { m } = useI18n()
  return (
    <span className="inline-flex items-center rounded-[6px] bg-no/10 px-1.5 py-0.5 font-list text-[12px] font-bold uppercase tracking-[0.04em] text-no">
      {m.list.cancelled}
    </span>
  )
}

/** "12 in lista" con i volti: la prima informazione di ogni evento. */
export function ListCount({
  event,
  size = 'md',
  ring = 'ring-bg',
  enterId,
}: {
  event: Pick<EventView, 'going' | 'maybe' | 'people' | 'guests'>
  size?: 'sm' | 'md'
  ring?: string
  enterId?: string
}) {
  const { m } = useI18n()
  const empty = event.going.length === 0
  return (
    <span className="flex min-w-0 items-center gap-2">
      {!empty ? <AvatarStack ids={event.going} max={size === 'sm' ? 3 : 4} size={size === 'sm' ? 22 : 26} ring={ring} enterId={enterId} /> : null}
      <span className="min-w-0 truncate">
        {empty ? (
          <span className="text-[13px] text-muted">{m.list.empty}</span>
        ) : (
          <>
            <span className={cn('font-list font-extrabold tabular-nums', size === 'sm' ? 'text-[15px]' : 'text-[17px]')}>
              {event.people}
            </span>
            <span className="ml-1 text-[13px] text-muted">{m.list.inList}</span>
          </>
        )}
        {event.maybe.length ? <span className="ml-1.5 text-[13px] text-muted">· {fmt(m.list.maybeCount, { n: event.maybe.length })}</span> : null}
      </span>
    </span>
  )
}

function whenLine(event: EventView): string {
  return isOngoing(event) ? fmt(msgs().list.ongoing, { until: untilLabel(event) }) : whenShort(event.starts_at)
}

function placeLine(event: EventView, showCity?: boolean): string {
  return [event.location_name || event.address, showCity && event.city ? cityLabel(event.city) : null].filter(Boolean).join(' · ')
}

/* ------------------------------------------------------------------ */
/* Card da ingresso: prima chi c'è, poi titolo, poi la locandina intera */

export function DoorCard({ event, showCity }: { event: EventView; showCity?: boolean }) {
  useI18n() // ridisegna al cambio lingua
  const place = placeLine(event, showCity)
  return (
    <Link
      href={`/eventi/${event.id}`}
      className="press group relative flex w-[72vw] max-w-[284px] shrink-0 snap-start flex-col"
      aria-label={`${event.title}, ${whenLine(event)}`}
    >
      <div className="flex h-7 items-center justify-between gap-2">
        <ListCount event={event} size="sm" />
        {event.myStatus && event.myStatus !== 'not_going' ? <StatusMark status={event.myStatus} /> : null}
      </div>
      <div className="mt-2.5 min-h-[76px]">
        <h3
          className={cn(
            'line-clamp-2 font-poster text-[25px] font-extrabold uppercase leading-[0.98]',
            event.is_cancelled && 'text-muted line-through decoration-no decoration-2',
          )}
        >
          {event.title}
        </h3>
        <p className="mt-1.5 truncate text-[13px] text-muted">
          {event.is_cancelled ? <CancelledTag /> : null} {whenLine(event)}
          {place ? ` · ${place}` : ''}
        </p>
      </div>
      <Poster event={event} className="mt-2 aspect-[4/5] w-full rounded-[10px] shadow-[0_8px_24px_var(--c-shadow)]" />
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Riga dell'elenco                                                    */

export function EventRow({ event, when, showCity }: { event: EventView; when?: 'time' | 'full'; showCity?: boolean }) {
  useI18n() // ridisegna al cambio lingua
  const place = placeLine(event, showCity)
  const time = isOngoing(event)
    ? fmt(msgs().list.ongoing, { until: untilLabel(event) })
    : when === 'time'
      ? timeOf(event.starts_at)
      : whenShort(event.starts_at)
  return (
    <Link href={`/eventi/${event.id}`} className="press -mx-2 flex gap-3.5 rounded-[12px] px-2 py-2.5 hover:bg-elev">
      <Poster event={event} compact className="aspect-[4/5] w-[60px] shrink-0 rounded-[8px]" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <span className="font-list text-[15px] font-bold tabular-nums text-fg">{time}</span>
          {event.is_cancelled ? <CancelledTag /> : null}
        </p>
        <h3
          className={cn(
            'mt-0.5 line-clamp-2 font-list text-[19px] font-extrabold uppercase leading-[1.02]',
            event.is_cancelled && 'text-muted line-through decoration-no decoration-2',
          )}
        >
          {event.title}
        </h3>
        {place ? <p className="mt-0.5 truncate text-[13px] text-muted">{place}</p> : null}
        <div className="mt-2 flex items-center gap-2">
          <ListCount event={event} size="sm" />
          {event.myStatus && event.myStatus !== 'not_going' ? <StatusMark status={event.myStatus} className="ml-auto" /> : null}
        </div>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* "Sei in lista": le serate a cui hai detto sì                         */

export function InListRow({ event, showCity }: { event: EventView; showCity?: boolean }) {
  const { m } = useI18n()
  const start = new Date(event.starts_at)
  const place = placeLine(event, showCity)
  return (
    <Link href={`/eventi/${event.id}`} className="press flex items-center gap-3 py-3">
      <MarkerTick className="size-6 shrink-0 text-going" title={m.list.status.going} />
      <div className="w-[58px] shrink-0 font-list uppercase leading-none">
        <span className="block text-[12px] font-semibold text-muted">{shortDate(start).split(' ').slice(0, 2).join(' ')}</span>
        <span className="mt-1 block text-[17px] font-bold tabular-nums">{isOngoing(event) ? m.list.now : timeOf(start)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-list text-[17px] font-extrabold uppercase leading-tight">{event.title}</p>
        <p className="truncate text-[13px] text-muted">
          {place || m.list.placeTbd} · {fmt(m.list.peopleInList, { n: event.people })}
        </p>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* "Dove vanno tutti": classifica per lunghezza della lista             */

export function RankRow({ event, showCity }: { event: EventView; showCity?: boolean }) {
  useI18n() // ridisegna al cambio lingua
  const place = placeLine(event, showCity)
  return (
    <Link href={`/eventi/${event.id}`} className="press flex items-center gap-4 py-3">
      <span className="w-12 shrink-0 text-right font-poster text-[40px] font-extrabold leading-[0.85] tabular-nums">{event.people}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-list text-[17px] font-extrabold uppercase leading-tight">{event.title}</p>
        <p className="truncate text-[13px] text-muted">
          {whenShort(event.starts_at)}
          {place ? ` · ${place}` : ''}
        </p>
      </div>
      <AvatarStack ids={event.going} max={3} size={24} />
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Sezioni                                                             */

export function SectionTitle({ children, aside, controls }: { children: ReactNode; aside?: ReactNode; controls?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-list text-[23px] font-extrabold leading-none">{children}</h2>
      {aside || controls ? (
        <span className="flex items-center gap-3 text-[13px] text-muted">
          {aside}
          {controls}
        </span>
      ) : null}
    </div>
  )
}

const railButton =
  'press inline-flex size-8 items-center justify-center rounded-full border border-line-strong text-fg hover:border-fg/60 disabled:opacity-30 disabled:hover:border-line-strong'

/**
 * Fila orizzontale di card. Col dito si scorre; con mouse e trackpad compaiono
 * le frecce, perché la rotella verticale non sposta una fila orizzontale.
 */
export function Rail({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const { m } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.scrollLeft <= 4
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])
  useEffect(() => {
    measure()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, children])
  const step = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' })
  }
  const controls =
    edges.start && edges.end ? null : (
      <span className="hidden gap-1.5 [@media(hover:hover)_and_(pointer:fine)]:inline-flex">
        <button type="button" aria-label={fmt(m.list.railBack, { title })} disabled={edges.start} onClick={() => step(-1)} className={railButton}>
          <LuChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label={fmt(m.list.railForward, { title })} disabled={edges.end} onClick={() => step(1)} className={railButton}>
          <LuChevronRight className="size-4" />
        </button>
      </span>
    )
  return (
    <section className="mt-10">
      <div className="mx-auto max-w-2xl px-4">
        <SectionTitle aside={aside} controls={controls}>
          {title}
        </SectionTitle>
      </div>
      <div
        ref={ref}
        onScroll={measure}
        className="no-scrollbar relative mx-auto mt-4 flex max-w-2xl snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2"
      >
        {children}
      </div>
    </section>
  )
}

export function attendanceText(e: Pick<EventView, 'going' | 'maybe' | 'people'>): string {
  const t = msgs().list
  if (e.going.length === 0 && e.maybe.length === 0) return t.empty
  const parts: string[] = []
  if (e.going.length) parts.push(fmt(t.peopleInList, { n: e.people }))
  if (e.maybe.length) parts.push(fmt(t.maybeCount, { n: e.maybe.length }))
  return parts.join(', ')
}
