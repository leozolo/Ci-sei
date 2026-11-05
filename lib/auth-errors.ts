import { errorMessage } from '@/lib/actions'
import { msgs } from '@/lib/i18n/core'

/** Traduce gli errori di Supabase Auth in messaggi chiari. */
export function authErrorMessage(err: unknown): string {
  const t = msgs().authErrors
  const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (/invalid login credentials/i.test(msg)) return t.invalidCredentials
  if (/email not confirmed/i.test(msg)) return t.emailNotConfirmed
  if (/already registered|already been registered|already exists/i.test(msg)) return t.alreadyRegistered
  if (/password should|weak password|at least \d+ characters/i.test(msg)) return t.weakPassword
  if (/rate limit|too many|security purposes/i.test(msg)) return t.rateLimit
  if (/signups? not allowed|signup is disabled/i.test(msg)) return t.signupsDisabled
  if (/invalid.*email|unable to validate email/i.test(msg)) return t.invalidEmail
  if (/provider is not enabled|unsupported provider/i.test(msg)) return t.googleDisabled
  return errorMessage(err)
}

export function safeNext(value: string | null | undefined, fallback = '/'): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}
