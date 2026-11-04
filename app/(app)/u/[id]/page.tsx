'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { LuPencil, LuSettings } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { EventRow } from '@/components/event/cards'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { buttonClass } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { fetchCreatedBy, fetchGoingFor, fetchSaved, isUpcoming } from '@/lib/events'
import { capitalize } from '@/lib/format'
import { useQuery } from '@/lib/query'
import type { EventView } from '@/lib/types'

type Tab = 'partecipa' | 'proposti' | 'salvati'

const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })

function SplitList({ events, emptyTitle, emptyText }: { events: EventView[]; emptyTitle: string; emptyText?: string }) {
  const upcoming = events.filter((e) => isUpcoming(e)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = events.filter((e) => !isUpcoming(e)).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  if (events.length === 0) return <EmptyState title={emptyTitle}>{emptyText}</EmptyState>
  return (
    <div className="space-y-6">
      {upcoming.length ? (
        <section>
          <h3 className="mb-1 text-[14px] font-semibold text-muted">In arrivo</h3>
          <div className="space-y-1">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      ) : null}
      {past.length ? (
        <section>
          <h3 className="mb-1 text-[14px] font-semibold text-muted">Passati</h3>
          <div className="space-y-1">
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { me, memberMap, members } = useApp()
  const isMe = id === me.id
  const person = memberMap.get(id)
  const [tab, setTab] = useState<Tab>('partecipa')

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'proposti' || t === 'salvati' || t === 'partecipa') setTab(t)
  }, [])

  const created = useQuery(['events', 'created', id, me.id], () => fetchCreatedBy(me.id, id))
  const going = useQuery(['events', 'going', id, me.id], () => fetchGoingFor(me.id, id))
  const saved = useQuery(isMe ? ['events', 'saved', me.id] : null, () => fetchSaved(me.id))

  const stats = useMemo(
    () => ({
      created: created.data?.length ?? 0,
      going: going.data?.length ?? 0,
      upcoming: (going.data ?? []).filter((e) => isUpcoming(e)).length,
    }),
    [created.data, going.data],
  )

  if (!person && members.length > 1) {
    return (
      <main>
        <PageHeader back />
        <EmptyState title="Profilo non trovato" />
      </main>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'partecipa', label: isMe ? 'Ci vado' : 'Partecipa' },
    { id: 'proposti', label: 'Proposti' },
    ...(isMe ? [{ id: 'salvati' as Tab, label: 'Salvati' }] : []),
  ]

  const current = tab === 'salvati' && !isMe ? 'partecipa' : tab
  const query = current === 'proposti' ? created : current === 'salvati' ? saved : going

  return (
    <main>
      <PageHeader
        back={!isMe}
        title={isMe ? 'Il tuo profilo' : ''}
        actions={
          isMe ? (
            <Link href="/impostazioni" aria-label="Impostazioni" className="press inline-flex size-10 items-center justify-center rounded-full hover:bg-elev-2">
              <LuSettings className="size-[22px]" />
            </Link>
          ) : null
        }
      />
      <PageBody>
        <div className="flex flex-col items-center pt-2 text-center">
          <Avatar id={id} person={person} size={96} />
          <h1 className="mt-4 text-[24px] font-bold tracking-[-0.02em]">{person?.display_name ?? '…'}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {person?.role === 'admin' ? 'Amministratore, ' : ''}
            {person ? `nel gruppo da ${monthYear.format(new Date(person.created_at))}` : ''}
          </p>
          {isMe ? (
            <Link href="/profilo/modifica" className={cn(buttonClass('secondary', 'sm'), 'mt-4')}>
              <LuPencil className="size-4" /> Modifica profilo
            </Link>
          ) : null}
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { n: stats.created, l: stats.created === 1 ? 'evento proposto' : 'eventi proposti' },
            { n: stats.going, l: stats.going === 1 ? 'partecipazione' : 'partecipazioni' },
            { n: stats.upcoming, l: 'in arrivo' },
          ].map((s) => (
            <div key={s.l} className="rounded-[18px] bg-elev px-2 py-3">
              <dd className="font-display text-[22px] font-semibold tabular-nums">{s.n}</dd>
              <dt className="mt-0.5 text-[12px] text-muted">{capitalize(s.l)}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex gap-1 rounded-full bg-elev p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={current === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'press h-9 flex-1 rounded-full text-[14px] font-semibold',
                current === t.id ? 'bg-invert text-invert-fg' : 'text-muted hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {query.isLoading ? (
            <ListSkeleton rows={3} />
          ) : current === 'proposti' ? (
            <SplitList events={created.data ?? []} emptyTitle={isMe ? 'Non hai ancora proposto eventi' : 'Nessun evento proposto'} />
          ) : current === 'salvati' ? (
            <SplitList
              events={saved.data ?? []}
              emptyTitle="Nessun evento salvato"
              emptyText="Tocca «Salva» su un evento per ritrovarlo qui."
            />
          ) : (
            <SplitList events={going.data ?? []} emptyTitle={isMe ? 'Non hai ancora confermato eventi' : 'Nessuna partecipazione'} />
          )}
        </div>
      </PageBody>
    </main>
  )
}
