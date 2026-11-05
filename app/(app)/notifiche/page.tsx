'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LuBell } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { Poster } from '@/components/media'
import { EmptyState, ListSkeleton, PageBody, PageHeader } from '@/components/page-header'
import { PushToggle } from '@/components/pwa'
import { markAllRead } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/format'
import { describeNotification } from '@/lib/notifications'
import { useI18n } from '@/lib/i18n/react'
import { invalidate, useQuery } from '@/lib/query'
import { sb } from '@/lib/supabase/client'
import type { NotificationRow } from '@/lib/types'

async function fetchNotifications(meId: string): Promise<NotificationRow[]> {
  const { data, error } = await sb()
    .from('notifications')
    .select('id, user_id, actor_id, type, event_id, comment_id, data, read_at, created_at, event:events(id, title, image_path, starts_at, category)')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as unknown as NotificationRow[]
}

export default function NotificationsPage() {
  const { me, memberMap } = useApp()
  const { m } = useI18n()
  const { data, isLoading } = useQuery(['notifications', 'list', me.id], () => fetchNotifications(me.id))
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set())
  const marked = useRef(false)

  // Aprendo la pagina le notifiche diventano lette (restano evidenziate finché resti qui)
  useEffect(() => {
    if (!data) return
    const unread = data.filter((n) => !n.read_at).map((n) => n.id)
    if (unread.length === 0) return
    setFreshIds((prev) => new Set([...prev, ...unread]))
    if (marked.current) return
    marked.current = true
    void markAllRead(me.id)
      .then(() => invalidate((k) => k[0] === 'notifications' && k[1] === 'unread'))
      .finally(() => {
        marked.current = false
      })
  }, [data, me.id])

  return (
    <main>
      <PageHeader title={m.nav.activity} />
      <PageBody>
        <div className="rounded-[16px] border border-line bg-elev px-4">
          <PushToggle />
        </div>

        <div className="mt-5">
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : !data || data.length === 0 ? (
            <EmptyState title={m.activity.emptyTitle} icon={<LuBell className="size-8" />}>
              {m.activity.emptyBody}
            </EmptyState>
          ) : (
            <ul className="space-y-1">
              {data.map((n) => {
                const actor = n.actor_id ? memberMap.get(n.actor_id)?.display_name ?? m.common.exMember : m.notifications.someone
                const { action, quote } = describeNotification(n.type, n.data ?? {})
                const href = n.event_id
                  ? `/eventi/${n.event_id}${n.type === 'new_comment' || n.type === 'comment_reply' ? '#commenti' : ''}`
                  : '#'
                const fresh = freshIds.has(n.id)
                return (
                  <li key={n.id}>
                    <Link href={href} className={cn('press -mx-2 flex gap-3 rounded-[20px] p-2.5', fresh ? 'bg-elev' : 'hover:bg-elev')}>
                      <span className="relative shrink-0">
                        <Avatar id={n.actor_id} size={42} />
                        {fresh ? <span className="absolute -left-0.5 -top-0.5 size-3 rounded-full bg-going ring-2 ring-bg" aria-label={m.activity.fresh} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] leading-snug">
                        <span className="font-semibold">{actor}</span> {action}
                        {quote ? <span className="mt-1 line-clamp-2 block text-muted">“{quote}”</span> : null}
                        <span className="mt-1 block text-[12px] text-faint">{relativeTime(n.created_at)}</span>
                      </span>
                      {n.event ? (
                        <Poster event={n.event} className="aspect-[4/5] w-11 shrink-0 self-start rounded-[10px]" />
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PageBody>
    </main>
  )
}
