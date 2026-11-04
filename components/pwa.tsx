'use client'

import { useEffect, useState } from 'react'
import { LuShare, LuSmartphone, LuX } from 'react-icons/lu'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/field'
import { toast } from '@/components/ui/feedback'
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
    <div className="relative flex items-start gap-3 rounded-[20px] border border-line bg-elev p-4 pr-11">
      <LuSmartphone className="mt-0.5 size-5 shrink-0 text-muted" />
      <div className="min-w-0 text-[14px]">
        <p className="font-semibold">Mettila sulla schermata Home</p>
        {mode === 'ios' ? (
          <p className="mt-0.5 text-muted">
            Tocca <LuShare className="inline size-4 -translate-y-0.5" aria-label="Condividi" /> in Safari e poi «Aggiungi alla
            schermata Home». Si apre a tutto schermo e riceve le notifiche.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-muted">Si apre a tutto schermo, come un&apos;app, e riceve le notifiche.</p>
            <Button size="sm" className="mt-3" onClick={install}>
              Installa
            </Button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Nascondi"
        className="press absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full text-faint hover:bg-elev-2"
      >
        <LuX className="size-4" />
      </button>
    </div>
  )
}

/* ---------------- Notifiche push ---------------- */

export function PushToggle() {
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
          toast.error('Le notifiche sul telefono non sono ancora configurate sul server.')
          return
        }
        const result = await enablePush(publicKey)
        if (result === 'denied') {
          setDenied(true)
          toast.error('Permesso negato: abilita le notifiche dalle impostazioni del telefono.')
          return
        }
        setOn(true)
        toast.success('Notifiche attive su questo dispositivo')
      } else {
        await disablePush()
        setOn(false)
      }
    } catch {
      toast.error('Non sono riuscito a cambiare le notifiche. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (support === null) return null

  if (support === 'ios-install') {
    return (
      <p className="py-3 text-[14px] text-muted">
        Su iPhone le notifiche arrivano solo dall&apos;app installata: in Safari tocca{' '}
        <LuShare className="inline size-4 -translate-y-0.5" aria-label="Condividi" /> e poi «Aggiungi alla schermata Home», quindi
        apri l&apos;app da lì e torna qui.
      </p>
    )
  }

  if (support === 'unsupported') {
    return <p className="py-3 text-[14px] text-muted">Questo browser non supporta le notifiche sul dispositivo.</p>
  }

  return (
    <div>
      <Switch
        checked={on}
        onChange={toggle}
        disabled={busy || publicKey === undefined || (denied && !on)}
        label="Notifiche su questo dispositivo"
        description={
          denied && !on
            ? 'Bloccate: riattivale dalle impostazioni del telefono per questa app.'
            : publicKey === null
              ? 'Non ancora configurate sul server: vedi la guida, passaggio «chiave segreta».'
              : 'Ricevi gli avvisi anche quando l’app è chiusa.'
        }
      />
    </div>
  )
}
