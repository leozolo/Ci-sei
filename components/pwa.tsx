'use client'

import { useEffect, useState } from 'react'
import { LuBell, LuShare, LuSmartphone, LuX } from 'react-icons/lu'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/field'
import { toast } from '@/components/ui/feedback'
import { useI18n } from '@/lib/i18n/react'
import { currentSubscription, disablePush, enablePush, fetchPushKey, isIos, isStandalone, pushSupport, type PushSupport } from '@/lib/push-client'
import { applyTheme, readThemePref } from '@/lib/theme'

/* ------------- Service worker e installazione ------------- */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredInstall: InstallPromptEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstall = e as InstallPromptEvent
    window.dispatchEvent(new Event('cisei:installabile'))
  })
}

/** Registra il service worker e applica il tema scelto (anche "Sistema"). */
export function PwaRuntime() {
  useEffect(() => {
    applyTheme(readThemePref())
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
      if (document.readyState === 'complete') void register()
      else window.addEventListener('load', register, { once: true })
    }
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      if (readThemePref() === 'system') applyTheme('system')
    }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])
  return null
}

const DISMISS_KEY = 'cisei:installa-nascosto'

/** Invito a installare l'app sulla schermata Home. */
export function InstallHint() {
  const { m } = useI18n()
  const [mode, setMode] = useState<'prompt' | 'ios' | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      // ignora
    }
    const update = () => {
      if (deferredInstall) setMode('prompt')
    }
    update()
    if (isIos()) setMode('ios')
    window.addEventListener('cisei:installabile', update)
    return () => window.removeEventListener('cisei:installabile', update)
  }, [])

  if (!mode) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignora
    }
    setMode(null)
  }

  const install = async () => {
    if (!deferredInstall) return
    await deferredInstall.prompt()
    const choice = await deferredInstall.userChoice
    deferredInstall = null
    if (choice.outcome === 'accepted') setMode(null)
  }

  return (
    <div className="relative flex items-start gap-3 rounded-ctl border border-line bg-elev p-4 pr-11">
      <LuSmartphone className="mt-0.5 size-5 shrink-0 text-muted" />
      <div className="min-w-0 text-[14px]">
        <p className="font-semibold">{m.pwa.installTitle}</p>
        {mode === 'ios' ? (
          <p className="mt-0.5 text-muted">
            {m.pwa.iosBefore} <LuShare className="inline size-4 -translate-y-0.5" aria-label={m.pwa.shareIcon} /> {m.pwa.iosAfter}
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-muted">{m.pwa.installBody}</p>
            <Button size="sm" className="mt-3" onClick={install}>
              {m.pwa.install}
            </Button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={m.pwa.hide}
        className="press absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-ctl text-faint hover:bg-elev-2"
      >
        <LuX className="size-4" />
      </button>
    </div>
  )
}

/* ---------------- Notifiche push ---------------- */

export function PushToggle() {
  const { m } = useI18n()
  const [support, setSupport] = useState<PushSupport | null>(null)
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined)
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const s = pushSupport()
    setSupport(s)
    if (s !== 'ok') return
    setDenied(Notification.permission === 'denied')
    void currentSubscription()
      .then((sub) => setOn(!!sub))
      .catch(() => undefined)
    void fetchPushKey().then(setPublicKey)
  }, [])

  const toggle = async (value: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (value) {
        if (!publicKey) {
          toast.error(m.pwa.pushNotConfigured)
          return
        }
        const result = await enablePush(publicKey)
        if (result === 'denied') {
          setDenied(true)
          toast.error(m.pwa.pushDenied)
          return
        }
        setOn(true)
        toast.success(m.pwa.pushOn)
      } else {
        await disablePush()
        setOn(false)
      }
    } catch {
      toast.error(m.pwa.pushError)
    } finally {
      setBusy(false)
    }
  }

  if (support === null) return null

  if (support === 'ios-install') {
    return (
      <p className="py-3 text-[14px] text-muted">
        {m.pwa.pushIosBefore} <LuShare className="inline size-4 -translate-y-0.5" aria-label={m.pwa.shareIcon} />{' '}
        {m.pwa.pushIosAfter}
      </p>
    )
  }

  if (support === 'unsupported') {
    return <p className="py-3 text-[14px] text-muted">{m.pwa.pushUnsupported}</p>
  }

  return (
    <div>
      <Switch
        checked={on}
        onChange={toggle}
        disabled={busy || publicKey === undefined || (denied && !on)}
        label={m.pwa.pushLabel}
        description={
          denied && !on
            ? m.pwa.pushBlocked
            : publicKey === null
              ? m.pwa.pushServerMissing
              : m.pwa.pushHint
        }
      />
    </div>
  )
}

/* ---------------- Invito ad attivare le notifiche ---------------- */

const INVITE_KEY = 'cisei:invito-notifiche'

/** Compare a ogni nuovo accesso (nuova sessione) finché le notifiche non sono attive su questo telefono. */
export function PushInvite() {
  const { m } = useI18n()
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    try {
      if (sessionStorage.getItem(INVITE_KEY)) return
    } catch {
      // ignora
    }
    if (pushSupport() !== 'ok' || Notification.permission === 'denied') return
    void (async () => {
      if (await currentSubscription()) return
      const key = await fetchPushKey()
      if (alive && key) setTimeout(() => alive && setPublicKey(key), 1500)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!publicKey) return null

  const close = () => {
    try {
      sessionStorage.setItem(INVITE_KEY, '1')
    } catch {
      // ignora
    }
    setPublicKey(null)
  }

  const turnOn = async () => {
    if (busy || !publicKey) return
    setBusy(true)
    try {
      const result = await enablePush(publicKey)
      if (result === 'denied') toast.error(m.pwa.pushDenied)
      else toast.success(m.pwa.pushOn)
      close()
    } catch {
      toast.error(m.pwa.pushError)
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label={m.pwa.inviteTitle}
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-50 mx-auto max-w-2xl px-3"
    >
      <div className="flex items-start gap-3 rounded-sheet border border-line-strong bg-elev-2 p-4">
        <LuBell className="mt-0.5 size-5 shrink-0 text-going" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-[14px]">
          <p className="font-semibold">{m.pwa.inviteTitle}</p>
          <p className="mt-0.5 text-muted">{m.pwa.inviteBody}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={turnOn} disabled={busy}>
              {m.pwa.inviteYes}
            </Button>
            <Button size="sm" variant="ghost" onClick={close} disabled={busy}>
              {m.pwa.inviteLater}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
