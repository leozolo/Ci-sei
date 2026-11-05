'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { EventRow } from '@/components/event/cards'
import { Chip } from '@/components/filters'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { inputClass } from '@/components/ui/field'
import { CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { fetchPast, fetchUpcoming, matchesSearch } from '@/lib/events'
import { useQuery } from '@/lib/query'

export default function SearchPage() {
  const { me } = useApp()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [includePast, setIncludePast] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  const upcoming = useQuery(['events', 'upcoming', me.id], () => fetchUpcoming(me.id))
  const past = useQuery(includePast ? ['events', 'past', 500, me.id] : null, () => fetchPast(me.id, 500))

  const active = q.trim().length > 0 || category !== null
  const results = useMemo(() => {
    if (!active) return []
    const pool = [...(upcoming.data ?? []), ...(includePast ? (past.data ?? []) : [])]
    return pool.filter((e) => (!category || e.category === category) && matchesSearch(e, q))
  }, [active, upcoming.data, past.data, includePast, category, q])

  const loading = upcoming.isLoading || (includePast && past.isLoading)

  return (
    <main>
      <PageHeader back title="Cerca" />
      <PageBody>
        <div className="relative">
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
          <input
            ref={input}
            type="search"
            enterKeyHint="search"
            placeholder="Titolo, locale, zona, artista…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cerca eventi"
            className={cn(inputClass, 'h-12 pl-12 pr-11')}
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ('')
                input.current?.focus()
              }}
              aria-label="Cancella ricerca"
              className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-elev-3"
            >
              <LuX className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="no-scrollbar relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:flex-wrap sm:overflow-visible">
          <Chip active={includePast} onClick={() => setIncludePast((v) => !v)}>
            Anche passati
          </Chip>
          <span className="my-1.5 w-px shrink-0 bg-line-strong" aria-hidden />
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
              <c.icon className="size-4" strokeWidth={1.9} aria-hidden />
              {c.label}
            </Chip>
          ))}
        </div>

        <div className="mt-5">
          {!active ? (
            <p className="py-10 text-center text-[14px] text-muted">Scrivi qualcosa o scegli una categoria.</p>
          ) : loading && results.length === 0 ? (
            <ListSkeleton rows={3} />
          ) : results.length ? (
            <>
              <p className="mb-2 text-[13px] text-muted">
                {results.length} {results.length === 1 ? 'risultato' : 'risultati'}
              </p>
              <div className="space-y-1">
                {results.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="Nessun evento trovato">
              {includePast ? 'Prova con parole diverse.' : 'Prova con parole diverse o includi gli eventi passati.'}
            </EmptyState>
          )}
        </div>
      </PageBody>
    </main>
  )
}
