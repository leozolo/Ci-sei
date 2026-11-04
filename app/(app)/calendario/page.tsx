'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuPlus } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { EventRow } from '@/components/event/cards'
import { Chip } from '@/components/filters'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { IconButton, buttonClass } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { fetchRange } from '@/lib/events'
import { addDays, dayHeading, dayKey, isSameDay, monthTitle, startOfDay } from '@/lib/format'
import { useQuery } from '@/lib/query'
import type { EventView } from '@/lib/types'

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function gridStart(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7 // lunedì = 0
  return addDays(first, -offset)
}

export default function CalendarPage() {
  const { me } = useApp()
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [onlyMine, setOnlyMine] = useState(false)

  const from = gridStart(month)
  const to = addDays(from, 42)
  const { data, isLoading } = useQuery(
    ['events', 'range', from.toISOString(), to.toISOString(), me.id],
    () => fetchRange(me.id, from, to),
    { keepPrevious: true },
  )

  const events = useMemo(
    () => (data ?? []).filter((e) => !onlyMine || e.myStatus === 'going' || e.myStatus === 'maybe'),
    [data, onlyMine],
  )

  // per ogni giorno: eventi che iniziano quel giorno (i multi-giorno contano solo all'inizio per i pallini)
  const byDay = useMemo(() => {
    const map = new Map<string, EventView[]>()
    for (const e of events) {
      const k = dayKey(new Date(e.starts_at))
      map.set(k, [...(map.get(k) ?? []), e])
    }
    return map
  }, [events])

  // eventi di quel giorno: quelli che iniziano quel giorno, più quelli su più giorni
  // (mostre, festival) già iniziati; una serata che finisce all'alba non "sconfina"
  const dayEvents = useMemo(() => {
    const start = startOfDay(selected)
    const end = addDays(start, 1)
    const morning = new Date(start.getTime() + 8 * 3_600_000)
    return events.filter((e) => {
      const s = new Date(e.starts_at)
      if (s >= start && s < end) return true
      return s < start && !!e.ends_at && new Date(e.ends_at) > morning
    })
  }, [events, selected])

  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i))
  const moveMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <main>
      <PageHeader
        title="Calendario"
        actions={
          <Chip active={onlyMine} onClick={() => setOnlyMine((v) => !v)} className="mr-1 h-8 text-[13px]">
            Solo i miei
          </Chip>
        }
      />
      <PageBody>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">{monthTitle(month)}</h2>
          <div className="flex items-center gap-1">
            <IconButton label="Mese precedente" onClick={() => moveMonth(-1)}>
              <LuChevronLeft className="size-5" />
            </IconButton>
            <button
              type="button"
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setSelected(today)
              }}
              className="press rounded-full px-3 py-1.5 text-[13px] font-semibold hover:bg-elev-2"
            >
              Oggi
            </button>
            <IconButton label="Mese successivo" onClick={() => moveMonth(1)}>
              <LuChevronRight className="size-5" />
            </IconButton>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-[12px] font-semibold text-faint" aria-hidden>
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className={cn('grid grid-cols-7 gap-y-1 transition-opacity', isLoading && 'opacity-60')} role="grid" aria-label={monthTitle(month)}>
          {days.map((d) => {
            const k = dayKey(d)
            const list = byDay.get(k) ?? []
            const inMonth = d.getMonth() === month.getMonth()
            const isSelected = isSameDay(d, selected)
            const isToday = isSameDay(d, today)
            return (
              <button
                key={k}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${dayHeading(d)}${list.length ? `, ${list.length} eventi` : ''}`}
                onClick={() => {
                  setSelected(d)
                  if (!inMonth) setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                }}
                className="flex flex-col items-center gap-1 py-1"
              >
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full text-[15px] tabular-nums transition-colors',
                    isSelected ? 'bg-invert font-bold text-invert-fg' : isToday ? 'font-bold ring-1 ring-fg' : '',
                    !inMonth && !isSelected && 'text-faint',
                  )}
                >
                  {d.getDate()}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {list.slice(0, 3).map((e) => (
                    <span key={e.id} className={cn('size-1.5 rounded-full', e.myStatus === 'going' ? 'bg-going' : 'bg-muted')} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <section className="mt-6 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-semibold">{dayHeading(selected)}</h3>
            <Link
              href={`/eventi/nuovo?data=${dayKey(selected)}`}
              className={buttonClass('secondary', 'sm')}
              aria-label={`Proponi un evento per ${dayHeading(selected)}`}
            >
              <LuPlus className="size-4" /> Proponi
            </Link>
          </div>
          <div className="mt-3">
            {isLoading && !data ? (
              <ListSkeleton rows={2} />
            ) : dayEvents.length ? (
              <div className="space-y-1">
                {dayEvents.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <EmptyState title="Niente in programma">
                {selected < today ? 'Nessun evento quel giorno.' : 'Libero! Se hai un’idea, proponila al gruppo.'}
              </EmptyState>
            )}
          </div>
        </section>
      </PageBody>
    </main>
  )
}
