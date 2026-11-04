'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  LuBan,
  LuBookmark,
  LuCalendarPlus,
  LuHeart,
  LuMessageCircle,
  LuPencil,
  LuShare2,
  LuTrash2,
  LuUndo2,
} from 'react-icons/lu'
import { useMe } from '@/components/app-context'
import { confirmDialog, toast } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { deleteEvent, errorMessage, setCancelled, setLiked, setSaved } from '@/lib/actions'
import { googleCalendarUrl } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import { patchEvent, withLike, withSaved } from '@/lib/events'
import { invalidate, isEventKey } from '@/lib/query'
import { eventLink, nativeShare, shareText, whatsappUrl } from '@/lib/share'
import type { EventView } from '@/lib/types'

function ActionButton({
  label,
  onClick,
  active,
  children,
  href,
}: {
  label: string
  onClick?: () => void
  active?: boolean
  children: ReactNode
  href?: string
}) {
  const cls = cn(
    'press flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[18px] px-0.5 py-3 text-[11.5px] font-semibold',
    active ? 'bg-invert text-invert-fg' : 'bg-elev text-fg hover:bg-elev-2',
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={label}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {children}
    </button>
  )
}

/** Mi piace, salva, WhatsApp, calendario, condividi. */
export function EventActions({ event }: { event: EventView }) {
  const me = useMe()
  const router = useRouter()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const toggleLike = async () => {
    const next = !event.liked
    patchEvent(event.id, (e) => withLike(e, me.id, next))
    try {
      await setLiked(event.id, me.id, next)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      invalidate(isEventKey)
    }
  }

  const toggleSave = async () => {
    const next = !event.saved
    patchEvent(event.id, (e) => withSaved(e, me.id, next))
    try {
      await setSaved(event.id, me.id, next)
      if (next) toast('Salvato tra i preferiti', { label: 'Vedi', onClick: () => router.push(`/u/${me.id}?tab=salvati`) })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      invalidate(isEventKey)
    }
  }

  const share = async () => {
    const done = await nativeShare(event)
    if (done) return
    try {
      await navigator.clipboard.writeText(eventLink(event.id))
      toast.success('Link copiato')
    } catch {
      toast.error('Copia non riuscita')
    }
  }

  const link = typeof window !== 'undefined' ? eventLink(event.id) : ''

  return (
    <>
      <div className="flex gap-2">
        <ActionButton label="Mi piace" onClick={toggleLike} active={event.liked}>
          <LuHeart key={String(event.liked)} className={cn('size-5', event.liked && 'animate-pop fill-current')} />
          {event.likeCount > 0 ? event.likeCount : 'Mi piace'}
        </ActionButton>
        <ActionButton label={event.saved ? 'Salvato' : 'Salva'} onClick={toggleSave} active={event.saved}>
          <LuBookmark className={cn('size-5', event.saved && 'fill-current')} />
          {event.saved ? 'Salvato' : 'Salva'}
        </ActionButton>
        <ActionButton label="Condividi su WhatsApp" href={link ? whatsappUrl(shareText(event)) : undefined}>
          <LuMessageCircle className="size-5" />
          WhatsApp
        </ActionButton>
        <ActionButton label="Aggiungi al calendario" onClick={() => setCalendarOpen(true)}>
          <LuCalendarPlus className="size-5" />
          Calendario
        </ActionButton>
        <ActionButton label="Condividi" onClick={() => void share()}>
          <LuShare2 className="size-5" />
          Condividi
        </ActionButton>
      </div>

      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title="Aggiungi al tuo calendario">
        <div className="grid gap-2 pt-1">
          <a
            href={`/api/eventi/${event.id}/ics`}
            className="press flex items-center justify-between rounded-[18px] bg-elev-2 px-4 py-3.5 font-semibold"
            onClick={() => setCalendarOpen(false)}
          >
            iPhone, Mac, Outlook
            <span className="text-[13px] font-normal text-muted">file .ics</span>
          </a>
          <a
            href={link ? googleCalendarUrl(event, link) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center justify-between rounded-[18px] bg-elev-2 px-4 py-3.5 font-semibold"
            onClick={() => setCalendarOpen(false)}
          >
            Google Calendar
            <span className="text-[13px] font-normal text-muted">si apre nel browser</span>
          </a>
          <p className="px-1 pt-1 text-[13px] text-muted">Con il file .ics ricevi anche un promemoria 2 ore prima.</p>
        </div>
      </Sheet>
    </>
  )
}

/** Menu per chi ha proposto l'evento (o per un amministratore). */
export function OwnerMenu({ event, open, onClose }: { event: EventView; open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const toggleCancelled = async () => {
    const next = !event.is_cancelled
    const ok = await confirmDialog(
      next
        ? {
            title: 'Annullare l’evento?',
            message: 'Resta visibile come «Annullato» e avvisiamo chi partecipa.',
            confirmLabel: 'Annulla evento',
            cancelLabel: 'Indietro',
            destructive: true,
          }
        : { title: 'Rimettere in programma?', message: 'Avvisiamo chi aveva risposto.', confirmLabel: 'Rimetti in programma' },
    )
    if (!ok) return
    setBusy(true)
    try {
      await setCancelled(event.id, next)
      toast.success(next ? 'Evento annullato' : 'Evento di nuovo in programma')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
      invalidate(isEventKey)
    }
  }

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Eliminare l’evento?',
      message: 'Spariscono anche partecipazioni e messaggi. Non si può annullare.',
      confirmLabel: 'Elimina',
      cancelLabel: 'Indietro',
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await deleteEvent(event)
      toast.success('Evento eliminato')
      invalidate(isEventKey)
      router.replace('/')
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  const item = 'press flex w-full items-center gap-3 rounded-[18px] bg-elev-2 px-4 py-3.5 text-left font-semibold disabled:opacity-50'

  return (
    <Sheet open={open} onClose={onClose} title="Gestisci evento">
      <div className="grid gap-2 pt-1">
        <button type="button" className={item} disabled={busy} onClick={() => router.push(`/eventi/${event.id}/modifica`)}>
          <LuPencil className="size-5" /> Modifica
        </button>
        <button type="button" className={item} disabled={busy} onClick={() => void toggleCancelled()}>
          {event.is_cancelled ? <LuUndo2 className="size-5" /> : <LuBan className="size-5" />}
          {event.is_cancelled ? 'Rimetti in programma' : 'Annulla evento'}
        </button>
        <button type="button" className={cn(item, 'text-no')} disabled={busy} onClick={() => void remove()}>
          <LuTrash2 className="size-5" /> Elimina
        </button>
      </div>
    </Sheet>
  )
}
