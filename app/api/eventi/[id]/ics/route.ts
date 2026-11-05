import { asciiSlug, buildIcs } from '@/lib/calendar'
import { APP_NAME } from '@/lib/config'
import { messagesFor } from '@/lib/i18n/core'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/locales'
import { getMember } from '@/lib/supabase/server'
import type { EventRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** File .ics per aggiungere l'evento al calendario del telefono. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lang = new URL(request.url).searchParams.get('lang')
  const t = messagesFor(isLocale(lang) ? lang : DEFAULT_LOCALE).ics
  const member = await getMember()
  if (!member) return new Response(t.membersOnly, { status: 401 })
  const { data } = await member.supabase
    .from('events')
    .select('id, title, description, starts_at, ends_at, location_name, address')
    .eq('id', id)
    .maybeSingle()
  const event = data as Pick<EventRow, 'id' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'location_name' | 'address'> | null
  if (!event) return new Response(t.notFound, { status: 404 })
  const link = `${new URL(request.url).origin}/eventi/${event.id}`
  return new Response(buildIcs(event, link, APP_NAME), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${asciiSlug(event.title)}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
