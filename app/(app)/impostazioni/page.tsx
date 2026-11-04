'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { LuArchive, LuChevronRight, LuLogOut, LuShieldCheck, LuUsers } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { PageBody, PageHeader } from '@/components/page-header'
import { InstallHint, PushToggle } from '@/components/pwa'
import { Switch } from '@/components/ui/field'
import { confirmDialog, toast } from '@/components/ui/feedback'
import { errorMessage, updateNotifyPrefs } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/config'
import { clearCache } from '@/lib/query'
import { sb } from '@/lib/supabase/client'
import { applyTheme, readThemePref, type ThemePref } from '@/lib/theme'
import type { NotifyPrefKey } from '@/lib/types'

const PREFS: { key: NotifyPrefKey; label: string; description: string }[] = [
  { key: 'new_event', label: 'Nuovi eventi', description: 'Quando qualcuno propone un evento.' },
  { key: 'comments', label: 'Messaggi', description: 'Messaggi sugli eventi che segui e risposte ai tuoi.' },
  { key: 'event_updates', label: 'Cambi di programma', description: 'Data, ora o luogo cambiati, eventi annullati.' },
  { key: 'friend_going', label: 'Amici che partecipano', description: 'Quando qualcuno si aggiunge a un evento a cui vai.' },
]

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{title}</h2>
      <div className="rounded-[20px] bg-elev px-4">{children}</div>
    </section>
  )
}

function LinkRow({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 border-b border-line py-3.5 last:border-0">
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{children}</span>
      <LuChevronRight className="size-5 text-faint" />
    </Link>
  )
}

export default function SettingsPage() {
  const { me, email, refreshMe } = useApp()
  const router = useRouter()
  const [prefs, setPrefs] = useState(me.notify_prefs ?? {})
  const [theme, setTheme] = useState<ThemePref>('dark')

  useEffect(() => setTheme(readThemePref()), [])

  const togglePref = async (key: NotifyPrefKey, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      await updateNotifyPrefs(me.id, next)
      void refreshMe()
    } catch (err) {
      setPrefs(prefs)
      toast.error(errorMessage(err))
    }
  }

  const logout = async () => {
    const ok = await confirmDialog({ title: 'Uscire dall’account?', confirmLabel: 'Esci' })
    if (!ok) return
    await sb().auth.signOut()
    clearCache()
    router.replace('/login')
  }

  return (
    <main>
      <PageHeader back={`/u/${me.id}`} title="Impostazioni" />
      <PageBody>
        <p className="px-1 text-[14px] text-muted">
          Accesso con <span className="font-semibold text-fg">{email ?? 'account Google'}</span>
        </p>

        <Group title="Notifiche">
          <div className="border-b border-line">
            <PushToggle />
          </div>
          {PREFS.map((p) => (
            <div key={p.key} className="border-b border-line last:border-0">
              <Switch
                checked={prefs[p.key] !== false}
                onChange={(v) => void togglePref(p.key, v)}
                label={p.label}
                description={p.description}
              />
            </div>
          ))}
        </Group>

        <Group title="Aspetto">
          <div className="flex gap-1 py-3" role="radiogroup" aria-label="Tema">
            {(
              [
                ['dark', 'Scuro'],
                ['light', 'Chiaro'],
                ['system', 'Come il telefono'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => {
                  setTheme(value)
                  applyTheme(value)
                }}
                className={cn(
                  'press h-10 flex-1 rounded-full text-[13.5px] font-semibold',
                  theme === value ? 'bg-invert text-invert-fg' : 'bg-elev-2 text-fg',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Group>

        <Group title="Gruppo">
          <LinkRow href="/membri" icon={<LuUsers className="size-5" />}>
            Membri
          </LinkRow>
          <LinkRow href="/archivio" icon={<LuArchive className="size-5" />}>
            Eventi passati
          </LinkRow>
          {me.role === 'admin' ? (
            <LinkRow href="/admin" icon={<LuShieldCheck className="size-5" />}>
              Inviti e membri (amministratore)
            </LinkRow>
          ) : null}
        </Group>

        <div className="mt-7">
          <InstallHint />
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="press mt-7 flex w-full items-center justify-center gap-2 rounded-[20px] bg-elev py-3.5 text-[15px] font-semibold text-no"
        >
          <LuLogOut className="size-5" /> Esci
        </button>
        <p className="mt-6 text-center text-[12px] text-faint">{APP_NAME}</p>
      </PageBody>
    </main>
  )
}
