'use client'

import { useMemo, useState } from 'react'
import { LuArchive } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { EventRow } from '@/components/event/cards'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { fetchPast } from '@/lib/events'
import { monthTitle } from '@/lib/format'
import { useI18n } from '@/lib/i18n/react'
import { useQuery } from '@/lib/query'
import type { EventView } from '@/lib/types'

const PAGE = 30

export default function ArchivePage() {
  const { me } = useApp()
  const { m, locale } = useI18n()
  const [limit, setLimit] = useState(PAGE)
  const { data, isLoading } = useQuery(['events', 'past', limit, me.id], () => fetchPast(me.id, limit), { keepPrevious: true })

  const months = useMemo(() => {
    const groups: { label: string; events: EventView[] }[] = []
    for (const e of data ?? []) {
      const label = monthTitle(new Date(e.starts_at))
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.events.push(e)
      else groups.push({ label, events: [e] })
    }
    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i mesi cambiano con la lingua
  }, [data, locale])

  const hasMore = (data?.length ?? 0) >= limit

  return (
    <main>
      <PageHeader back title={m.board.pastEvents} />
      <PageBody>
        {isLoading && !data ? (
          <ListSkeleton rows={4} />
        ) : months.length === 0 ? (
          <EmptyState title={m.archive.emptyTitle} icon={<LuArchive className="size-8" />}>
            {m.archive.emptyBody}
          </EmptyState>
        ) : (
          <div className="space-y-7">
            {months.map((month) => (
              <section key={month.label}>
                <h2 className="mb-1 font-list text-[23px] font-extrabold leading-none">{month.label}</h2>
                <div className="space-y-1">
                  {month.events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </section>
            ))}
            {hasMore ? (
              <Button variant="secondary" className="w-full" loading={isLoading} onClick={() => setLimit((l) => l + PAGE)}>
                {m.archive.loadMore}
              </Button>
            ) : null}
          </div>
        )}
      </PageBody>
    </main>
  )
}
