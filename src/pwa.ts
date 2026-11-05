import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// O navegador pode oferecer a instalação antes de o React montar: o aviso é guardado aqui.
let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

function isIos(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator
  // O iPad se apresenta como Mac, mas um Mac não tem tela de toque.
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

export type InstallMode = 'none' | 'prompt' | 'ios'

/** Como oferecer a instalação neste aparelho. */
export function useInstall(): { mode: InstallMode; install: () => Promise<void> } {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1)
    listeners.add(listener)
    return () => void listeners.delete(listener)
  }, [])

  const mode: InstallMode = isStandalone() ? 'none' : deferred ? 'prompt' : isIos() ? 'ios' : 'none'

  return {
    mode,
    install: async () => {
      if (!deferred) return
      const event = deferred
      await event.prompt()
      await event.userChoice
      deferred = null
      notify()
    },
  }
}
