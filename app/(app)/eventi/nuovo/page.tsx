'use client'

import { useEffect, useState } from 'react'
import { EventForm } from '@/components/event/event-form'
import { PageBody, PageHeader } from '@/components/page-header'
import { useI18n } from '@/lib/i18n/react'

export default function NewEventPage() {
  const { m } = useI18n()
  const [ready, setReady] = useState(false)
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined)

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('data')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDefaultDate(d)
    setReady(true)
  }, [])

  return (
    <main>
      <PageHeader back title={m.nav.propose} />
      <PageBody className="pt-2">{ready ? <EventForm defaultDate={defaultDate} /> : null}</PageBody>
    </main>
  )
}
