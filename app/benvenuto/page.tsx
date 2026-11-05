'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthScreen, Notice } from '@/components/auth-ui'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { inviteErrorMessage, joinGroup } from '@/lib/actions'
import { PENDING_INVITE_KEY } from '@/lib/config'
import { fmt } from '@/lib/i18n/core'
import { useI18n } from '@/lib/i18n/react'
import { clearCache } from '@/lib/query'
import { sb } from '@/lib/supabase/client'

type State = 'loading' | 'removed' | 'create' | 'invite'

/** Ricava il codice da un link d'invito incollato (o dal codice stesso). */
function extractCode(input: string): string {
  const v = input.trim()
  const match = /\/invito\/([a-z0-9]+)/i.exec(v)
  return (match ? match[1] : v).toLowerCase()
}

export default function WelcomePage() {
  const router = useRouter()
  const { m } = useI18n()
  const [state, setState] = useState<State>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await sb().auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      setEmail(session.user.email ?? null)
      const meta = session.user.user_metadata ?? {}
      setName(String(meta.display_name || meta.full_name || meta.name || ''))
      const { data: profile } = await sb().from('profiles').select('status').eq('id', session.user.id).maybeSingle()
      const status = (profile as { status?: string } | null)?.status
      if (status === 'active') {
        router.replace('/')
        return
      }
      if (status === 'removed') {
        setState('removed')
        return
      }
      const { data: hasMembers } = await sb().rpc('group_has_members')
      if (hasMembers === false) {
        setState('create')
        return
      }
      try {
        const pending = localStorage.getItem(PENDING_INVITE_KEY)
        if (pending) setCode(pending)
      } catch {
        // ignora
      }
      setState('invite')
    })()
  }, [router])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!name.trim()) {
      setError(m.auth.nameRequired)
      return
    }
    setBusy(true)
    try {
      await joinGroup(state === 'create' ? null : extractCode(code), name.trim())
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

  const logout = async () => {
    await sb().auth.signOut()
    router.replace('/login')
  }

  if (state === 'loading') {
    return (
      <AuthScreen>
        <div className="skeleton h-56 rounded-[28px]" />
      </AuthScreen>
    )
  }

  if (state === 'removed') {
    return (
      <AuthScreen>
        <Notice tone="error">{m.errors.removed}</Notice>
        <Button variant="secondary" size="lg" className="mt-4 w-full" onClick={() => void logout()}>
          {m.settings.logout}
        </Button>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen subtitle={email ? fmt(m.welcome.signedInAs, { email }) : undefined}>
      <div className="rounded-[16px] border border-line bg-elev p-5">
        <h1 className="font-list text-[27px] font-extrabold leading-tight">{state === 'create' ? m.auth.createTitle : m.welcome.needInvite}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {state === 'create' ? m.welcome.createBody : m.welcome.inviteBody}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          <TextField id="nome" label={m.auth.name} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          {state === 'invite' ? (
            <TextField
              id="invito"
              label={m.welcome.inviteField}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://…/invito/…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={state === 'invite' && !code.trim()}>
            {state === 'create' ? m.auth.create : m.invite.joinTitle}
          </Button>
        </form>
        <button type="button" onClick={() => void logout()} className="mt-4 w-full text-center text-[14px] text-muted underline-offset-4 hover:underline">
          {m.welcome.logoutAccount}
        </button>
      </div>
    </AuthScreen>
  )
}
