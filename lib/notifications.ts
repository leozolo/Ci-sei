import { fmt, getLocale, listJoin, messagesFor } from '@/lib/i18n/core'
import type { Locale } from '@/lib/i18n/locales'
import type { NotificationData, NotificationType } from '@/lib/types'

const CHANGE_KEYS = ['starts_at', 'ends_at', 'location'] as const
type ChangeKey = (typeof CHANGE_KEYS)[number]
const isChangeKey = (c: string): c is ChangeKey => (CHANGE_KEYS as readonly string[]).includes(c)

function changesText(changes: string[] = [], locale: Locale): string {
  const t = messagesFor(locale).notifications.changes
  const labels = changes.filter(isChangeKey).map((c) => t[c])
  return labels.length ? listJoin(labels, locale) : t.details
}

/** Frase per la lista notifiche: «{nome} {azione}», con eventuale citazione. */
export function describeNotification(
  type: NotificationType,
  data: NotificationData,
  locale: Locale = getLocale(),
): { action: string; quote?: string } {
  const t = messagesFor(locale).notifications
  const title = data.title ? fmt(t.quoted, { title: data.title }) : t.anEvent
  switch (type) {
    case 'new_event':
      return { action: fmt(t.newEvent, { title }) }
    case 'event_updated':
      return data.changes?.includes('restored')
        ? { action: fmt(t.restored, { title }) }
        : { action: fmt(t.changed, { changes: changesText(data.changes, locale), title }) }
    case 'event_cancelled':
      return { action: fmt(t.cancelled, { title }) }
    case 'new_comment':
      return { action: fmt(t.commented, { title }), quote: data.snippet }
    case 'comment_reply':
      return { action: fmt(t.replied, { title }), quote: data.snippet }
    case 'friend_going':
      return { action: fmt(t.going, { title }) }
    default:
      return { action: t.updated }
  }
}

/** Titolo e testo della notifica push sul telefono, nella lingua di chi la riceve. */
export function pushContent(
  type: NotificationType,
  data: NotificationData,
  actor: string,
  locale: Locale = getLocale(),
): { title: string; body: string } {
  const t = messagesFor(locale).notifications
  const p = t.push
  const title = data.title ?? t.eventFallback
  switch (type) {
    case 'new_event':
      return { title: p.newEventTitle, body: fmt(p.newEventBody, { actor, title }) }
    case 'event_updated':
      return data.changes?.includes('restored')
        ? { title: p.restoredTitle, body: fmt(p.restoredBody, { actor, title }) }
        : { title: p.changedTitle, body: fmt(p.changedBody, { actor, changes: changesText(data.changes, locale), title }) }
    case 'event_cancelled':
      return { title: p.cancelledTitle, body: fmt(p.cancelledBody, { title }) }
    case 'new_comment':
      return { title, body: `${actor}: ${data.snippet ?? ''}`.trim() }
    case 'comment_reply':
      return { title: fmt(p.replyTitle, { actor }), body: data.snippet ?? title }
    case 'friend_going':
      return { title, body: fmt(p.goingBody, { actor }) }
    default:
      return { title, body: actor }
  }
}
