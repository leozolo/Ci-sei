import type { NotificationData, NotificationType } from '@/lib/types'

const CHANGE_LABELS: Record<string, string> = {
  starts_at: 'data e ora',
  ends_at: 'orario di fine',
  location: 'luogo',
}

function changesText(changes: string[] = []): string {
  const labels = changes.map((c) => CHANGE_LABELS[c]).filter(Boolean)
  if (labels.length === 0) return 'i dettagli'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}

/** Frase per la lista notifiche: «{nome} {azione}», con eventuale citazione. */
export function describeNotification(
  type: NotificationType,
  data: NotificationData,
): { action: string; quote?: string } {
  const title = data.title ? `«${data.title}»` : 'un evento'
  switch (type) {
    case 'new_event':
      return { action: `ha proposto ${title}` }
    case 'event_updated':
      return data.changes?.includes('restored')
        ? { action: `ha ripristinato ${title}` }
        : { action: `ha cambiato ${changesText(data.changes)} di ${title}` }
    case 'event_cancelled':
      return { action: `ha annullato ${title}` }
    case 'new_comment':
      return { action: `ha commentato ${title}`, quote: data.snippet }
    case 'comment_reply':
      return { action: `ha risposto al tuo commento su ${title}`, quote: data.snippet }
    case 'friend_going':
      return { action: `partecipa a ${title}` }
    default:
      return { action: 'ha aggiornato un evento' }
  }
}

/** Titolo e testo della notifica push sul telefono. */
export function pushContent(type: NotificationType, data: NotificationData, actor: string): { title: string; body: string } {
  const title = data.title ?? 'Evento'
  switch (type) {
    case 'new_event':
      return { title: 'Nuovo evento', body: `${actor} ha proposto «${title}»` }
    case 'event_updated':
      return data.changes?.includes('restored')
        ? { title: 'Evento di nuovo in programma', body: `${actor} ha ripristinato «${title}»` }
        : { title: 'Cambio di programma', body: `${actor} ha cambiato ${changesText(data.changes)} di «${title}»` }
    case 'event_cancelled':
      return { title: 'Evento annullato', body: `«${title}» è stato annullato` }
    case 'new_comment':
      return { title, body: `${actor}: ${data.snippet ?? ''}`.trim() }
    case 'comment_reply':
      return { title: `${actor} ti ha risposto`, body: data.snippet ?? title }
    case 'friend_going':
      return { title, body: `${actor} partecipa 🟢` }
    default:
      return { title, body: actor }
  }
}
