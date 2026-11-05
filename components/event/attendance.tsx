'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { LuMinus, LuPlus } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { MarkerCircle, MarkerCross, MarkerTick } from '@/components/marker'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import type { EventView } from '@/lib/types'

type Tab = 'going' | 'maybe' | 'not_going' | 'none'

const TABS: { id: Tab; label: string }[] = [
  { id: 'going', label: 'In lista' },
  { id: 'maybe', label: 'Forse' },
  { id: 'not_going', label: 'Non vengono' },
  { id: 'none', label: 'Senza risposta' },
]

const VISIBLE = 6

function TabMark({ tab, className }: { tab: Tab; className?: string }) {
  if (tab === 'going') return <MarkerTick className={cn('text-going', className)} />
  if (tab === 'maybe') return <MarkerCircle className={cn('text-maybe', className)} />
  if (tab === 'not_going') return <MarkerCross className={cn('text-no', className)} />
  return <span className={cn('inline-block rounded-full border-2 border-dotted border-faint', className)} aria-hidden />
}

/**
 * La lista all'ingresso: quante persone, i nomi spuntati con il loro +1,
 * chi è indeciso. Tocca "Vedi tutta la lista" per l'elenco completo.
 */
export function GuestList({
  event,
  drawMine,
  onGuests,
  saving,
}: {
  event: EventView
  /** disegna adesso la spunta accanto al tuo nome */
  drawMine?: boolean
  onGuests?: (guests: number) => void
  saving?: boolean
}) {
  const { me, memberMap } = useApp()
  const [tab, setTab] = useState<Tab | null>(null)
  const guestsOf = (id: string) => event.rsvps.find((r) => r.user_id === id)?.guests ?? 0
  const name = (id: string) => memberMap.get(id)?.display_name ?? 'Ex membro'
  const shown = event.going.slice(0, VISIBLE)
  const hidden = event.going.length - shown.length
  const past = new Date(event.effective_end) < new Date()

  return (
    <section id="lista" aria-labelledby="lista-titolo" className="scroll-mt-4 rounded-[18px] border border-line bg-elev px-4 pb-4 pt-5">
      <div className="flex items-end justify-between gap-4">
        <h2 id="lista-titolo" className="flex items-baseline gap-2">
          <span className="font-poster text-[56px] font-extrabold leading-[0.8] tabular-nums">{event.people}</span>
          <span className="font-list text-[19px] font-extrabold uppercase leading-none">in lista</span>
        </h2>
        {event.guests > 0 ? (
          <p className="pb-0.5 text-right text-[13px] leading-snug text-muted">
            {event.going.length} del gruppo
            <br />+ {event.guests} {event.guests === 1 ? 'ospite' : 'ospiti'}
          </p>
        ) : null}
      </div>

      {event.going.length === 0 ? (
        <p className="mt-4 text-[14px] text-muted">
          {past ? 'Nessuno si era messo in lista.' : 'Ancora nessuno: sii il primo a metterti in lista.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {shown.map((id) => {
            const mine = id === me.id
            const guests = guestsOf(id)
            return (
              <li key={id} className={cn('flex items-center gap-3 py-2.5', mine && drawMine && 'animate-name-in')}>
                <MarkerTick className="size-6 shrink-0 text-going" draw={mine && drawMine} />
                <Link href={`/u/${id}`} className="min-w-0 flex-1 truncate font-list text-[18px] font-bold uppercase leading-tight">
                  {name(id)}
                  {mine ? <span className="ml-1.5 text-[13px] font-semibold normal-case text-muted">(tu)</span> : null}
                  {id === event.created_by ? (
                    <span className="ml-1.5 text-[13px] font-semibold normal-case text-muted">ha proposto</span>
                  ) : null}
                </Link>
                {guests > 0 ? (
                  <span className="font-list text-[18px] font-extrabold text-going" aria-label={`più ${guests}`}>
                    +{guests}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {event.myStatus === 'going' && onGuests && !past ? (
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-[14px] text-muted">
            {event.myGuests === 0 ? 'Porti qualcuno?' : `Porti ${event.myGuests} ${event.myGuests === 1 ? 'persona' : 'persone'}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Una persona in meno"
              disabled={event.myGuests === 0 || saving}
              onClick={() => onGuests(Math.max(0, event.myGuests - 1))}
              className="press inline-flex size-9 items-center justify-center rounded-full border border-line-strong disabled:opacity-35"
            >
              <LuMinus className="size-4" />
            </button>
            <span className="w-8 text-center font-list text-[19px] font-extrabold tabular-nums">{event.myGuests > 0 ? `+${event.myGuests}` : 0}</span>
            <button
              type="button"
              aria-label="Una persona in più"
              disabled={event.myGuests >= 10 || saving}
              onClick={() => onGuests(Math.min(10, event.myGuests + 1))}
              className="press inline-flex size-9 items-center justify-center rounded-full border border-line-strong disabled:opacity-35"
            >
              <LuPlus className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {event.maybe.length ? (
        <p className="mt-3 flex items-start gap-2 text-[14px] text-muted">
          <MarkerCircle className="mt-px size-5 shrink-0 text-maybe" />
          <span>
            <span className="font-semibold text-fg">Forse:</span> {event.maybe.map(name).join(', ')}
          </span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setTab(hidden > 0 || event.going.length === 0 ? 'going' : event.maybe.length ? 'maybe' : 'none')}
        className="press mt-4 w-full rounded-[12px] border border-line-strong py-2.5 text-[14px] font-semibold"
      >
        {hidden > 0 ? `Vedi tutta la lista (altri ${hidden})` : 'Vedi tutte le risposte'}
      </button>

      <ListSheet event={event} tab={tab} onTab={setTab} />
    </section>
  )
}

function ListSheet({ event, tab, onTab }: { event: EventView; tab: Tab | null; onTab: (t: Tab | null) => void }) {
  const { members, memberMap } = useApp()

  const lists = useMemo(() => {
    const answered = new Set([...event.going, ...event.maybe, ...event.notGoing])
    const none = members.filter((m) => m.status === 'active' && !answered.has(m.id)).map((m) => m.id)
    return { going: event.going, maybe: event.maybe, not_going: event.notGoing, none }
  }, [event, members])

  const guestsOf = (id: string) => event.rsvps.find((r) => r.user_id === id)?.guests ?? 0
  const current = tab ?? 'going'
  const ids = lists[current]

  return (
    <Sheet open={tab !== null} onClose={() => onTab(null)} title="La lista">
      <div className="no-scrollbar relative -mx-5 flex gap-2 overflow-x-auto px-5 pb-3 sm:flex-wrap sm:overflow-visible" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              'press inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold',
              current === t.id ? 'border-fg bg-fg text-bg' : 'border-line-strong text-fg',
            )}
          >
            <TabMark tab={t.id} className="size-4" />
            {t.label} {lists[t.id].length}
          </button>
        ))}
      </div>

      {ids.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-muted">Nessuno, per ora.</p>
      ) : (
        <ul className="divide-y divide-line">
          {ids.map((id) => {
            const m = memberMap.get(id)
            const guests = current === 'going' ? guestsOf(id) : 0
            return (
              <li key={id}>
                <Link href={`/u/${id}`} onClick={() => onTab(null)} className="flex items-center gap-3 py-2.5">
                  <Avatar id={id} size={38} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-list text-[18px] font-bold uppercase',
                      current === 'not_going' && 'text-muted line-through decoration-no decoration-2',
                    )}
                  >
                    {m?.display_name ?? 'Ex membro'}
                  </span>
                  {guests > 0 ? <span className="font-list text-[18px] font-extrabold text-going">+{guests}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
