'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useApp } from '@/components/app-context'
import { Avatar, AvatarStack } from '@/components/avatar'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import type { EventView } from '@/lib/types'

type Tab = 'going' | 'maybe' | 'not_going' | 'none'

const TABS: { id: Tab; label: string; dot: string }[] = [
  { id: 'going', label: 'Partecipano', dot: 'bg-going' },
  { id: 'maybe', label: 'Forse', dot: 'bg-maybe' },
  { id: 'not_going', label: 'Non vengono', dot: 'bg-no' },
  { id: 'none', label: 'Senza risposta', dot: 'bg-faint' },
]

/** Riepilogo: quante persone, chi partecipa, chi è indeciso. Tocca per l'elenco dei nomi. */
export function Attendance({ event }: { event: EventView }) {
  const [tab, setTab] = useState<Tab | null>(null)

  const counts: Record<Exclude<Tab, 'none'>, number> = {
    going: event.going.length,
    maybe: event.maybe.length,
    not_going: event.notGoing.length,
  }

  return (
    <section className="rounded-[24px] bg-elev p-4" aria-label="Partecipanti">
      <button type="button" onClick={() => setTab('going')} className="press flex w-full items-end justify-between gap-4 text-left">
        <span>
          <span className="block font-display text-[40px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums">
            {event.people}
          </span>
          <span className="mt-2 block text-[14px] text-muted">
            {event.people === 1 ? 'persona in arrivo' : 'persone in arrivo'}
            {event.guests > 0
              ? `: ${event.going.length} del gruppo + ${event.guests} ${event.guests === 1 ? 'ospite' : 'ospiti'}`
              : ''}
          </span>
        </span>
        <AvatarStack ids={event.going} max={4} size={32} ring="ring-elev" />
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(['going', 'maybe', 'not_going'] as const).map((id) => {
          const t = TABS.find((x) => x.id === id)!
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="press rounded-[16px] bg-elev-2 px-3 py-2.5 text-left hover:bg-elev-3"
            >
              <span className="flex items-center gap-1.5 text-[17px] font-semibold tabular-nums">
                <span className={cn('size-2 rounded-full', t.dot)} />
                {counts[id]}
              </span>
              <span className="mt-0.5 block text-[12.5px] text-muted">{t.label}</span>
            </button>
          )
        })}
      </div>

      <AttendeesSheet event={event} tab={tab} onTab={setTab} />
    </section>
  )
}

function AttendeesSheet({ event, tab, onTab }: { event: EventView; tab: Tab | null; onTab: (t: Tab | null) => void }) {
  const { members, memberMap } = useApp()

  const lists = useMemo(() => {
    const answered = new Set([...event.going, ...event.maybe, ...event.notGoing])
    const none = members
      .filter((m) => m.status === 'active' && !answered.has(m.id))
      .map((m) => m.id)
    return { going: event.going, maybe: event.maybe, not_going: event.notGoing, none }
  }, [event, members])

  const guestsOf = (id: string) => event.rsvps.find((r) => r.user_id === id)?.guests ?? 0
  const current = tab ?? 'going'
  const ids = lists[current]

  return (
    <Sheet open={tab !== null} onClose={() => onTab(null)} title="Chi c'è">
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={cn(
              'press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-semibold',
              current === t.id ? 'bg-invert text-invert-fg' : 'bg-elev-2 text-fg',
            )}
          >
            <span className={cn('size-2 rounded-full', t.dot)} />
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
                  <Avatar id={id} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{m?.display_name ?? 'Ex membro'}</span>
                    {id === event.created_by ? <span className="block text-[12.5px] text-muted">Ha proposto l&apos;evento</span> : null}
                  </span>
                  {guests > 0 ? (
                    <span className="rounded-full bg-elev-2 px-2.5 py-1 text-[12.5px] font-semibold">
                      +{guests} {guests === 1 ? 'ospite' : 'ospiti'}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
