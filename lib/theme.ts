export type ThemePref = 'dark' | 'light' | 'system'
export const THEME_KEY = 'cisei:tema'

/** Eseguito prima del disegno della pagina: evita il "lampo" del tema sbagliato. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'dark';var t=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;document.documentElement.dataset.theme=t;}catch(e){}})();`

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'system' ? v : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    // modalità privata
  }
  const resolved =
    pref === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref
  document.documentElement.dataset.theme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f2f2f4' : '#000000')
}
