'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthScreen, GoogleButton, Notice, OrDivider } from '@/components/auth-ui'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { inviteErrorMessage, joinGroup } from '@/lib/actions'
import { authErrorMessage, safeNext } from '@/lib/auth-errors'
import { GOOGLE_AUTH, IS_CONFIGURED } from '@/lib/config'
import { clearCache } from '@/lib/query'
import { sb } from '@/lib/supabase/client'

type Mode = 'login' | 'reset' | 'create'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [next, setNext] = useState('/')
  const [groupEmpty, setGroupEmpty] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const target = safeNext(params.get('next'))
    setNext(target)
    if (params.get('errore') === 'link') setError('Il link è scaduto o è stato aperto in un altro browser. Accedi qui con email e password.')
    if (params.get('errore') === 'oauth') setError('Accesso con Google non riuscito. Riprova.')
    if (!IS_CONFIGURED) return
    void sb()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace(target)
      })
    void sb()
      .rpc('group_has_members')
      .then(({ data }) => {
        if (data === false) {
          setGroupEmpty(true)
          setMode('create')
        }
      })
  }, [router])

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error: err } = await sb().auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
        clearCache()
        router.replace(next)
        return
      }
      if (mode === 'reset') {
        const { error: err } = await sb().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/reimposta-password`,
        })
        if (err) throw err
        setNotice('Fatto: ti abbiamo mandato un’email con il link per scegliere una nuova password.')
        return
      }
      // creazione del gruppo: il primo account diventa amministratore
      if (!name.trim()) {
        setError('Scrivi il tuo nome o nickname.')
        return
      }
      if (password.length < 8) {
        setError('La password deve avere almeno 8 caratteri.')
        return
      }
      const { data, error: err } = await sb().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/benvenuto`,
        },
      })
      if (err) throw err
      if (data.session) {
        try {
          await joinGroup(null, name.trim())
        } catch (joinErr) {
          setError(inviteErrorMessage(joinErr))
          return
        }
        clearCache()
        router.replace('/?benvenuto=1')
      } else {
        setNotice('Controlla la posta: apri il link di conferma e il gruppo sarà pronto.')
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Mode, string> = {
    login: 'Accedi',
    reset: 'Recupera la password',
    create: 'Crea il gruppo',
  }

  return (
    <AuthScreen subtitle="Gli eventi del gruppo: cosa c’è in città e chi ci va.">
      {!IS_CONFIGURED ? (
        <Notice tone="error">
          L&apos;app non è ancora collegata a Supabase: aggiungi le variabili d&apos;ambiente (vedi la guida) e pubblica di nuovo.
        </Notice>
      ) : (
        <div className="rounded-[16px] border border-line bg-elev p-5">
          <h1 className="font-list text-[27px] font-extrabold leading-tight">{titles[mode]}</h1>
          {mode === 'create' ? (
            <p className="mt-1 text-[14px] text-muted">Sei il primo: il tuo account sarà l&apos;amministratore e potrai invitare gli amici.</p>
          ) : null}

          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            {mode === 'create' ? (
              <TextField id="nome" label="Nome o nickname" autoComplete="nickname" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            ) : null}
            <TextField
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== 'reset' ? (
              <TextField
                id="password"
                label="Password"
                type="password"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={mode === 'create' ? 'Almeno 8 caratteri.' : undefined}
              />
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            {notice ? <Notice tone="success">{notice}</Notice> : null}
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email.trim() || (mode !== 'reset' && !password)}>
              {mode === 'login' ? 'Accedi' : mode === 'reset' ? 'Invia il link' : 'Crea il gruppo'}
            </Button>
          </form>

          {GOOGLE_AUTH && mode !== 'reset' ? (
            <>
              <OrDivider />
              <GoogleButton next={mode === 'create' ? '/benvenuto' : next} />
            </>
          ) : null}

          <div className="mt-5 text-center text-[14px]">
            {mode === 'login' ? (
              <button type="button" onClick={() => switchMode('reset')} className="text-muted underline-offset-4 hover:underline">
                Password dimenticata?
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('login')} className="text-muted underline-offset-4 hover:underline">
                Ho già un account: accedi
              </button>
            )}
          </div>
        </div>
      )}

      {IS_CONFIGURED && !groupEmpty ? (
        <p className="mt-6 text-center text-[14px] text-muted">
          Non hai un account? L&apos;app è privata: chiedi un link d&apos;invito a un amico del gruppo.
        </p>
      ) : null}
    </AuthScreen>
  )
}
