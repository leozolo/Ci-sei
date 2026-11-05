import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_CITY } from '@/lib/config'
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
