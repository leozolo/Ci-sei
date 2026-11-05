/** Le lingue dell'app. Per aggiungerne una: un file in lib/i18n/messages e una voce qui. */
export const LOCALES = ['it', 'en', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'it'

/** Ogni lingua scritta nella lingua stessa: è quello che compare nel menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  ru: 'Русский',
}

/** Formati di date e numeri. Inglese britannico: orologio a 24 ore e giorno prima del mese. */
export const INTL_LOCALE: Record<Locale, string> = {
  it: 'it-IT',
  en: 'en-GB',
  ru: 'ru-RU',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Lingua scelta su questo telefono (vale anche prima di accedere). */
export const LOCALE_STORAGE_KEY = 'cisei:lingua'
/** Scelta fatta prima di avere un account: va salvata nel profilo appena possibile. */
export const LOCALE_PENDING_KEY = 'cisei:lingua-da-salvare'
