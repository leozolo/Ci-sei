type ClassValue = string | false | null | undefined | 0

/** Unisce classi CSS ignorando i valori vuoti. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
