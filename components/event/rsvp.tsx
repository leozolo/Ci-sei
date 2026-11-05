'use client'

import { useState } from 'react'
import { useMe } from '@/components/app-context'
import { MarkerCircle, MarkerCross, MarkerTick } from '@/components/marker'
import { toast } from '@/components/ui/feedback'
import { errorMessage, setRsvp } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { patchEvent, withRsvp } from '@/lib/events'
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
      toast.error(errorMessage(err, 'Risposta non salvata. Riprova.'))
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
  const status = event.myStatus
  const choose = (next: RsvpStatus) => {
    const value = status === next ? null : next
    onChange(value, value === 'going' ? event.myGuests : 0)
  }

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg shadow-[0_-10px_30px_var(--c-shadow)]">
      <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3" role="radiogroup" aria-label="La tua risposta">
        <button
          type="button"
          role="radio"
          aria-checked={status === 'going'}
          onClick={() => choose('going')}
          className={cn(
            'press flex h-13 flex-[1.6] items-center justify-center gap-2 rounded-[14px] text-[16px] font-bold',
            status === 'going' ? 'bg-going text-going-ink' : 'bg-fg text-bg',
          )}
        >
          <MarkerTick key={status === 'going' ? 'in' : 'out'} draw={status === 'going'} className="size-6" strokeWidth={3.4} />
          {status === 'going' ? 'Sei in lista' : 'Mettimi in lista'}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={status === 'maybe'}
          onClick={() => choose('maybe')}
          className={cn(
            'press flex h-13 flex-1 items-center justify-center gap-1.5 rounded-[14px] border text-[15px] font-semibold',
            status === 'maybe' ? 'border-maybe bg-maybe text-maybe-ink' : 'border-line-strong text-fg',
          )}
        >
          <MarkerCircle className="size-5" />
          Forse
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={status === 'not_going'}
          aria-label="Non vengo"
          onClick={() => choose('not_going')}
          className={cn(
            'press flex h-13 flex-1 items-center justify-center gap-1.5 rounded-[14px] border text-[15px] font-semibold',
            status === 'not_going' ? 'border-no bg-no text-no-ink' : 'border-line-strong text-fg',
          )}
        >
          <MarkerCross className="size-[18px]" />
          No
        </button>
      </div>
    </div>
  )
}
