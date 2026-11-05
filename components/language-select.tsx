'use client'

import { LuChevronDown, LuLanguages } from 'react-icons/lu'
import { cn } from '@/lib/cn'
import { isLocale, LOCALE_NAMES, LOCALES, type Locale } from '@/lib/i18n/locales'
import { useI18n } from '@/lib/i18n/react'

/**
 * Il menu a tendina della lingua (quello nativo del telefono).
 * pending: scelta fatta prima di accedere, da salvare nel profilo al primo accesso.
 */
export function LanguageSelect({
  pending,
  onChange,
  className,
  id,
}: {
  pending?: boolean
  onChange?: (locale: Locale) => void
  className?: string
  id?: string
}) {
  const { locale, setLocale, m } = useI18n()
  return (
    <label
      className={cn(
        'relative inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong pl-3 pr-2 text-[14px] font-semibold text-fg hover:border-fg/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-going',
        className,
      )}
    >
      <LuLanguages className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="sr-only">{m.language.label}</span>
      <select
        id={id}
        value={locale}
        onChange={(e) => {
          const next = e.target.value
          if (!isLocale(next)) return
          setLocale(next, { pending })
          onChange?.(next)
        }}
        className="h-full cursor-pointer appearance-none bg-transparent pr-5 outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l} className="bg-elev text-fg">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      <LuChevronDown className="pointer-events-none absolute right-2.5 size-4 text-muted" aria-hidden />
    </label>
  )
}
