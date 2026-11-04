'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { LuCalendarDays, LuChevronLeft, LuEllipsis, LuExternalLink, LuLink, LuMapPin, LuX } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { Attendance } from '@/components/event/attendance'
import { CategoryTag } from '@/components/event/cards'
import { Comments, Linkify } from '@/components/event/comments'
import { EventActions, OwnerMenu } from '@/components/event/event-actions'
import { RsvpControl } from '@/components/event/rsvp'
import { PosterPlaceholder, useImageUrl } from '@/components/media'
import { EmptyState, PageHeader } from '@/components/page-header'
import { Button, IconButton } from '@/components/ui/button'
import { fetchEvent } from '@/lib/events'
import { addDays, isSameDay, relativeTime, startOfDay, whenLong } from '@/lib/format'
import { useQuery } from '@/lib/query'
import { hostname, mapsUrl } from '@/lib/share'
import type { EventView } from '@/lib/types'

function countdown(e: EventView, now = new Date()): string {
  const start = new Date(e.starts_at)
  const end = new Date(e.effective_end)
  if (end < now) return 'Concluso'
  if (start <= now) return 'In corso'
  if (isSameDay(start, now)) return start.getHours() >= 18 ? 'Stasera' : 'Oggi'
  if (isSameDay(start, addDays(now, 1))) return 'Domani'
  const days = Math.round((startOfDay(start).getTime() - startOfDay(now).getTime()) / 86_400_000)
  return `Tra ${days} giorni`
}

function InfoRow({
  icon: Icon,
  title,
  subtitle,
  href,
  action,
}: {
  icon: ComponentType<{ className?: string }>
  title: ReactNode
  subtitle?: ReactNode
  href?: string
  action?: string
}) {
  const content = (
    <>
      <Icon className="mt-0.5 size-5 shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-[13.5px] text-muted">{subtitle}</span> : null}
      </span>
      {action ? (
        <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full bg-elev-2 px-3 py-1.5 text-[13px] font-semibold">
          {action}
          <LuExternalLink className="size-3.5" />
        </span>
      ) : null}
    </>
  )
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="press flex gap-3.5 px-4 py-3.5">
          {content}
        </a>
      ) : (
        <div className="flex gap-3.5 px-4 py-3.5">{content}</div>
      )}
    </li>
  )
}

function Hero({ event, onMenu }: { event: EventView; onMenu?: () => void }) {
  const router = useRouter()
  const url = useImageUrl('event-images', event.image_path)
  const [viewer, setViewer] = useState(false)
  const back = () => (window.history.length > 1 ? router.back() : router.push('/'))

  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setViewer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

  return (
    <div className="relative">
      {event.image_path ? (
        <div className="relative h-[min(66dvh,600px)] overflow-hidden">
          {url ? <img src={url} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-45 blur-3xl" /> : null}
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-bg" />
          <button
            type="button"
            onClick={() => url && setViewer(true)}
            aria-label="Apri la locandina a tutto schermo"
            className="absolute inset-x-6 bottom-4 top-[calc(env(safe-area-inset-top)+60px)] flex items-center justify-center"
          >
            {url ? (
              <img
                src={url}
                alt={`Locandina: ${event.title}`}
                className="max-h-full max-w-full rounded-[18px] object-contain shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              />
            ) : (
              <span className="skeleton block aspect-[4/5] h-full max-h-full rounded-[18px]" />
            )}
          </button>
        </div>
      ) : (
        <div className="@container relative h-[min(34dvh,300px)] overflow-hidden">
          <PosterPlaceholder category={event.category} />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-bg" />
        </div>
      )}

      <div className="pt-safe absolute inset-x-0 top-0">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-3 py-2">
          <IconButton glass label="Indietro" onClick={back}>
            <LuChevronLeft className="size-6" />
          </IconButton>
          {onMenu ? (
            <IconButton glass label="Gestisci evento" onClick={onMenu}>
              <LuEllipsis className="size-5" />
            </IconButton>
          ) : null}
        </div>
      </div>

      {viewer && url ? (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black"
          onClick={() => setViewer(false)}
          role="dialog"
          aria-label="Locandina"
        >
          <img src={url} alt={`Locandina: ${event.title}`} className="max-h-full max-w-full object-contain" />
          <div className="pt-safe absolute right-0 top-0 p-3">
            <IconButton glass label="Chiudi" onClick={() => setViewer(false)}>
              <LuX className="size-5" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 320 || text.split('\n').length > 7
  return (
    <section className="rounded-[24px] bg-elev p-4">
      <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em]">Dettagli</h2>
      <p className={`mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed ${long && !open ? 'line-clamp-6' : ''}`}>
        <Linkify text={text} />
      </p>
      {long ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-[14px] font-semibold underline underline-offset-4">
          {open ? 'Mostra meno' : 'Mostra tutto'}
        </button>
      ) : null}
    </section>
  )
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>()
  const { me, memberMap } = useApp()
  const { data: event, isLoading, error, refresh } = useQuery(['event', id, me.id], () => fetchEvent(me.id, id))
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    if (event && window.location.hash === '#commenti') {
      setTimeout(() => document.getElementById('commenti')?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
  }, [event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <main aria-busy>
        <div className="skeleton h-[52dvh] w-full rounded-none" />
        <div className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
          <div className="skeleton h-8 w-3/4 rounded-xl" />
          <div className="skeleton h-28 w-full rounded-[24px]" />
          <div className="skeleton h-32 w-full rounded-[24px]" />
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main>
        <PageHeader back />
        <EmptyState
          title={error ? 'Non riesco a caricare l’evento' : 'Evento non trovato'}
          action={
            error ? (
              <Button variant="secondary" onClick={() => void refresh()}>
                Riprova
              </Button>
            ) : (
              <Link href="/" className="font-semibold underline underline-offset-4">
                Torna alla bacheca
              </Link>
            )
          }
        >
          {error ? 'Controlla la connessione.' : 'Potrebbe essere stato eliminato da chi l’ha proposto.'}
        </EmptyState>
      </main>
    )
  }

  const canManage = event.created_by === me.id || me.role === 'admin'
  const author = memberMap.get(event.created_by)?.display_name ?? 'Ex membro'
  const placeTitle = event.location_name || event.address

  return (
    <main>
      <Hero event={event} onMenu={canManage ? () => setMenu(true) : undefined} />

      <div className="relative mx-auto max-w-2xl space-y-4 px-4">
        {event.is_cancelled ? (
          <div className="rounded-[18px] bg-no/15 px-4 py-3 text-[14px] font-semibold text-no">
            Questo evento è stato annullato.
          </div>
        ) : null}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag category={event.category} />
            <span className="text-[13px] font-semibold text-muted">{countdown(event)}</span>
          </div>
          <h1 className="mt-3 text-[30px] font-bold leading-[1.08] tracking-[-0.025em]">{event.title}</h1>
          <Link href={`/u/${event.created_by}`} className="mt-3 inline-flex items-center gap-2 text-[14px] text-muted">
            <Avatar id={event.created_by} size={24} />
            <span>
              Proposto da <span className="font-semibold text-fg">{author}</span>, {relativeTime(event.created_at)}
            </span>
          </Link>
        </div>

        <ul className="divide-y divide-line overflow-hidden rounded-[24px] bg-elev">
          <InfoRow icon={LuCalendarDays} title={whenLong(event)} />
          {placeTitle ? (
            <InfoRow
              icon={LuMapPin}
              title={placeTitle}
              subtitle={event.location_name && event.address ? event.address : undefined}
              href={mapsUrl(event)}
              action="Mappa"
            />
          ) : null}
          {event.external_url ? (
            <InfoRow icon={LuLink} title={hostname(event.external_url)} subtitle="Biglietti e informazioni" href={event.external_url} action="Apri" />
          ) : null}
        </ul>

        <RsvpControl event={event} />
        <Attendance event={event} />
        <EventActions event={event} />
        {event.description ? <Description text={event.description} /> : null}

        <div className="pt-4">
          <Comments eventId={event.id} />
        </div>
      </div>

      {canManage ? <OwnerMenu event={event} open={menu} onClose={() => setMenu(false)} /> : null}
    </main>
  )
}
