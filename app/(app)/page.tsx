'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LuArchive, LuSearch } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Wordmark } from '@/components/brand'
import { EventRow, PosterCard, Rail, TicketCard } from '@/components/event/cards'
import { FilterBar } from '@/components/filters'
import { EmptyState, ListSkeleton } from '@/components/page-header'
import { InstallHint } from '@/components/pwa'
import { Button, buttonClass } from '@/components/ui/button'
import { toast } from '@/components/ui/feedback'
import { buildSections, fetchUpcoming, groupByDay, happensIn, whenRange, type WhenFilter } from '@/lib/events'
import { dayHeading } from '@/lib/format'
import { useQuery } from '@/lib/query'
import type { EventView } from '@/lib/types'

function DayList({ events }: { events: EventView[] }) {
  const groups = groupByDay(events)
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-4 bg-bg/90 px-4 py-2 text-[14px] font-semibold text-muted backdrop-blur-md">
            {g.date ? dayHeading(g.date) : 'In corso'}
          </h3>
          <div className="mt-1 space-y-1">
            {g.events.map((e) => (
              <EventRow key={e.id} event={e} when={g.date ? 'time' : 'full'} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function summary(name: string, s: ReturnType<typeof buildSections>): string {
  const first = name.split(/\s+/)[0]
  if (s.all.length === 0) return `Ciao ${first}.`
  const weekend = s.weekend.length
  const mineWeekend = s.weekend.filter((e) => e.myStatus === 'going').length
  if (weekend === 0) return `Ciao ${first}. Nel weekend ancora niente in programma.`
  const base = `Ciao ${first}. Questo weekend ${weekend === 1 ? 'c’è 1 evento' : `ci sono ${weekend} eventi`}`
  return mineWeekend ? `${base}, tu partecipi a ${mineWeekend}.` : `${base}.`
}

export default function HomePage() {
  const { me } = useApp()
  const { data: events, isLoading, error, refresh } = useQuery(['events', 'upcoming', me.id], () => fetchUpcoming(me.id))
  const [when, setWhen] = useState<WhenFilter>('all')
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('benvenuto')) {
      toast.success('Sei nel gruppo! Ecco cosa c’è in programma.')
      window.history.replaceState(null, '', '/')
    }
  }, [])

  const sections = useMemo(() => buildSections(events ?? []), [events])
  const filtering = when !== 'all' || category !== null
  const filtered = useMemo(() => {
    if (!filtering) return []
    const range = whenRange(when)
    return sections.all.filter(
      (e) => (!category || e.category === category) && (!range || happensIn(e, range[0], range[1])),
    )
  }, [filtering, sections, when, category])

  const many = sections.all.length >= 4

  return (
    <main>
      <header className="pt-safe sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between pl-4 pr-2">
          <Wordmark className="text-[22px]" />
          <Link href="/cerca" aria-label="Cerca eventi" className="press inline-flex size-10 items-center justify-center rounded-full hover:bg-elev-2">
            <LuSearch className="size-[22px]" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4">
        <InstallHint />
        {events ? <p className="mt-3 text-[15px] text-muted">{summary(me.display_name, sections)}</p> : null}
        <div className="mt-4">
          <FilterBar when={when} onWhen={setWhen} category={category} onCategory={setCategory} />
        </div>
      </div>

      {isLoading ? (
        <div className="mx-auto mt-8 max-w-2xl px-4">
          <div className="no-scrollbar flex gap-3 overflow-hidden" aria-hidden>
            <div className="skeleton aspect-[4/5] w-[68vw] max-w-[264px] shrink-0 rounded-[22px]" />
            <div className="skeleton aspect-[4/5] w-[68vw] max-w-[264px] shrink-0 rounded-[22px]" />
          </div>
          <div className="mt-8">
            <ListSkeleton rows={3} />
          </div>
        </div>
      ) : error && !events ? (
        <EmptyState title="Non riesco a caricare gli eventi" action={<Button variant="secondary" onClick={() => void refresh()}>Riprova</Button>}>
          Controlla la connessione.
        </EmptyState>
      ) : filtering ? (
        <div className="mx-auto mt-5 max-w-2xl px-4">
          {filtered.length ? (
            <DayList events={filtered} />
          ) : (
            <EmptyState
              title="Nessun evento con questi filtri"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setWhen('all')
                    setCategory(null)
                  }}
                >
                  Togli i filtri
                </Button>
              }
            />
          )}
        </div>
      ) : sections.all.length === 0 ? (
        <EmptyState
          title="Nessun evento in programma"
          action={
            <div className="flex flex-col items-center gap-3">
              <Link href="/eventi/nuovo" className={buttonClass('primary', 'lg')}>
                Proponi un evento
              </Link>
              <Link href="/archivio" className="text-[14px] text-muted underline-offset-4 hover:underline">
                Guarda gli eventi passati
              </Link>
            </div>
          }
        >
          Hai visto qualcosa di bello in città? Proponilo al gruppo.
        </EmptyState>
      ) : (
        <>
          {sections.mine.length ? (
            <Rail title="Ci vai" aside={`${sections.mine.length}`}>
              {sections.mine.map((e) => (
                <TicketCard key={e.id} event={e} />
              ))}
            </Rail>
          ) : null}

          {sections.weekend.length ? (
            <Rail title="Questo weekend" aside={`${sections.weekend.length}`}>
              {sections.weekend.map((e) => (
                <PosterCard key={e.id} event={e} />
              ))}
            </Rail>
          ) : null}

          {many && sections.popular.length >= 2 ? (
            <Rail title="I più seguiti">
              {sections.popular.map((e) => (
                <PosterCard key={e.id} event={e} />
              ))}
            </Rail>
          ) : null}

          {many && sections.recent.length ? (
            <Rail title="Proposti da poco">
              {sections.recent.map((e) => (
                <PosterCard key={e.id} event={e} />
              ))}
            </Rail>
          ) : null}

          <section className="mx-auto mt-9 max-w-2xl px-4">
            <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em]">Prossimi eventi</h2>
            <div className="mt-2">
              <DayList events={sections.all} />
            </div>
            <Link
              href="/archivio"
              className="press mt-8 flex items-center justify-center gap-2 rounded-[18px] border border-line py-3 text-[14px] font-semibold text-muted hover:text-fg"
            >
              <LuArchive className="size-4" /> Eventi passati
            </Link>
          </section>
        </>
      )}
    </main>
  )
}
