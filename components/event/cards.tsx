'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { AvatarStack } from '@/components/avatar'
import { MarkerCircle, MarkerCross, MarkerTick } from '@/components/marker'
import { Poster } from '@/components/media'
import { Rise } from '@/components/motion'
import { categoryById } from '@/lib/categories'
import { cityLabel } from '@/lib/city'
import { cn } from '@/lib/cn'
import { isOngoing, timeOf, untilLabel, whenShort } from '@/lib/format'
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
  const ink = status === 'going' ? 'text-going' : status === 'maybe' ? 'text-maybe' : 'text-no'
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 font-mono text-[13px] uppercase tracking-[0.05em]', className)} title={label}>
      {mark}
      {withLabel ? <span className={ink}>{label}</span> : <span className="sr-only">{label}</span>}
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
    <span className="inline-flex items-center rounded-frame bg-no/10 px-1.5 py-0.5 font-list text-[12px] font-bold uppercase tracking-[0.04em] text-no">
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

function placeLine(event: EventView, showCity?: boolean): string {
  return [event.location_name || event.address, showCity && event.city ? cityLabel(event.city) : null].filter(Boolean).join(' · ')
}

/* ------------------------------------------------------------------ */
/* Riga da biglietto: quante persone, poi titolo e dati, poi la locandina */

export function EventRow({
  event,
  when,
  showCity,
  index = 0,
}: {
  event: EventView
  when?: 'time' | 'full'
  showCity?: boolean
  /** posizione nel gruppo, per l'ingresso a cascata */
  index?: number
}) {
  const { m } = useI18n()
  const place = placeLine(event, showCity)
  const time = isOngoing(event)
    ? fmt(msgs().list.ongoing, { until: untilLabel(event) })
    : when === 'time'
      ? timeOf(event.starts_at)
      : whenShort(event.starts_at)
  const answered = event.myStatus && event.myStatus !== 'not_going' ? event.myStatus : null
  return (
    <Rise index={index}>
      <Link href={`/eventi/${event.id}`} className="press flex items-center gap-3 border-b border-line py-3">
        <span
          className={cn(
            'min-w-11 shrink-0 font-poster text-[44px] font-extrabold leading-[0.8] tabular-nums',
            event.people === 0 && 'text-faint',
          )}
        >
          {event.people}
          <span className="sr-only"> {m.list.inList}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'line-clamp-2 font-wide text-[16px] font-black uppercase leading-[1.05] [overflow-wrap:anywhere]',
              event.is_cancelled && 'text-muted line-through decoration-no decoration-2',
            )}
          >
            {event.title}
          </span>
          <span className="mt-1.5 flex min-w-0 items-center gap-2 font-mono text-[13px] uppercase leading-snug tracking-[0.05em] text-faint">
            {event.is_cancelled ? <CancelledTag /> : null}
            {answered ? <StatusMark status={answered} withLabel /> : null}
            <span className="min-w-0 truncate">{[time, place].filter(Boolean).join(' — ')}</span>
          </span>
        </span>
        <Poster event={event} compact className="h-[60px] w-12 shrink-0" />
      </Link>
    </Rise>
  )
}

/* ------------------------------------------------------------------ */
/* Sezioni                                                             */

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-list text-[23px] font-extrabold leading-none">{children}</h2>
      {aside ? <span className="font-mono text-[13px] uppercase tracking-[0.05em] text-faint">{aside}</span> : null}
    </div>
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
