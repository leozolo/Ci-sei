'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { messagesFor, setCurrentLocale, type Messages } from './core'
import { DEFAULT_LOCALE, isLocale, LOCALE_PENDING_KEY, LOCALE_STORAGE_KEY, LOCALES, type Locale } from './locales'

interface I18nValue {
  locale: Locale
  m: Messages
  /** pending: scelta fatta prima di accedere, da salvare nel profilo al primo accesso */
  setLocale: (locale: Locale, options?: { pending?: boolean }) => void
}

const I18nContext = createContext<I18nValue | null>(null)

export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

export function readPendingLocale(): boolean {
  try {
    return localStorage.getItem(LOCALE_PENDING_KEY) === '1'
  } catch {
    return false
  }
}

export function clearPendingLocale(): void {
  try {
    localStorage.removeItem(LOCALE_PENDING_KEY)
  } catch {
    // archivio del browser non disponibile
  }
}

function storeLocale(locale: Locale, pending: boolean): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    if (pending) localStorage.setItem(LOCALE_PENDING_KEY, '1')
    else localStorage.removeItem(LOCALE_PENDING_KEY)
  } catch {
    // archivio del browser non disponibile: la lingua vale fino alla chiusura
  }
}

// Sul server useLayoutEffect non esiste: lì basta useEffect (non fa nulla).
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * La pagina arriva dal server in italiano; prima che il browser la mostri si
 * passa alla lingua salvata sul telefono (lo script in <head> la tiene nascosta
 * per quell'istante, così non si vede l'italiano lampeggiare).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  setCurrentLocale(locale)

  useBrowserLayoutEffect(() => {
    const stored = readStoredLocale()
    if (stored && stored !== DEFAULT_LOCALE) {
      setCurrentLocale(stored) // subito, anche per gli effetti già in coda
      setLocaleState(stored)
    }
  }, [])

  useBrowserLayoutEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.classList.remove('i18n-pending')
  }, [locale])

  const setLocale = useCallback((next: Locale, options?: { pending?: boolean }) => {
    storeLocale(next, options?.pending ?? false)
    setCurrentLocale(next)
    setLocaleState(next)
  }, [])

  const value = useMemo<I18nValue>(() => ({ locale, m: messagesFor(locale), setLocale }), [locale, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Testi e lingua corrente. Ogni componente che mostra testo o date lo usa,
 * così si ridisegna subito quando la lingua cambia.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n va usato dentro I18nProvider')
  return value
}

/** Script per <head>: nasconde la pagina finché non è nella lingua salvata (al massimo 1,5 secondi). */
export const I18N_SCRIPT = `(function(){try{var l=localStorage.getItem('${LOCALE_STORAGE_KEY}');if(${JSON.stringify(
  LOCALES.filter((l) => l !== DEFAULT_LOCALE),
)}.indexOf(l)>=0){var d=document.documentElement;d.lang=l;d.classList.add('i18n-pending');setTimeout(function(){d.classList.remove('i18n-pending')},1500)}}catch(e){}})();`
