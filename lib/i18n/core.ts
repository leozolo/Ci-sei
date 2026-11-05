import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from './locales'
import { en } from './messages/en'
import { it, type Messages } from './messages/it'
import { ru } from './messages/ru'
import type { Plural } from './plural'

export type { Messages }

const DICTIONARIES: Record<Locale, Messages> = { it, en, ru }

/*
 * La lingua corrente, letta anche dal codice che non è un componente React
 * (date, messaggi di errore, testo di condivisione). La imposta I18nProvider
 * prima di disegnare l'app; sul server ogni funzione riceve la lingua esplicita.
 */
let current: Locale = DEFAULT_LOCALE

export const getLocale = (): Locale => current

export function setCurrentLocale(locale: Locale): void {
  current = locale
}

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale]
}

/** Il dizionario della lingua corrente. */
export function msgs(): Messages {
  return DICTIONARIES[current]
}

export function intlLocale(locale: Locale = current): string {
  return INTL_LOCALE[locale]
}

type Vars = Record<string, string | number>

/** Sostituisce i segnaposto {nome} con i valori. */
export function fmt(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match))
}

const rulesCache = new Map<string, Intl.PluralRules>()

/** Sceglie la forma plurale giusta per n e inserisce {n} e gli altri valori. */
export function plural(forms: Plural, n: number, vars: Vars = {}, locale: Locale = current): string {
  const tag = INTL_LOCALE[locale]
  let rules = rulesCache.get(tag)
  if (!rules) {
    rules = new Intl.PluralRules(tag)
    rulesCache.set(tag, rules)
  }
  const category = rules.select(n) as keyof Plural
  return fmt(forms[category] ?? forms.other, { n, ...vars })
}

/** "a, b e c" nella lingua giusta. */
export function listJoin(items: string[], locale: Locale = current): string {
  if (items.length <= 1) return items.join('')
  try {
    return new Intl.ListFormat(INTL_LOCALE[locale], { style: 'long', type: 'conjunction' }).format(items)
  } catch {
    return items.join(', ')
  }
}
