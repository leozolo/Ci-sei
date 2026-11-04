'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen, GoogleButton, Notice, OrDivider } from '@/components/auth-ui'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { inviteErrorMessage, joinGroup } from '@/lib/actions'
import { authErrorMessage } from '@/lib/auth-errors'
import { GOOGLE_AUTH, PENDING_INVITE_KEY } from '@/lib/config'
import { clearCache } from '@/lib/query'
import { sb } from '@/lib/supabase/client'

interface InviteInfo {
  valid: boolean
  inviter?: string | null
  reason?: 'not_found' | 'revoked' | 'expired' | 'used'
}

const REASONS: Record<string, string> = {
  not_found: 'Questo link d’invito non esiste. Controlla di averlo copiato tutto.',
  revoked: 'Questo link d’invito è stato disattivato.',
  expired: 'Questo link d’invito è scaduto.',
  used: 'Questo link d’invito è già stato usato.',
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_INVITE_KEY, code)
    } catch {
      // ignora
    }
    void sb()
      .rpc('get_invite_info', { p_code: code })
      .then(({ data }) => setInfo((data as InviteInfo | null) ?? { valid: false, reason: 'not_found' }))
    void sb()
      .auth.getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        if (!data.session) return
        const meta = data.session.user.user_metadata ?? {}
        setName(String(meta.display_name || meta.full_name || meta.name || ''))
        const { data: profile } = await sb().from('profiles').select('status').eq('id', data.session.user.id).maybeSingle()
        if ((profile as { status?: string } | null)?.status === 'active') router.replace('/')
      })
  }, [code, router])

  const join = async (displayName: string | null) => {
    setBusy(true)
    setError(null)
    try {
      await joinGroup(code, displayName)
      try {
        localStorage.removeItem(PENDING_INVITE_KEY)
      } catch {
        // ignora
      }
      clearCache()
      router.replace('/?benvenuto=1')
    } catch (err) {
      setError(inviteErrorMessage(err))
      setBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setNotice(null)
    if (mode === 'signup' && !name.trim()) {
      setError('Scrivi il tuo nome o nickname: è quello che vedranno gli amici.')
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error: err } = await sb().auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
        await join(null)
        return
      }
      const { data, error: err } = await sb().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/invito/${code}`)}`,
        },
      })
      if (err) throw err
      if (data.session) {
        await join(name.trim())
      } else {
        setNotice('Ti abbiamo mandato un’email: apri il link di conferma, tornerai qui e potrai entrare.')
        setBusy(false)
      }
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  if (!info || session === undefined) {
    return (
      <AuthScreen>
        <div className="skeleton h-64 rounded-[28px]" />
      </AuthScreen>
    )
  }

  if (!info.valid) {
    return (
      <AuthScreen>
        <Notice tone="error">{REASONS[info.reason ?? 'not_found']}</Notice>
        <p className="mt-4 text-center text-[14px] text-muted">
          Chiedi un nuovo link a chi ti ha invitato. Hai già un account?{' '}
          <Link href="/login" className="font-semibold text-fg underline underline-offset-4">
            Accedi
          </Link>
        </p>
      </AuthScreen>
    )
  }

  const invitedBy = info.inviter ? `${info.inviter} ti ha invitato nel gruppo.` : 'Sei stato invitato nel gruppo.'

  if (session) {
    return (
      <AuthScreen subtitle={invitedBy}>
        <div className="rounded-[28px] bg-elev p-5">
          <h1 className="text-[20px] font-bold">Entra nel gruppo</h1>
          <p className="mt-1 text-[14px] text-muted">Con l&apos;account {session.user.email}.</p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void join(name.trim() || null)
            }}
          >
            <TextField id="nome" label="Come ti chiami nel gruppo?" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Entra
            </Button>
          </form>
          <button
            type="button"
            onClick={() => void sb().auth.signOut().then(() => setSession(null))}
            className="mt-4 w-full text-center text-[14px] text-muted underline-offset-4 hover:underline"
          >
            Non sei tu? Usa un altro account
          </button>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen subtitle={invitedBy}>
      <div className="rounded-[28px] bg-elev p-5">
        <div className="flex gap-1 rounded-full bg-elev-2 p-1" role="tablist">
          {(
            [
              ['signup', 'Sono nuovo'],
              ['login', 'Ho già un account'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={`press h-9 flex-1 rounded-full text-[14px] font-semibold ${mode === m ? 'bg-invert text-invert-fg' : 'text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          {mode === 'signup' ? (
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
          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={mode === 'signup' ? 'Almeno 8 caratteri.' : undefined}
          />
          {error ? <Notice tone="error">{error}</Notice> : null}
          {notice ? <Notice tone="success">{notice}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email.trim() || !password}>
            {mode === 'signup' ? 'Registrati ed entra' : 'Accedi ed entra'}
          </Button>
        </form>

        {GOOGLE_AUTH ? (
          <>
            <OrDivider />
            <GoogleButton next={`/invito/${code}`} />
          </>
        ) : null}
      </div>
    </AuthScreen>
  )
}
