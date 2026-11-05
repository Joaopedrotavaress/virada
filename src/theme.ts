import { useCallback, useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const THEME_KEY = 'treinador:tema'
const THEME_COLOR: Record<Theme, string> = { dark: '#0b0b0d', light: '#e6e6ea' }

const listeners = new Set<() => void>()

/** O Virada nasceu escuro: o claro só vale quando a pessoa escolhe. */
export function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Sem localStorage, o tema vale só até fechar a página.
  }
  applyTheme(theme)
  for (const listener of listeners) listener()
}

const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

export function useTheme() {
  const theme = useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, currentTheme)
  const toggle = useCallback(() => saveTheme(currentTheme() === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggle }
}
