'use client'

import { useState } from 'react'
import { LuCheck, LuMinus, LuPlus } from 'react-icons/lu'
import { useMe } from '@/components/app-context'
import { toast } from '@/components/ui/feedback'
import { errorMessage, setRsvp } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { patchEvent, withRsvp } from '@/lib/events'
import { invalidate, isEventKey } from '@/lib/query'
import type { EventView, RsvpStatus } from '@/lib/types'

const OPTIONS: { status: RsvpStatus; label: string; dot: string; active: string }[] = [
  { status: 'going', label: 'Partecipo', dot: 'bg-going', active: 'bg-going text-black' },
  { status: 'maybe', label: 'Forse', dot: 'bg-maybe', active: 'bg-maybe text-black' },
  { status: 'not_going', label: 'Non partecipo', dot: 'bg-no', active: 'bg-no text-white' },
]

function tap() {
  try {
    navigator.vibrate?.(8)
  } catch {
    // non supportato
  }
}

/** Il "semaforo": Partecipo / Forse / Non partecipo, modificabile in ogni momento. */
export function RsvpControl({ event }: { event: EventView }) {
  const me = useMe()
  const [saving, setSaving] = useState(false)

  const save = async (status: RsvpStatus | null, guests: number) => {
    tap()
    patchEvent(event.id, (e) => withRsvp(e, me.id, status, guests))
    setSaving(true)
    try {
      await setRsvp(event.id, me.id, status, guests)
    } catch (err) {
      toast.error(errorMessage(err, 'Risposta non salvata. Riprova.'))
    } finally {
      setSaving(false)
      invalidate(isEventKey)
    }
  }

  const choose = (status: RsvpStatus) => {
    const next = event.myStatus === status ? null : status
    void save(next, next === 'going' ? event.myGuests : 0)
  }

  const past = new Date(event.effective_end) < new Date()

  return (
    <section className="rounded-[24px] bg-elev p-4" aria-labelledby="rsvp-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="rsvp-title" className="font-display text-[17px] font-semibold tracking-[-0.02em]">
          {past ? 'Ci sei stato?' : 'Ci sei?'}
        </h2>
        {event.myStatus ? (
          <button
            type="button"
            onClick={() => void save(null, 0)}
            disabled={saving}
            className="text-[13px] font-medium text-muted underline-offset-4 hover:underline"
          >
            Togli risposta
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="La tua partecipazione">
        {OPTIONS.map((o) => {
          const active = event.myStatus === o.status
          return (
            <button
              key={o.status}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(o.status)}
              className={cn(
                'press flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[18px] px-1 text-[13.5px] font-semibold transition-colors',
                active ? o.active : 'bg-elev-2 text-fg hover:bg-elev-3',
              )}
            >
              {active ? (
                <LuCheck key="check" className="size-[18px] animate-pop" strokeWidth={3} />
              ) : (
                <span className={cn('size-3 rounded-full', o.dot)} />
              )}
              <span className="leading-tight">{o.label}</span>
            </button>
          )
        })}
      </div>

      {event.myStatus === 'going' && !past ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-elev-2 py-1.5 pl-4 pr-1.5">
          <span className="text-[14px]">
            {event.myGuests === 0 ? 'Porti qualcuno?' : `Porti ${event.myGuests} ${event.myGuests === 1 ? 'amico' : 'amici'}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Una persona in meno"
              disabled={event.myGuests === 0 || saving}
              onClick={() => void save('going', Math.max(0, event.myGuests - 1))}
              className="press inline-flex size-9 items-center justify-center rounded-full bg-elev-3 disabled:opacity-35"
            >
              <LuMinus className="size-4" />
            </button>
            <span className="w-7 text-center font-display text-[16px] font-semibold tabular-nums">{event.myGuests}</span>
            <button
              type="button"
              aria-label="Una persona in più"
              disabled={event.myGuests >= 10 || saving}
              onClick={() => void save('going', Math.min(10, event.myGuests + 1))}
              className="press inline-flex size-9 items-center justify-center rounded-full bg-elev-3 disabled:opacity-35"
            >
              <LuPlus className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
