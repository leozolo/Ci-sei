export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Club dei clubbers'

/** Nome breve per la schermata Home (massimo ~12 caratteri). */
export const APP_SHORT_NAME = process.env.NEXT_PUBLIC_APP_SHORT_NAME?.trim() || 'Clubbers'

/** Città predefinita per i nuovi eventi (altre città si aggiungono dal modulo). */
export const DEFAULT_CITY = process.env.NEXT_PUBLIC_DEFAULT_CITY?.trim() || 'Roma'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const GOOGLE_AUTH = process.env.NEXT_PUBLIC_GOOGLE_AUTH === 'true'

export const IS_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY)

/** Chiave per ricordare un invito aperto prima della registrazione. */
export const PENDING_INVITE_KEY = 'cisei:invito'
