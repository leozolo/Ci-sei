import { errorMessage } from '@/lib/actions'

/** Traduce gli errori di Supabase Auth in messaggi chiari. */
export function authErrorMessage(err: unknown): string {
  const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (/invalid login credentials/i.test(msg)) return 'Email o password non corretti.'
  if (/email not confirmed/i.test(msg)) return 'Devi prima confermare l’email: controlla la posta (anche lo spam).'
  if (/already registered|already been registered|already exists/i.test(msg)) return 'Esiste già un account con questa email: accedi.'
  if (/password should|weak password|at least \d+ characters/i.test(msg)) return 'La password è troppo corta: usa almeno 8 caratteri.'
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Troppi tentativi ravvicinati: riprova tra qualche minuto.'
  if (/signups? not allowed|signup is disabled/i.test(msg)) return 'Le registrazioni sono disattivate nelle impostazioni di Supabase.'
  if (/invalid.*email|unable to validate email/i.test(msg)) return 'Controlla l’indirizzo email.'
  if (/provider is not enabled|unsupported provider/i.test(msg)) return 'L’accesso con Google non è ancora attivo.'
  return errorMessage(err)
}

export function safeNext(value: string | null | undefined, fallback = '/'): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}
