'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthScreen, Notice } from '@/components/auth-ui'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { toast } from '@/components/ui/feedback'
import { authErrorMessage } from '@/lib/auth-errors'
import { useI18n } from '@/lib/i18n/react'
import { sb } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { m } = useI18n()
  const t = m.newPassword
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void sb()
      .auth.getSession()
      .then(({ data }) => setHasSession(!!data.session))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(t.tooShort)
      return
    }
    if (password !== confirm) {
      setError(t.mismatch)
      return
    }
    setBusy(true)
    const { error: err } = await sb().auth.updateUser({ password })
    setBusy(false)
    if (err) {
      setError(authErrorMessage(err))
      return
    }
    toast.success(t.updated)
    router.replace('/')
  }

  if (hasSession === null) {
    return (
      <AuthScreen>
        <div className="skeleton h-48 rounded-[28px]" />
      </AuthScreen>
    )
  }

  if (!hasSession) {
    return (
      <AuthScreen>
        <Notice tone="error">{t.invalidLink}</Notice>
        <Link href="/login" className="mt-4 block text-center font-semibold underline underline-offset-4">
          {t.goToLogin}
        </Link>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <div className="rounded-[16px] border border-line bg-elev p-5">
        <h1 className="font-list text-[27px] font-extrabold leading-tight">{t.title}</h1>
        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          <TextField id="nuova" label={t.field} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField id="conferma" label={t.repeat} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {t.save}
          </Button>
        </form>
      </div>
    </AuthScreen>
  )
}
