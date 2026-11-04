'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { AvatarStack } from '@/components/avatar'
import { Poster } from '@/components/media'
import { categoryById } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { isOngoing, monthShort, timeOf, untilLabel, weekdayShort, whenShort } from '@/lib/format'
import { placeText } from '@/lib/share'
import type { EventView, RsvpStatus } from '@/lib/types'

const STATUS_TEXT: Record<RsvpStatus, string> = { going: 'Ci vai', maybe: 'Forse', not_going: 'Non vai' }
const STATUS_DOT: Record<RsvpStatus, string> = { going: 'bg-going', maybe: 'bg-maybe', not_going: 'bg-no' }

export function StatusPill({ status, glass }: { status: RsvpStatus; glass?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        glass ? 'bg-black/55 text-white backdrop-blur-md' : 'bg-elev-2 text-fg',
      )}
    >
      <span className={cn('size-2 rounded-full', STATUS_DOT[status])} />
      {STATUS_TEXT[status]}
    </span>
  )
}

export function CategoryTag({ category, glass }: { category: string; glass?: boolean }) {
  const c = categoryById(category)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        glass ? 'bg-black/55 text-white backdrop-blur-md' : 'bg-elev-2 text-fg',
      )}
    >
      <span aria-hidden>{c.emoji}</span>
      {c.one}
    </span>
  )
}

export function attendanceText(e: Pick<EventView, 'going' | 'maybe' | 'guests'>): string {
  if (e.going.length === 0 && e.maybe.length === 0) return 'Ancora nessuna risposta'
  const parts: string[] = []
  if (e.going.length) parts.push(`${e.going.length} ${e.going.length === 1 ? 'partecipa' : 'partecipano'}`)
  if (e.maybe.length) parts.push(`${e.maybe.length} forse`)
  return parts.join(', ')
}

function CancelledTag({ glass }: { glass?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold',
        glass ? 'bg-no text-white' : 'bg-no/15 text-no',
      )}
    >
      Annullato
    </span>
  )
}

/** Card grande con locandina, per i caroselli della bacheca. */
export function PosterCard({ event }: { event: EventView }) {
  const start = new Date(event.starts_at)
  return (
    <Link
      href={`/eventi/${event.id}`}
      className="press relative block w-[68vw] max-w-[264px] shrink-0 snap-start"
      aria-label={`${event.title}, ${whenShort(start)}`}
    >
      <Poster event={event} className="aspect-[4/5] rounded-[22px]">
        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-linear-to-t from-black from-15% via-black/70 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {event.is_cancelled ? <CancelledTag glass /> : <CategoryTag category={event.category} glass />}
          {event.myStatus && event.myStatus !== 'not_going' ? <StatusPill status={event.myStatus} glass /> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          {isOngoing(event) ? (
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="rounded-full bg-white px-2 py-0.5 text-black">In corso</span>
              <span className="text-white/80">{untilLabel(event)}</span>
            </div>
          ) : (
            <div className="flex items-end gap-2.5">
              <span className="font-display text-[34px] font-semibold leading-[0.78] tracking-[-0.04em]">{start.getDate()}</span>
              <span className="text-[12px] font-semibold leading-[1.2] text-white/80">
                {weekdayShort(start)} {monthShort(start)}
                <br />
                {timeOf(start)}
              </span>
            </div>
          )}
          <h3 className="mt-2.5 line-clamp-2 text-[19px] font-bold leading-[1.15] tracking-[-0.01em]">{event.title}</h3>
          {event.location_name ? <p className="mt-1 truncate text-[13px] text-white/70">{event.location_name}</p> : null}
          <div className="mt-3 flex items-center gap-2 text-[12.5px] text-white/80">
            <AvatarStack ids={event.going} max={3} size={22} ring="ring-black" />
            <span className="truncate">{attendanceText(event)}</span>
          </div>
        </div>
      </Poster>
    </Link>
  )
}

/** Riga compatta per gli elenchi. */
export function EventRow({ event, when }: { event: EventView; when?: 'time' | 'full' }) {
  const place = event.location_name || placeText(event)
  return (
    <Link href={`/eventi/${event.id}`} className="press -mx-2 flex gap-3.5 rounded-[20px] p-2 hover:bg-elev">
      <Poster event={event} className="aspect-[4/5] w-[68px] shrink-0 rounded-[14px]" />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[13px] font-medium text-muted">
          {isOngoing(event) ? `In corso, ${untilLabel(event)}` : when === 'time' ? timeOf(event.starts_at) : whenShort(event.starts_at)}
          {event.is_cancelled ? <span className="ml-2 font-bold text-no">Annullato</span> : null}
        </p>
        <h3 className={cn('mt-0.5 line-clamp-2 text-[16px] font-semibold leading-snug', event.is_cancelled && 'text-muted line-through')}>
          {event.title}
        </h3>
        {place ? <p className="truncate text-[13px] text-muted">{place}</p> : null}
        <div className="mt-1.5 flex items-center gap-2">
          <AvatarStack ids={event.going} max={3} size={20} />
          <span className="min-w-0 truncate text-[12.5px] text-muted">{attendanceText(event)}</span>
          {event.myStatus && event.myStatus !== 'not_going' ? (
            <span className="ml-auto shrink-0">
              <StatusPill status={event.myStatus} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

/** Card compatta per "I tuoi prossimi eventi". */
export function TicketCard({ event }: { event: EventView }) {
  return (
    <Link
      href={`/eventi/${event.id}`}
      className="press flex w-[76vw] max-w-[300px] shrink-0 snap-start items-center gap-3 rounded-[20px] bg-elev p-2.5 pr-4"
    >
      <Poster event={event} className="size-14 shrink-0 rounded-[14px]" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-going">
          <span className="size-1.5 rounded-full bg-going" />
          {whenShort(event.starts_at)}
        </p>
        <p className="truncate text-[15px] font-semibold">{event.title}</p>
        <p className="truncate text-[12.5px] text-muted">{event.location_name || attendanceText(event)}</p>
      </div>
    </Link>
  )
}

/** Riga orizzontale scorrevole con titolo. */
export function Rail({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mx-auto flex max-w-2xl items-baseline justify-between gap-3 px-4">
        <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em]">{title}</h2>
        {aside ? <span className="text-[13px] text-muted">{aside}</span> : null}
      </div>
      <div className="no-scrollbar mx-auto mt-3 flex max-w-2xl snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {children}
      </div>
    </section>
  )
}
