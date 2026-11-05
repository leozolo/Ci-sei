'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthScreen, GoogleButton, Notice, OrDivider } from '@/components/auth-ui'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { inviteErrorMessage, joinGroup } from '@/lib/actions'
import { authErrorMessage, safeNext } from '@/lib/auth-errors'
import { GOOGLE_AUTH, IS_CONFIGURED } from '@/lib/config'
import { getLocale, msgs } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { clearCache } from '@/lib/query'
import { sb } from '@/lib/supabase/client'

type Mode = 'login' | 'reset' | 'create'

export default function LoginPage() {
  const router = useRouter()
  const { m } = useI18n()
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
    if (params.get('errore') === 'link') setError(msgs().auth.linkExpired)
    if (params.get('errore') === 'oauth') setError(msgs().auth.googleFailed)
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

  const switchMode = (next: Mode) => {
    setMode(next)
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
        setNotice(m.auth.resetSent)
        return
      }
      // creazione del gruppo: il primo account diventa amministratore
      if (!name.trim()) {
        setError(m.auth.nameRequired)
        return
      }
      if (password.length < 8) {
        setError(m.auth.passwordShort)
        return
      }
      const { data, error: err } = await sb().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: name.trim(), locale: getLocale() },
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
        setNotice(m.auth.confirmCreate)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Mode, string> = {
    login: m.auth.loginTitle,
    reset: m.auth.resetTitle,
    create: m.auth.createTitle,
  }

  return (
    <AuthScreen subtitle={m.auth.tagline}>
      {!IS_CONFIGURED ? (
        <Notice tone="error">{m.auth.notConfigured}</Notice>
      ) : (
        <div className="rounded-[16px] border border-line bg-elev p-5">
          <h1 className="font-list text-[27px] font-extrabold leading-tight">{titles[mode]}</h1>
          {mode === 'create' ? (
            <p className="mt-1 text-[14px] text-muted">{m.auth.createIntro}</p>
          ) : null}

          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            {mode === 'create' ? (
              <TextField id="nome" label={m.auth.name} autoComplete="nickname" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            ) : null}
            <TextField
              id="email"
              label={m.auth.email}
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
                label={m.auth.password}
                type="password"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={mode === 'create' ? m.auth.passwordHint : undefined}
              />
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            {notice ? <Notice tone="success">{notice}</Notice> : null}
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email.trim() || (mode !== 'reset' && !password)}>
              {mode === 'login' ? m.auth.login : mode === 'reset' ? m.auth.sendLink : m.auth.create}
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
                {m.auth.forgot}
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('login')} className="text-muted underline-offset-4 hover:underline">
                {m.auth.haveAccount}
              </button>
            )}
          </div>
        </div>
      )}

      {IS_CONFIGURED && !groupEmpty ? (
        <p className="mt-6 text-center text-[14px] text-muted">{m.auth.noAccount}</p>
      ) : null}
    </AuthScreen>
  )
}
