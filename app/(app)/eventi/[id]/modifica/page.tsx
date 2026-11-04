'use client'

import { useParams } from 'next/navigation'
import { useApp } from '@/components/app-context'
import { EventForm } from '@/components/event/event-form'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { fetchEvent } from '@/lib/events'
import { useQuery } from '@/lib/query'

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>()
  const { me } = useApp()
  const { data: event, isLoading } = useQuery(['event', id, me.id], () => fetchEvent(me.id, id))
  const allowed = !!event && (event.created_by === me.id || me.role === 'admin')

  return (
    <main>
      <PageHeader back={`/eventi/${id}`} title="Modifica evento" />
      <PageBody className="pt-2">
        {isLoading ? (
          <ListSkeleton rows={2} />
        ) : !event ? (
          <EmptyState title="Evento non trovato" />
        ) : !allowed ? (
          <EmptyState title="Non puoi modificare questo evento">Solo chi l&apos;ha proposto o un amministratore può farlo.</EmptyState>
        ) : (
          // key: ricrea il modulo se l'evento cambia mentre lo guardi
          <EventForm key={event.updated_at} event={event} />
        )}
      </PageBody>
    </main>
  )
}
