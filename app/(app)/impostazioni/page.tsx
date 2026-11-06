'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { LuArchive, LuChevronRight, LuLogOut, LuShieldCheck, LuUsers } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Credit } from '@/components/brand'
import { LanguageSelect } from '@/components/language-select'
import { PageBody, PageHeader } from '@/components/page-header'
import { InstallHint, PushToggle } from '@/components/pwa'
import { Switch } from '@/components/ui/field'
import { confirmDialog, toast } from '@/components/ui/feedback'
import { errorMessage, updateLocale, updateNotifyPrefs } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/config'
import type { Locale } from '@/lib/i18n/locales'
import { useI18n } from '@/lib/i18n/react'
import { clearCache } from '@/lib/query'
import { sb } from '@/lib/supabase/client'
import { applyTheme, readThemePref, type ThemePref } from '@/lib/theme'
import type { NotifyPrefKey } from '@/lib/types'

const PREFS: NotifyPrefKey[] = ['new_event', 'comments', 'event_updates', 'friend_going']

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{title}</h2>
      <div className="rounded-[16px] border border-line bg-elev px-4">{children}</div>
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
  const { m } = useI18n()
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

  // la lingua cambia subito sullo schermo; qui la salviamo nel profilo
  const saveLocale = async (locale: Locale) => {
    try {
      await updateLocale(me.id, locale)
      void refreshMe()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const logout = async () => {
    const ok = await confirmDialog({ title: m.settings.logoutTitle, confirmLabel: m.settings.logout })
    if (!ok) return
    await sb().auth.signOut()
    clearCache()
    router.replace('/login')
  }

  return (
    <main>
      <PageHeader back={`/u/${me.id}`} title={m.settings.title} />
      <PageBody>
        <p className="px-1 text-[14px] text-muted">
          {m.settings.signedInAs} <span className="font-semibold text-fg">{email ?? m.settings.googleAccount}</span>
        </p>

        <Group title={m.language.label}>
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="min-w-0 text-[13px] leading-snug text-muted">{m.language.hint}</p>
            <LanguageSelect id="lingua" onChange={(l) => void saveLocale(l)} className="shrink-0" />
          </div>
        </Group>

        <Group title={m.settings.notifications}>
          <div className="border-b border-line">
            <PushToggle />
          </div>
          {PREFS.map((key) => (
            <div key={key} className="border-b border-line last:border-0">
              <Switch
                checked={prefs[key] !== false}
                onChange={(v) => void togglePref(key, v)}
                label={m.settings.prefs[key].label}
                description={m.settings.prefs[key].description}
              />
            </div>
          ))}
        </Group>

        <Group title={m.settings.appearance}>
          <div className="flex gap-1 py-3" role="radiogroup" aria-label={m.settings.theme}>
            {(
              [
                ['dark', m.settings.themeDark],
                ['light', m.settings.themeLight],
                ['system', m.settings.themeSystem],
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
                  'press h-10 flex-1 rounded-full text-[13px] font-semibold',
                  theme === value ? 'bg-invert text-invert-fg' : 'bg-elev-2 text-fg',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Group>

        <Group title={m.settings.group}>
          <LinkRow href="/membri" icon={<LuUsers className="size-5" />}>
            {m.settings.members}
          </LinkRow>
          <LinkRow href="/archivio" icon={<LuArchive className="size-5" />}>
            {m.board.pastEvents}
          </LinkRow>
          {me.role === 'admin' ? (
            <LinkRow href="/admin" icon={<LuShieldCheck className="size-5" />}>
              {m.settings.adminLink}
            </LinkRow>
          ) : null}
        </Group>

        <div className="mt-7">
          <InstallHint />
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="press mt-7 flex w-full items-center justify-center gap-2 rounded-[16px] border border-line bg-elev py-3.5 text-[15px] font-semibold text-no"
        >
          <LuLogOut className="size-5" /> {m.settings.logout}
        </button>
        <p className="mt-6 text-center text-[12px] text-faint">{APP_NAME}</p>
        <Credit className="mt-0.5" />
      </PageBody>
    </main>
  )
}
