'use client'

import { useState } from 'react'
import { useMe } from '@/components/app-context'
import { MarkerCircle, MarkerCross, MarkerTick } from '@/components/marker'
import { toast } from '@/components/ui/feedback'
import { errorMessage, setRsvp } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { patchEvent, withRsvp } from '@/lib/events'
import { msgs } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { invalidate, isEventKey } from '@/lib/query'
import type { EventView, RsvpStatus } from '@/lib/types'

function tap() {
  try {
    navigator.vibrate?.(8)
  } catch {
    // non supportato
  }
}

/** Salva la risposta con aggiornamento immediato dell'interfaccia. */
export function useRsvp(event: EventView) {
  const me = useMe()
  const [saving, setSaving] = useState(false)
  const save = async (status: RsvpStatus | null, guests: number) => {
    tap()
    patchEvent(event.id, (e) => withRsvp(e, me.id, status, guests))
    setSaving(true)
    try {
      await setRsvp(event.id, me.id, status, guests)
    } catch (err) {
      toast.error(errorMessage(err, msgs().rsvp.saveError))
    } finally {
      setSaving(false)
      invalidate(isEventKey)
    }
  }
  return { save, saving }
}

/**
 * La barra in fondo all'evento: Mettimi in lista / Forse / Non vengo.
 * Sempre a portata di pollice; la risposta si cambia quando vuoi.
 */
export function RsvpBar({
  event,
  onChange,
}: {
  event: EventView
  onChange: (status: RsvpStatus | null, guests: number) => void
}) {
  const { m, locale } = useI18n()
  const status = event.myStatus
  // sui telefoni stretti Forse e No restano solo testo (in russo le parole sono più lunghe)
  const markClass = cn('shrink-0', locale === 'ru' ? 'max-[409px]:hidden' : 'max-[379px]:hidden')
  const choose = (next: RsvpStatus) => {
    const value = status === next ? null : next
    onChange(value, value === 'going' ? event.myGuests : 0)
  }

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg shadow-[0_-10px_30px_var(--c-shadow)]">
      <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3" role="radiogroup" aria-label={m.rsvp.groupLabel}>
        <button
          type="button"
          role="radio"
          aria-checked={status === 'going'}
          onClick={() => choose('going')}
          className={cn(
            // non va mai a capo: se lo spazio manca si stringono Forse e No
            'press flex h-13 min-w-max flex-[1.6] items-center justify-center gap-2 rounded-[14px] px-3 text-[16px] font-bold',
            status === 'going' ? 'bg-going text-going-ink' : 'bg-fg text-bg',
          )}
        >
          <MarkerTick key={status === 'going' ? 'in' : 'out'} draw={status === 'going'} className="size-6" strokeWidth={3.4} />
          {/* le due scritte occupano lo stesso spazio: il pulsante non cambia larghezza quando rispondi */}
          <span className="grid justify-items-center">
            <span className={cn('col-start-1 row-start-1', status === 'going' && 'invisible')}>{m.rsvp.putMe}</span>
            <span className={cn('col-start-1 row-start-1', status !== 'going' && 'invisible')}>{m.rsvp.inList}</span>
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={status === 'maybe'}
          onClick={() => choose('maybe')}
          className={cn(
            'press flex h-13 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border px-1 text-[15px] font-semibold',
            status === 'maybe' ? 'border-maybe bg-maybe text-maybe-ink' : 'border-line-strong text-fg',
          )}
        >
          <MarkerCircle className={cn('size-5', markClass)} />
          {m.rsvp.maybe}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={status === 'not_going'}
          aria-label={m.rsvp.notGoingAria}
          onClick={() => choose('not_going')}
          className={cn(
            'press flex h-13 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border px-1 text-[15px] font-semibold',
            status === 'not_going' ? 'border-no bg-no text-no-ink' : 'border-line-strong text-fg',
          )}
        >
          <MarkerCross className={cn('size-[18px]', markClass)} />
          {m.rsvp.no}
        </button>
      </div>
    </div>
  )
}
