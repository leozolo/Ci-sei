'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { InListButton, useRsvp } from '@/components/event/rsvp'
import { Poster } from '@/components/media'
import { Rise, SlideNumber } from '@/components/motion'
import { categoryById } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { isOngoing, untilLabel, whenShort } from '@/lib/format'
import { fmt, msgs } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { hostname } from '@/lib/share'
import type { EventView } from '@/lib/types'

/** Quante serate al massimo nell'apertura: oltre nessuno scorre. */
export const PAGER_MAX = 5

const arrow =
  'press inline-flex size-8 items-center justify-center rounded-ctl border border-line-strong text-fg hover:border-fg/60 disabled:opacity-30 disabled:hover:border-line-strong'

function Page({ event, eager, position }: { event: EventView; eager: boolean; position: string }) {
  const { m } = useI18n()
  const { memberMap } = useApp()
  const { save } = useRsvp(event)
  const on = event.myStatus === 'going'
  const when = isOngoing(event) ? fmt(msgs().list.ongoing, { until: untilLabel(event) }) : whenShort(event.starts_at)
  const place = event.location_name || event.address
  const source = event.external_url ? hostname(event.external_url) : categoryById(event.category).one
  const author = memberMap.get(event.created_by)?.display_name ?? m.common.exMember
  return (
    <article className="flex w-full shrink-0 snap-center flex-col px-4 pb-4" aria-label={`${event.title}, ${when}`}>
      <Link href={`/eventi/${event.id}`} className="press flex min-h-0 flex-1 flex-col">
        <Rise from={0.96} lift={24} className="flex min-h-0 flex-1 flex-col">
          <Poster event={event} eager={eager} strip={[source, author]} className="min-h-0 w-full flex-1" />
        </Rise>
        <Rise index={1} className="mt-4 flex items-end gap-3">
          <span className={cn('shrink-0 font-poster text-[56px] font-extrabold leading-[0.8] tabular-nums', event.people === 0 && 'text-faint')}>
            <SlideNumber value={event.people} />
            <span className="sr-only"> {m.list.inList}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 font-wide text-[24px] font-black uppercase leading-none [overflow-wrap:anywhere]">{event.title}</span>
          </span>
        </Rise>
        <Rise index={2} className="mt-3 flex items-center justify-between gap-3 font-mono text-[13px] uppercase leading-snug tracking-[0.05em] text-faint">
          <span className="min-w-0 truncate">{[when, place].filter(Boolean).join(' — ')}</span>
          <span className="shrink-0 tabular-nums" aria-hidden>
            {position}
          </span>
        </Rise>
      </Link>
      <Rise index={3} className="mt-3">
        <InListButton status={event.myStatus} onToggle={() => void save(on ? null : 'going', on ? 0 : event.myGuests)} className="w-full" />
      </Rise>
    </article>
  )
}

/**
 * L'apertura della bacheca: le serate del weekend a tutta altezza, una per pagina,
 * da scorrere di lato. Locandina intera in cornice, poi quanti siete, titolo, data
 * e il tasto per mettersi in lista.
 */
export function OpeningPager({ events, label }: { events: EventView[]; label: string }) {
  const { m } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const pages = events.slice(0, PAGER_MAX)
  if (pages.length === 0) return null

  const onScroll = () => {
    const el = ref.current
    if (!el || el.clientWidth === 0) return
    const i = Math.min(pages.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
    setCurrent((prev) => (prev === i ? prev : i))
  }
  const step = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <section aria-label={label} className="relative mx-auto max-w-2xl">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex max-h-[760px] min-h-[440px] snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        // tutta l'altezza libera tra la barra in alto (3.5rem) e quella in basso (4rem)
        style={{ height: 'calc(100dvh - 7.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
      >
        {pages.map((e, i) => (
          <Page key={e.id} event={e} eager={i === 0} position={`${i + 1} / ${pages.length}`} />
        ))}
      </div>
      {pages.length > 1 ? (
        <div className="absolute right-4 top-3 hidden gap-1.5 [@media(hover:hover)_and_(pointer:fine)]:flex">
          <button type="button" aria-label={fmt(m.list.railBack, { title: label })} disabled={current === 0} onClick={() => step(-1)} className={cn(arrow, 'bg-bg')}>
            <LuChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={fmt(m.list.railForward, { title: label })}
            disabled={current === pages.length - 1}
            onClick={() => step(1)}
            className={cn(arrow, 'bg-bg')}
          >
            <LuChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </section>
  )
}
