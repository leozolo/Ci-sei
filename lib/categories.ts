import type { IconType } from 'react-icons'
import {
  LuAudioWaveform,
  LuDisc3,
  LuDrama,
  LuFrame,
  LuGuitar,
  LuMartini,
  LuSparkles,
  LuTent,
  LuTrophy,
  LuUtensilsCrossed,
} from 'react-icons/lu'

export interface Category {
  id: string
  /** etichetta per filtri (plurale dove serve) */
  label: string
  /** etichetta per il singolo evento */
  one: string
  icon: IconType
  /** tinta usata solo per le locandine generate (eventi senza immagine) */
  hue: number
}

export const CATEGORIES: Category[] = [
  { id: 'discoteca', label: 'Discoteca', one: 'Discoteca', icon: LuDisc3, hue: 322 },
  { id: 'techno', label: 'Techno', one: 'Techno', icon: LuAudioWaveform, hue: 250 },
  { id: 'concerto', label: 'Concerti', one: 'Concerto', icon: LuGuitar, hue: 18 },
  { id: 'aperitivo', label: 'Aperitivo', one: 'Aperitivo', icon: LuMartini, hue: 38 },
  { id: 'festival', label: 'Festival', one: 'Festival', icon: LuTent, hue: 350 },
  { id: 'mostra', label: 'Mostre', one: 'Mostra', icon: LuFrame, hue: 190 },
  { id: 'ristorante', label: 'Ristoranti', one: 'Ristorante', icon: LuUtensilsCrossed, hue: 95 },
  { id: 'cultura', label: 'Cultura', one: 'Evento culturale', icon: LuDrama, hue: 275 },
  { id: 'sport', label: 'Sport', one: 'Sport', icon: LuTrophy, hue: 160 },
  { id: 'altro', label: 'Altro', one: 'Altro', icon: LuSparkles, hue: 230 },
]

const FALLBACK = CATEGORIES[CATEGORIES.length - 1]

export function categoryById(id: string | null | undefined): Category {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK
}
