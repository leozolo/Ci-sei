import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { safeNext } from '@/lib/auth-errors'
import { createServerSupabase } from '@/lib/supabase/server'

/** Ritorno da Google, dalle email di conferma e dal recupero password. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeNext(url.searchParams.get('next'))
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const supabase = await createServerSupabase()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }

  const target = new URL('/login', url.origin)
  target.searchParams.set('errore', url.searchParams.get('error') ? 'oauth' : 'link')
  if (next !== '/') target.searchParams.set('next', next)
  return NextResponse.redirect(target)
}
