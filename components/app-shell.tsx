'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { LuBell, LuCalendarDays, LuHouse, LuPlus } from 'react-icons/lu'
import { AppContext, useApp, type AppContextValue } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { Mark, Wordmark } from '@/components/brand'
import { TICK_PATH } from '@/components/marker'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'
import { IS_CONFIGURED } from '@/lib/config'
import { describeNotification } from '@/lib/notifications'
import { clearCache, invalidate, isEventKey, useQuery } from '@/lib/query'
import { sb } from '@/lib/supabase/client'
import type { Member, NotificationRow, Profile } from '@/lib/types'

type MeState =
  | { kind: 'anon' }
  | { kind: 'outsider' }
  | { kind: 'member'; profile: Profile; email: string | null }

async function loadMe(): Promise<MeState> {
  const {
    data: { session },
  } = await sb().auth.getSession()
  if (!session) return { kind: 'anon' }
  const { data, error } = await sb().from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  if (error) throw error
  const profile = data as Profile | null
  if (!profile || profile.status !== 'active') return { kind: 'outsider' }
  return { kind: 'member', profile, email: session.user.email ?? null }
}

async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await sb()
    .from('profiles')
    .select('id, display_name, avatar_url, role, status, created_at')
    .order('display_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Member[]
}

async function fetchUnread(meId: string): Promise<number> {
  const { count, error } = await sb()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', meId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

/** Racchiude tutte le schermate riservate ai membri del gruppo. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: state, error, refresh } = useQuery(IS_CONFIGURED ? ['me'] : null, loadMe, { staleMs: 30_000 })

  useEffect(() => {
    if (!state) return
    if (state.kind === 'anon') {
      const here = window.location.pathname + window.location.search
      router.replace(here && here !== '/' ? `/login?next=${encodeURIComponent(here)}` : '/login')
    } else if (state.kind === 'outsider') {
      router.replace('/benvenuto')
    }
  }, [state, router])

  useEffect(() => {
    if (!IS_CONFIGURED) return
    const { data } = sb().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCache()
        router.replace('/login')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [router])

  if (!IS_CONFIGURED) return <SetupNeeded />
  if (state?.kind === 'member') {
    return (
      <MemberApp me={state.profile} email={state.email} refreshMe={refresh}>
        {children}
      </MemberApp>
    )
  }
  return <Splash failed={!state && !!error} onRetry={refresh} />
}

function MemberApp({
  me,
  email,
  refreshMe,
  children,
}: {
  me: Profile
  email: string | null
  refreshMe: () => Promise<void>
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: members } = useQuery(['members'], fetchMembers, { staleMs: 60_000 })
  const { data: unread } = useQuery(['notifications', 'unread', me.id], () => fetchUnread(me.id))

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>((members ?? []).map((m) => [m.id, m]))
    map.set(me.id, me)
    return map
  }, [members, me])

  const live = useRef({ memberMap, pathname })
  live.current = { memberMap, pathname }

  // Aggiornamenti in tempo reale da tutti i telefoni del gruppo
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const later = (key: string, fn: () => void, ms = 300) => {
      clearTimeout(timers.get(key))
      timers.set(key, setTimeout(fn, ms))
    }
    const refreshEvents = () => later('events', () => invalidate(isEventKey))
    const channel = sb()
      .channel(`live-${me.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refreshEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, refreshEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_likes' }, refreshEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        refreshEvents()
        later('comments', () => invalidate((k) => k[0] === 'comments'))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        later('members', () => invalidate((k) => k[0] === 'members' || k[0] === 'me')),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` },
        (payload: { new: NotificationRow }) => {
          later('notifications', () => invalidate((k) => k[0] === 'notifications'))
          const n = payload.new
          if (!n || (n.event_id && live.current.pathname === `/eventi/${n.event_id}`)) return
          const actor = (n.actor_id && live.current.memberMap.get(n.actor_id)?.display_name) || 'Qualcuno'
          const { action } = describeNotification(n.type, n.data ?? {})
          toast(`${actor} ${action}`, n.event_id ? { label: 'Apri', onClick: () => router.push(`/eventi/${n.event_id}`) } : undefined)
        },
      )
      .subscribe()
    return () => {
      timers.forEach((t) => clearTimeout(t))
      void sb().removeChannel(channel)
    }
  }, [me.id, router])

  // Numero sul badge dell'icona dell'app (dove supportato)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (unread) void nav.setAppBadge?.(unread).catch(() => undefined)
    else void nav.clearAppBadge?.().catch(() => undefined)
  }, [unread])

  const value = useMemo<AppContextValue>(
    () => ({ me, email, members: members ?? [me], memberMap, unread: unread ?? 0, refreshMe }),
    [me, email, members, memberMap, unread, refreshMe],
  )

  // la pagina di un evento ha la sua barra in basso (Mettimi in lista)
  const eventDetail = /^\/eventi\/[0-9a-f-]{36}$/i.test(pathname)

  return (
    <AppContext.Provider value={value}>
      <div className={cn('min-h-dvh', eventDetail ? 'pb-[calc(env(safe-area-inset-bottom)+6rem)]' : 'pb-[calc(env(safe-area-inset-bottom)+5.5rem)]')}>
        {children}
      </div>
      {eventDetail ? null : <BottomNav />}
    </AppContext.Provider>
  )
}

function BottomNav() {
  const pathname = usePathname()
  const { me, unread } = useApp()
  const profileActive = pathname.startsWith(`/u/${me.id}`) || pathname.startsWith('/profilo') || pathname.startsWith('/impostazioni')
  const items = [
    { href: '/', label: 'Bacheca', icon: LuHouse, active: pathname === '/' || pathname === '/cerca' },
    { href: '/calendario', label: 'Calendario', icon: LuCalendarDays, active: pathname.startsWith('/calendario') },
  ]
  const itemsRight = [{ href: '/notifiche', label: 'Attività', icon: LuBell, active: pathname.startsWith('/notifiche') }]

  const linkClass = (active: boolean) =>
    cn(
      'press relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold',
      active ? 'text-fg' : 'text-faint hover:text-muted',
    )

  const activeMark = <span className="absolute top-0 h-[3px] w-6 rounded-b-full bg-going" aria-hidden />

  return (
    <nav aria-label="Navigazione principale" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} className={linkClass(active)} aria-current={active ? 'page' : undefined}>
            {active ? activeMark : null}
            <Icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
        <div className="flex items-center justify-center">
          <Link
            href="/eventi/nuovo"
            aria-label="Proponi un evento"
            className="press flex size-12 items-center justify-center rounded-[14px] bg-fg text-bg shadow-[0_6px_18px_var(--c-shadow)]"
          >
            <LuPlus className="size-6" strokeWidth={2.6} />
          </Link>
        </div>
        {itemsRight.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} className={linkClass(active)} aria-current={active ? 'page' : undefined}>
            {active ? activeMark : null}
            <span className="relative">
              <Icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
              {unread > 0 ? (
                <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-going px-1 text-center font-list text-[12px] font-extrabold leading-[18px] text-going-ink ring-2 ring-bg">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </span>
            {label}
          </Link>
        ))}
        <Link href={`/u/${me.id}`} className={linkClass(profileActive)} aria-current={profileActive ? 'page' : undefined}>
          {profileActive ? activeMark : null}
          <span className={cn('rounded-full ring-2', profileActive ? 'ring-fg' : 'ring-transparent')}>
            <Avatar person={me} size={24} className="block" />
          </span>
          Profilo
        </Link>
      </div>
    </nav>
  )
}

export function Splash({ failed, onRetry }: { failed?: boolean; onRetry?: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-8 text-center">
      <svg viewBox="0 0 24 24" fill="none" className={cn('size-16 text-going', !failed && 'marker-draw')} aria-hidden>
        <path d={TICK_PATH} pathLength={1} stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <Wordmark className="text-[27px]" />
      {failed ? (
        <div>
          <p className="text-[15px] text-muted">Non riesco a collegarmi. Controlla la connessione.</p>
          <Button className="mt-4" variant="secondary" onClick={onRetry}>
            Riprova
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function SetupNeeded() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <Mark size={56} />
      <h1 className="font-list text-[27px] font-extrabold">Manca un passaggio</h1>
      <p className="text-[15px] text-muted">
        L&apos;app non è ancora collegata al database. Inserisci le variabili <code>NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> nelle impostazioni del progetto su Vercel, poi pubblica di nuovo.
      </p>
    </div>
  )
}
