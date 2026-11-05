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
import { plural } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
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
    'press flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[12px] px-0.5 py-2.5 text-[12px] font-semibold hover:bg-elev',
    active ? 'text-fg' : 'text-muted hover:text-fg',
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
  const { m, locale } = useI18n()
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
      if (next) toast(m.actions.savedToast, { label: m.actions.savedSee, onClick: () => router.push(`/u/${me.id}?tab=salvati`) })
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
      toast.success(m.actions.linkCopied)
    } catch {
      toast.error(m.actions.copyFailed)
    }
  }

  const link = typeof window !== 'undefined' ? eventLink(event.id) : ''

  return (
    <>
      <div className="flex border-y border-line py-1">
        <ActionButton label={m.actions.like} onClick={toggleLike} active={event.liked}>
          <LuHeart className={cn('size-[22px]', event.liked && 'fill-current')} strokeWidth={1.8} />
          {event.likeCount > 0 ? plural(m.actions.likes, event.likeCount) : m.actions.like}
        </ActionButton>
        <ActionButton label={event.saved ? m.actions.saved : m.actions.save} onClick={toggleSave} active={event.saved}>
          <LuBookmark className={cn('size-[22px]', event.saved && 'fill-current')} strokeWidth={1.8} />
          {event.saved ? m.actions.saved : m.actions.save}
        </ActionButton>
        <ActionButton label={m.actions.whatsappAria} href={link ? whatsappUrl(shareText(event)) : undefined}>
          <LuMessageCircle className="size-[22px]" strokeWidth={1.8} />
          WhatsApp
        </ActionButton>
        <ActionButton label={m.actions.calendarAria} onClick={() => setCalendarOpen(true)}>
          <LuCalendarPlus className="size-[22px]" strokeWidth={1.8} />
          {m.actions.calendar}
        </ActionButton>
        <ActionButton label={m.actions.share} onClick={() => void share()}>
          <LuShare2 className="size-[22px]" strokeWidth={1.8} />
          {m.actions.share}
        </ActionButton>
      </div>

      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title={m.actions.calendarTitle}>
        <div className="grid gap-2 pt-1">
          <a
            href={`/api/eventi/${event.id}/ics?lang=${locale}`}
            className="press flex items-center justify-between rounded-[12px] border border-line-strong px-4 py-3.5 font-semibold"
            onClick={() => setCalendarOpen(false)}
          >
            iPhone, Mac, Outlook
            <span className="text-[13px] font-normal text-muted">{m.actions.icsFile}</span>
          </a>
          <a
            href={link ? googleCalendarUrl(event, link) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex items-center justify-between rounded-[12px] border border-line-strong px-4 py-3.5 font-semibold"
            onClick={() => setCalendarOpen(false)}
          >
            Google Calendar
            <span className="text-[13px] font-normal text-muted">{m.actions.opensInBrowser}</span>
          </a>
          <p className="px-1 pt-1 text-[13px] text-muted">{m.actions.icsReminder}</p>
        </div>
      </Sheet>
    </>
  )
}

/** Menu per chi ha proposto l'evento (o per un amministratore). */
export function OwnerMenu({ event, open, onClose }: { event: EventView; open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { m } = useI18n()
  const [busy, setBusy] = useState(false)

  const toggleCancelled = async () => {
    const next = !event.is_cancelled
    const ok = await confirmDialog(
      next
        ? {
            title: m.owner.cancelTitle,
            message: m.owner.cancelMessage,
            confirmLabel: m.owner.cancelEvent,
            cancelLabel: m.common.back,
            destructive: true,
          }
        : { title: m.owner.restoreTitle, message: m.owner.restoreMessage, confirmLabel: m.owner.restore },
    )
    if (!ok) return
    setBusy(true)
    try {
      await setCancelled(event.id, next)
      toast.success(next ? m.owner.cancelledToast : m.owner.restoredToast)
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
      title: m.owner.deleteTitle,
      message: m.owner.deleteMessage,
      confirmLabel: m.common.delete,
      cancelLabel: m.common.back,
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await deleteEvent(event)
      toast.success(m.owner.deletedToast)
      invalidate(isEventKey)
      router.replace('/')
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  const item = 'press flex w-full items-center gap-3 rounded-[12px] border border-line-strong px-4 py-3.5 text-left font-semibold disabled:opacity-50'

  return (
    <Sheet open={open} onClose={onClose} title={m.owner.title}>
      <div className="grid gap-2 pt-1">
        <button type="button" className={item} disabled={busy} onClick={() => router.push(`/eventi/${event.id}/modifica`)}>
          <LuPencil className="size-5" /> {m.common.edit}
        </button>
        <button type="button" className={item} disabled={busy} onClick={() => void toggleCancelled()}>
          {event.is_cancelled ? <LuUndo2 className="size-5" /> : <LuBan className="size-5" />}
          {event.is_cancelled ? m.owner.restore : m.owner.cancelEvent}
        </button>
        <button type="button" className={cn(item, 'text-no')} disabled={busy} onClick={() => void remove()}>
          <LuTrash2 className="size-5" /> {m.common.delete}
        </button>
      </div>
    </Sheet>
  )
}
