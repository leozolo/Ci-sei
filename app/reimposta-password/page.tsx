'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthScreen, Notice } from '@/components/auth-ui'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { toast } from '@/components/ui/feedback'
import { authErrorMessage } from '@/lib/auth-errors'
import { sb } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
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
      setError('Usa almeno 8 caratteri.')
      return
    }
    if (password !== confirm) {
      setError('Le due password non coincidono.')
      return
    }
    setBusy(true)
    const { error: err } = await sb().auth.updateUser({ password })
    setBusy(false)
    if (err) {
      setError(authErrorMessage(err))
      return
    }
    toast.success('Password aggiornata')
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
        <Notice tone="error">Il link non è più valido. Richiedine uno nuovo dalla pagina di accesso.</Notice>
        <Link href="/login" className="mt-4 block text-center font-semibold underline underline-offset-4">
          Vai all&apos;accesso
        </Link>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <div className="rounded-[28px] bg-elev p-5">
        <h1 className="text-[20px] font-bold">Nuova password</h1>
        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          <TextField id="nuova" label="Nuova password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField id="conferma" label="Ripeti la password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Salva la password
          </Button>
        </form>
      </div>
    </AuthScreen>
  )
}
