/**
 * Forme plurali. Italiano e inglese usano "one" e "other"; il russo anche
 * "few" (2–4, 22–24…) e "many" (5–20, 25–30…). La forma giusta la sceglie
 * Intl.PluralRules, già presente in ogni browser.
 */
export interface Plural {
  one: string
  other: string
  few?: string
  many?: string
}
