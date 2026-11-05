import { useSyncExternalStore } from 'react'

/** Celular em pé e tablet em pé usam o layout de celular; o resto, inclusive celular deitado, o de desktop. */
const DESKTOP_QUERY = '(min-width: 1024px), (min-width: 640px) and (orientation: landscape)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches)
}
