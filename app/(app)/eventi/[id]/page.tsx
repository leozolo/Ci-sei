'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { LuCalendarDays, LuChevronDown, LuChevronLeft, LuEllipsis, LuExternalLink, LuLink, LuMapPin, LuX } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { GuestList } from '@/components/event/attendance'
import { attendanceText, CategoryTag, ListCount } from '@/components/event/cards'
import { Comments, Linkify } from '@/components/event/comments'
import { EventActions, OwnerMenu } from '@/components/event/event-actions'
import { RsvpBar, useRsvp } from '@/components/event/rsvp'
import { Poster, useImageUrl } from '@/components/media'
import { EmptyState, PageHeader } from '@/components/page-header'
import { Button, IconButton } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { cityLabel } from '@/lib/city'
import { fetchEvent } from '@/lib/events'
import { addDays, isSameDay, relativeTime, startOfDay, whenLong } from '@/lib/format'
import { fmt, msgs, plural } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { useQuery } from '@/lib/query'
import { hostname, mapsUrl } from '@/lib/share'
import type { EventView, RsvpStatus } from '@/lib/types'

function countdown(e: EventView, now = new Date()): string {
  const start = new Date(e.starts_at)
  const end = new Date(e.effective_end)
  const t = msgs()
  if (end < now) return t.event.ended
  if (start <= now) return t.event.ongoing
  if (isSameDay(start, now)) return start.getHours() >= 18 ? t.dates.tonight : t.dates.today
  if (isSameDay(start, addDays(now, 1))) return t.dates.tomorrow
  const days = Math.round((startOfDay(start).getTime() - startOfDay(now).getTime()) / 86_400_000)
  return plural(t.event.inDays, days)
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
        {subtitle ? <span className="mt-0.5 block text-[13px] text-muted">{subtitle}</span> : null}
      </span>
      {action ? (
        <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-semibold">
          {action}
          <LuExternalLink className="size-3.5" />
        </span>
      ) : null}
    </>
  )
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="press flex gap-3.5 py-3.5">
          {content}
        </a>
      ) : (
        <div className="flex gap-3.5 py-3.5">{content}</div>
      )}
    </li>
  )
}

function TopBar({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter()
  const { m } = useI18n()
  const back = () => (window.history.length > 1 ? router.back() : router.push('/'))
  return (
    <div className="pt-safe">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-3 py-2">
        <IconButton label={m.common.back} onClick={back}>
          <LuChevronLeft className="size-6" />
        </IconButton>
        {onMenu ? (
          <IconButton label={m.owner.title} onClick={onMenu}>
            <LuEllipsis className="size-5" />
          </IconButton>
        ) : null}
      </div>
    </div>
  )
}

/** La locandina intera, sotto la lista; si apre a tutto schermo. */
function PosterBlock({ event }: { event: EventView }) {
  const { m } = useI18n()
  const url = useImageUrl('event-images', event.image_path)
  const [viewer, setViewer] = useState(false)

  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setViewer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

  return (
    <div>
      {event.image_path ? (
        <button
          type="button"
          onClick={() => url && setViewer(true)}
          aria-label={m.event.openPoster}
          className="press mx-auto block w-full max-w-[420px]"
        >
          {url ? (
            <img
              src={url}
              alt={fmt(m.event.posterAlt, { title: event.title })}
              className="mx-auto max-h-[64dvh] w-auto max-w-full rounded-[12px] object-contain shadow-[0_18px_44px_var(--c-shadow)]"
            />
          ) : (
            <span className="skeleton mx-auto block aspect-[4/5] w-full rounded-[12px]" />
          )}
        </button>
      ) : (
        <Poster event={event} className="mx-auto aspect-[4/5] w-full max-w-[300px] rounded-[12px] shadow-[0_18px_44px_var(--c-shadow)]" eager />
      )}

      {viewer && url ? (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black"
          onClick={() => setViewer(false)}
          role="dialog"
          aria-label={m.form.poster}
        >
          <img src={url} alt={fmt(m.event.posterAlt, { title: event.title })} className="max-h-full max-w-full object-contain" />
          <div className="pt-safe absolute right-0 top-0 p-3">
            <IconButton overlay label={m.common.close} onClick={() => setViewer(false)}>
              <LuX className="size-5" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Description({ text }: { text: string }) {
  const { m } = useI18n()
  const [open, setOpen] = useState(false)
  const long = text.length > 320 || text.split('\n').length > 7
  return (
    <section aria-labelledby="dettagli">
      <h2 id="dettagli" className="font-list text-[23px] font-extrabold leading-none">
        {m.event.details}
      </h2>
      <p className={cn('mt-3 max-w-[65ch] whitespace-pre-wrap break-words text-[15px] leading-relaxed', long && !open && 'line-clamp-6')}>
        <Linkify text={text} />
      </p>
      {long ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-[14px] font-semibold underline underline-offset-4">
          {open ? m.event.showLess : m.event.showMore}
        </button>
      ) : null}
    </section>
  )
}

function EventScreen({ event }: { event: EventView }) {
  const { me, memberMap } = useApp()
  const { m } = useI18n()
  const [menu, setMenu] = useState(false)
  const { save, saving } = useRsvp(event)
  const [drawMine, setDrawMine] = useState(false)
  const previous = useRef<RsvpStatus | null>(event.myStatus)

  // la spunta si disegna solo quando ti metti in lista adesso
  useEffect(() => {
    if (event.myStatus === 'going' && previous.current !== 'going') setDrawMine(true)
    if (event.myStatus !== 'going') setDrawMine(false)
    previous.current = event.myStatus
  }, [event.myStatus])

  useEffect(() => {
    if (window.location.hash === '#commenti') {
      setTimeout(() => document.getElementById('commenti')?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
  }, [])

  const canManage = event.created_by === me.id || me.role === 'admin'
  const author = memberMap.get(event.created_by)?.display_name ?? m.common.exMember
  const placeTitle = event.location_name || event.address
  const past = new Date(event.effective_end) < new Date()
  const street = event.location_name && event.address ? event.address : null
  const cityShown = event.city && !(event.address ?? '').toLocaleLowerCase('it').includes(event.city.toLocaleLowerCase('it')) ? event.city : null
  const placeSubtitle = [street, cityShown ? cityLabel(cityShown) : null].filter(Boolean).join(', ')

  const toList = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('lista')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  // Ordine della porta: il titolo, chi c'è, quando e dove, poi la locandina intera.
  return (
    <main>
      <TopBar onMenu={canManage ? () => setMenu(true) : undefined} />

      <div className="mx-auto max-w-2xl space-y-8 px-4 pt-1">
        <div>
          <h1
            className={cn(
              'font-poster text-[40px] font-extrabold uppercase leading-[0.92] text-balance [overflow-wrap:anywhere]',
              event.is_cancelled && 'text-muted line-through decoration-no decoration-[3px]',
            )}
          >
            {event.title}
          </h1>
          {event.is_cancelled ? (
            <p className="mt-4 rounded-[12px] bg-no/10 px-4 py-3 text-[14px] font-semibold text-no">{m.event.cancelledNotice}</p>
          ) : (
            <button
              type="button"
              onClick={toList}
              className="press mt-3.5 flex max-w-full items-center gap-1.5 text-left"
              aria-label={fmt(m.event.goToList, { attendance: attendanceText(event) })}
            >
              <ListCount event={event} enterId={drawMine ? me.id : undefined} />
              <LuChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
            </button>
          )}

          <ul className="mt-4 divide-y divide-line border-y border-line">
            <InfoRow icon={LuCalendarDays} title={whenLong(event)} subtitle={countdown(event)} />
            {placeTitle ? (
              <InfoRow icon={LuMapPin} title={placeTitle} subtitle={placeSubtitle || undefined} href={mapsUrl(event)} action={m.event.map} />
            ) : null}
            {event.external_url ? (
              <InfoRow icon={LuLink} title={hostname(event.external_url)} subtitle={m.event.tickets} href={event.external_url} action={m.nav.open} />
            ) : null}
          </ul>

          <div className="mt-6">
            <PosterBlock event={event} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <CategoryTag category={event.category} />
            <Link href={`/u/${event.created_by}`} className="inline-flex items-center gap-2 text-[13px] text-muted">
              <Avatar id={event.created_by} size={22} />
              <span>
                {m.event.proposedBy} <span className="font-semibold text-fg">{author}</span>, {relativeTime(event.created_at)}
              </span>
            </Link>
          </div>
        </div>

        <GuestList event={event} drawMine={drawMine} onGuests={(g) => void save('going', g)} saving={saving} />
        <EventActions event={event} />
        {event.description ? <Description text={event.description} /> : null}
        <Comments eventId={event.id} />
      </div>

      {!past && !event.is_cancelled ? <RsvpBar event={event} onChange={(s, g) => void save(s, g)} /> : null}
      {canManage ? <OwnerMenu event={event} open={menu} onClose={() => setMenu(false)} /> : null}
    </main>
  )
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>()
  const { me } = useApp()
  const { m } = useI18n()
  const { data: event, isLoading, error, refresh } = useQuery(['event', id, me.id], () => fetchEvent(me.id, id))

  if (isLoading) {
    return (
      <main aria-busy>
        <div className="pt-safe h-14" />
        <div className="mx-auto max-w-2xl space-y-4 px-4 pt-1">
          <div className="skeleton h-10 w-3/4 rounded-[8px]" />
          <div className="skeleton h-7 w-44 rounded-full" />
          <div className="skeleton h-36 w-full rounded-[12px]" />
          <div className="skeleton mx-auto aspect-[4/5] w-full max-w-[360px] rounded-[12px]" />
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main>
        <PageHeader back />
        <EmptyState
          title={error ? m.event.loadError : m.event.notFound}
          action={
            error ? (
              <Button variant="secondary" onClick={() => void refresh()}>
                {m.common.retry}
              </Button>
            ) : (
              <Link href="/" className="font-semibold underline underline-offset-4">
                {m.event.backToBoard}
              </Link>
            )
          }
        >
          {error ? m.board.checkConnection : m.event.notFoundBody}
        </EmptyState>
      </main>
    )
  }

  return <EventScreen event={event} />
}
