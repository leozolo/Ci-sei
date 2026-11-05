'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LuArchive, LuSearch } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Wordmark } from '@/components/brand'
import { DoorCard, EventRow, InListRow, Rail, RankRow, SectionTitle } from '@/components/event/cards'
import { CityChips, FilterBar } from '@/components/filters'
import { EmptyState, ListSkeleton } from '@/components/page-header'
import { InstallHint } from '@/components/pwa'
import { Button, buttonClass } from '@/components/ui/button'
import { toast } from '@/components/ui/feedback'
import { ALL_CITIES, useCityFilter } from '@/lib/city'
import { buildSections, fetchUpcoming, groupByDay, happensIn, whenRange, type WhenFilter } from '@/lib/events'
import { dayHeading } from '@/lib/format'
import { useQuery } from '@/lib/query'
import type { EventView } from '@/lib/types'

function DayList({ events, showCity }: { events: EventView[]; showCity?: boolean }) {
  const groups = groupByDay(events)
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.date ? dayHeading(g.date) : 'In corso'}>
          <h3 className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-4 border-b border-line bg-bg px-4 py-2 font-list text-[14px] font-bold uppercase tracking-[0.05em] text-muted">
            {g.date ? dayHeading(g.date) : 'In corso'}
          </h3>
          <div className="mt-1">
            {g.events.map((e) => (
              <EventRow key={e.id} event={e} when={g.date ? 'time' : 'full'} showCity={showCity} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function summary(name: string, s: ReturnType<typeof buildSections>, city: string): string {
  const first = name.split(/\s+/)[0]
  const where = city === ALL_CITIES ? '' : ` a ${city}`
  if (s.all.length === 0) return `Ciao ${first}.`
  const weekend = s.weekend.length
  const mine = s.weekend.filter((e) => e.myStatus === 'going').length
  if (weekend === 0) return `Ciao ${first}. Questo weekend${where} non c’è ancora niente: proponi qualcosa.`
  const base = `Ciao ${first}. Questo weekend${where}: ${weekend === 1 ? '1 serata' : `${weekend} serate`}`
  return mine ? `${base}, sei in lista per ${mine}.` : `${base}.`
}

export default function HomePage() {
  const { me } = useApp()
  const { data: events, isLoading, error, refresh } = useQuery(['events', 'upcoming', me.id], () => fetchUpcoming(me.id))
  const { city, cities, setCity, matches, multi } = useCityFilter(events)
  const [when, setWhen] = useState<WhenFilter>('all')
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('benvenuto')) {
      toast.success('Sei nel club! Ecco cosa c’è in programma.')
      window.history.replaceState(null, '', '/')
    }
  }, [])

  const scoped = useMemo(() => (events ?? []).filter(matches), [events, matches])
  const sections = useMemo(() => buildSections(scoped), [scoped])
  const filtering = when !== 'all' || category !== null
  const program = useMemo(() => {
    const range = whenRange(when)
    return sections.all.filter((e) => (!category || e.category === category) && (!range || happensIn(e, range[0], range[1])))
  }, [sections, when, category])

  const many = sections.all.length >= 4
  const showCity = multi && city === ALL_CITIES

  return (
    <main>
      <header className="pt-safe sticky top-0 z-30 bg-bg">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between pl-4 pr-2">
          <Wordmark className="text-[23px]" />
          <Link
            href="/cerca"
            aria-label="Cerca eventi"
            className="press inline-flex size-10 items-center justify-center rounded-full hover:bg-elev"
          >
            <LuSearch className="size-[22px]" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-3 px-4">
        <InstallHint />
        <CityChips cities={cities} city={city} onCity={setCity} />
        {events ? <p className="pt-1 text-[15px] leading-snug text-muted">{summary(me.display_name, sections, city)}</p> : null}
      </div>

      {isLoading ? (
        <div className="mx-auto mt-8 max-w-2xl px-4" aria-busy>
          <div className="no-scrollbar flex gap-4 overflow-hidden" aria-hidden>
            <div className="skeleton aspect-[4/5] w-[72vw] max-w-[284px] shrink-0 rounded-[10px]" />
            <div className="skeleton aspect-[4/5] w-[72vw] max-w-[284px] shrink-0 rounded-[10px]" />
          </div>
          <div className="mt-8">
            <ListSkeleton rows={3} />
          </div>
        </div>
      ) : error && !events ? (
        <EmptyState
          title="Non riesco a caricare gli eventi"
          action={
            <Button variant="secondary" onClick={() => void refresh()}>
              Riprova
            </Button>
          }
        >
          Controlla la connessione.
        </EmptyState>
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
            <section className="mx-auto mt-8 max-w-2xl px-4" aria-labelledby="sei-in-lista">
              <SectionTitle aside={sections.mine.length}>
                <span id="sei-in-lista">Sei in lista</span>
              </SectionTitle>
              <div className="mt-2 divide-y divide-line border-y border-line">
                {sections.mine.map((e) => (
                  <InListRow key={e.id} event={e} showCity={showCity} />
                ))}
              </div>
            </section>
          ) : null}

          {sections.weekend.length ? (
            <Rail title="Questo weekend" aside={sections.weekend.length}>
              {sections.weekend.map((e) => (
                <DoorCard key={e.id} event={e} showCity={showCity} />
              ))}
            </Rail>
          ) : null}

          {many && sections.popular.length >= 2 ? (
            <section className="mx-auto mt-10 max-w-2xl px-4" aria-labelledby="dove-vanno-tutti">
              <SectionTitle aside="per lunghezza della lista">
                <span id="dove-vanno-tutti">Dove vanno tutti</span>
              </SectionTitle>
              <div className="mt-2 divide-y divide-line border-y border-line">
                {sections.popular.slice(0, 5).map((e) => (
                  <RankRow key={e.id} event={e} showCity={showCity} />
                ))}
              </div>
            </section>
          ) : null}

          {many && sections.recent.length ? (
            <Rail title="Appena proposti" aside={sections.recent.length}>
              {sections.recent.map((e) => (
                <DoorCard key={e.id} event={e} showCity={showCity} />
              ))}
            </Rail>
          ) : null}

          <section className="mx-auto mt-10 max-w-2xl px-4" aria-labelledby="in-programma">
            <SectionTitle aside={filtering ? `${program.length} su ${sections.all.length}` : sections.all.length}>
              <span id="in-programma">In programma</span>
            </SectionTitle>
            <div className="mt-4">
              <FilterBar when={when} onWhen={setWhen} category={category} onCategory={setCategory} />
            </div>
            <div className="mt-3">
              {program.length ? (
                <DayList events={program} showCity={showCity} />
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
            <Link
              href="/archivio"
              className="press mt-8 flex items-center justify-center gap-2 rounded-[12px] border border-line py-3 text-[14px] font-semibold text-muted hover:text-fg"
            >
              <LuArchive className="size-4" /> Eventi passati
            </Link>
          </section>
        </>
      )}
    </main>
  )
}
