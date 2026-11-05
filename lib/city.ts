import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_CITY } from '@/lib/config'
import { getLocale } from '@/lib/i18n/core'
import type { Locale } from '@/lib/i18n/locales'
import type { EventView } from '@/lib/types'

/*
 * Più città: ogni evento ha la sua città. La scelta di chi guarda
 * ("Tutte" o una città) resta su questo telefono.
 */

const KEY = 'cisei:citta'
const EVENT = 'cisei:citta-cambiata'
export const ALL_CITIES = '*'

function read(): string {
  try {
    return localStorage.getItem(KEY) || ALL_CITIES
  } catch {
    return ALL_CITIES
  }
}

/*
 * Il nome della città resta come l'ha scritto chi ha proposto l'evento;
 * solo per mostrarlo, le città più comuni hanno il nome in inglese e russo.
 */
const CITY_NAMES: Record<string, Partial<Record<Locale, string>>> = {
  roma: { en: 'Rome', ru: 'Рим' },
  ostia: { ru: 'Остия' },
  fiumicino: { ru: 'Фьюмичино' },
  milano: { en: 'Milan', ru: 'Милан' },
  napoli: { en: 'Naples', ru: 'Неаполь' },
  torino: { en: 'Turin', ru: 'Турин' },
  firenze: { en: 'Florence', ru: 'Флоренция' },
  venezia: { en: 'Venice', ru: 'Венеция' },
  bologna: { ru: 'Болонья' },
  genova: { en: 'Genoa', ru: 'Генуя' },
  padova: { en: 'Padua', ru: 'Падуя' },
  verona: { ru: 'Верона' },
  pisa: { ru: 'Пиза' },
  siena: { ru: 'Сиена' },
  bari: { ru: 'Бари' },
  palermo: { ru: 'Палермо' },
  catania: { ru: 'Катания' },
  cagliari: { ru: 'Кальяри' },
  londra: { en: 'London', ru: 'Лондон' },
  parigi: { en: 'Paris', ru: 'Париж' },
  berlino: { en: 'Berlin', ru: 'Берлин' },
  barcellona: { en: 'Barcelona', ru: 'Барселона' },
  madrid: { ru: 'Мадрид' },
  lisbona: { en: 'Lisbon', ru: 'Лиссабон' },
  amsterdam: { ru: 'Амстердам' },
  praga: { en: 'Prague', ru: 'Прага' },
  vienna: { ru: 'Вена' },
  ibiza: { ru: 'Ибица' },
  mosca: { en: 'Moscow', ru: 'Москва' },
  'san pietroburgo': { en: 'Saint Petersburg', ru: 'Санкт-Петербург' },
}

/** "Roma" → "Rome", "Рим". Le altre città restano come sono state scritte. */
export function cityLabel(city: string, locale: Locale = getLocale()): string {
  return CITY_NAMES[city.trim().toLocaleLowerCase('it-IT')]?.[locale] ?? city
}

export function normalizeCity(value: string): string {
  const v = value.trim().replace(/\s+/g, ' ')
  return v ? v[0].toLocaleUpperCase('it-IT') + v.slice(1) : DEFAULT_CITY
}

/** Città presenti negli eventi, la più frequente per prima. */
export function citiesOf(events: Pick<EventView, 'city'>[]): string[] {
  const counts = new Map<string, number>()
  for (const e of events) {
    const c = e.city || DEFAULT_CITY
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it')).map(([c]) => c)
}

export function useCityFilter(events: Pick<EventView, 'city'>[] | undefined) {
  const [city, setCityState] = useState<string>(ALL_CITIES)

  useEffect(() => {
    setCityState(read())
    const sync = () => setCityState(read())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  const cities = useMemo(() => citiesOf(events ?? []), [events])
  // con una sola città il filtro non serve e non si mostra
  const active = cities.length > 1 && city !== ALL_CITIES && cities.includes(city) ? city : ALL_CITIES

  const setCity = useCallback((value: string) => {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      // modalità privata: vale solo per questa sessione
    }
    setCityState(value)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const matches = useCallback((e: Pick<EventView, 'city'>) => active === ALL_CITIES || e.city === active, [active])

  return { city: active, cities, setCity, matches, multi: cities.length > 1 }
}
