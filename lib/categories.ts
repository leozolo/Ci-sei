export interface Category {
  id: string
  /** etichetta per filtri (plurale dove serve) */
  label: string
  /** etichetta per il singolo evento */
  one: string
  emoji: string
  /** tinta usata solo per le locandine segnaposto */
  hue: number
  sat: number
}

export const CATEGORIES: Category[] = [
  { id: 'discoteca', label: 'Discoteca', one: 'Discoteca', emoji: '🪩', hue: 318, sat: 70 },
  { id: 'techno', label: 'Techno', one: 'Techno', emoji: '🎛️', hue: 262, sat: 70 },
  { id: 'concerto', label: 'Concerti', one: 'Concerto', emoji: '🎸', hue: 18, sat: 75 },
  { id: 'aperitivo', label: 'Aperitivo', one: 'Aperitivo', emoji: '🍹', hue: 36, sat: 85 },
  { id: 'festival', label: 'Festival', one: 'Festival', emoji: '🎪', hue: 350, sat: 75 },
  { id: 'mostra', label: 'Mostre', one: 'Mostra', emoji: '🖼️', hue: 192, sat: 60 },
  { id: 'ristorante', label: 'Ristoranti', one: 'Ristorante', emoji: '🍝', hue: 96, sat: 45 },
  { id: 'cultura', label: 'Cultura', one: 'Evento culturale', emoji: '🎭', hue: 216, sat: 60 },
  { id: 'sport', label: 'Sport', one: 'Sport', emoji: '⚽', hue: 150, sat: 55 },
  { id: 'altro', label: 'Altro', one: 'Altro', emoji: '✨', hue: 40, sat: 8 },
]

const FALLBACK = CATEGORIES[CATEGORIES.length - 1]

export function categoryById(id: string | null | undefined): Category {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK
}
