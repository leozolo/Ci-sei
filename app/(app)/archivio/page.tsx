'use client'

import { useMemo, useState } from 'react'
import { LuArchive } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { EventRow } from '@/components/event/cards'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { fetchPast } from '@/lib/events'
import { capitalize } from '@/lib/format'
import { useQuery } from '@/lib/query'
import type { EventView } from '@/lib/types'

const PAGE = 30
const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })

export default function ArchivePage() {
  const { me } = useApp()
  const [limit, setLimit] = useState(PAGE)
  const { data, isLoading } = useQuery(['events', 'past', limit, me.id], () => fetchPast(me.id, limit), { keepPrevious: true })

  const months = useMemo(() => {
    const groups: { label: string; events: EventView[] }[] = []
    for (const e of data ?? []) {
      const label = capitalize(monthYear.format(new Date(e.starts_at)))
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.events.push(e)
      else groups.push({ label, events: [e] })
    }
    return groups
  }, [data])

  const hasMore = (data?.length ?? 0) >= limit

  return (
    <main>
      <PageHeader back title="Eventi passati" />
      <PageBody>
        {isLoading && !data ? (
          <ListSkeleton rows={4} />
        ) : months.length === 0 ? (
          <EmptyState title="L’archivio è vuoto" icon={<LuArchive className="size-8" />}>
            Gli eventi conclusi finiscono qui, con chi c’era.
          </EmptyState>
        ) : (
          <div className="space-y-7">
            {months.map((m) => (
              <section key={m.label}>
                <h2 className="mb-1 font-list text-[23px] font-extrabold leading-none">{m.label}</h2>
                <div className="space-y-1">
                  {m.events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </section>
            ))}
            {hasMore ? (
              <Button variant="secondary" className="w-full" loading={isLoading} onClick={() => setLimit((l) => l + PAGE)}>
                Carica altri
              </Button>
            ) : null}
          </div>
        )}
      </PageBody>
    </main>
  )
}
