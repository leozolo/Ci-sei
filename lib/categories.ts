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
import { msgs, type Messages } from '@/lib/i18n/core'

export type CategoryId = keyof Messages['categories']

export interface Category {
  id: CategoryId
  /** etichetta per filtri (plurale dove serve), nella lingua corrente */
  readonly label: string
  /** etichetta per il singolo evento, nella lingua corrente */
  readonly one: string
  icon: IconType
  /** tinta usata solo per le locandine generate (eventi senza immagine) */
  hue: number
}

function category(id: CategoryId, icon: IconType, hue: number): Category {
  return {
    id,
    icon,
    hue,
    get label() {
      return msgs().categories[id].label
    },
    get one() {
      return msgs().categories[id].one
    },
  }
}

export const CATEGORIES: Category[] = [
  category('discoteca', LuDisc3, 322),
  category('techno', LuAudioWaveform, 250),
  category('concerto', LuGuitar, 18),
  category('aperitivo', LuMartini, 38),
  category('festival', LuTent, 350),
  category('mostra', LuFrame, 190),
  category('ristorante', LuUtensilsCrossed, 95),
  category('cultura', LuDrama, 275),
  category('sport', LuTrophy, 160),
  category('altro', LuSparkles, 230),
]

const FALLBACK = CATEGORIES[CATEGORIES.length - 1]

export function categoryById(id: string | null | undefined): Category {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK
}
