import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'games' }
  | { name: 'game'; key: string }
  | { name: 'analyzing' }
  | { name: 'bot-setup' }
  | { name: 'bot-game' }
  | { name: 'progress' }
  | { name: 'training' }
  | { name: 'session'; theme?: string }
  | { name: 'puzzles'; theme?: string }
  | { name: 'guide' }
  | { name: 'opening'; slug: string }
  | { name: 'family'; id: string }
  | { name: 'practice'; slug: string; line: number }
  | { name: 'lesson'; id: string }
  | { name: 'my-openings' }
  | { name: 'data' }

/** O endereço guarda onde a pessoa está: recarregar, voltar e compartilhar a aba continuam funcionando. */
export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const [first, second, third] = parts
  switch (first) {
    case 'partidas':
      return { name: 'games' }
    case 'partida':
      return second ? { name: 'game', key: second } : { name: 'games' }
    case 'analisando':
      return { name: 'analyzing' }
    case 'jogar':
      return { name: 'bot-setup' }
    case 'jogo':
      return { name: 'bot-game' }
    case 'progresso':
      return { name: 'progress' }
    case 'treino':
      return second === 'sessao' ? { name: 'session', theme: third } : { name: 'training' }
    case 'puzzles':
      return { name: 'puzzles', theme: second }
    case 'guia':
      if (second === 'abertura' && third) return { name: 'opening', slug: third }
      if (second === 'familia' && third) return { name: 'family', id: third }
      if (second === 'praticar' && third) return { name: 'practice', slug: third, line: Number(parts[3] ?? 0) || 0 }
      if (second === 'licao' && third) return { name: 'lesson', id: third }
      if (second === 'minhas') return { name: 'my-openings' }
      return { name: 'guide' }
    case 'dados':
      return { name: 'data' }
    default:
      return { name: 'home' }
  }
}

export const gamePath = (key: string) => `#/partida/${encodeURIComponent(key)}`

const inAppDepth = () => (window.history.state as { depth?: number } | null)?.depth ?? 0

const listeners = new Set<() => void>()
const notify = () => {
  for (const listener of listeners) listener()
}

export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (replace) window.history.replaceState({ depth: inAppDepth() }, '', path)
  else window.history.pushState({ depth: inAppDepth() + 1 }, '', path)
  notify()
}

/** Volta para a tela anterior. Quem chegou direto pelo endereço vai para o início, sem sair do app. */
export function goBack() {
  if (inAppDepth() > 0) window.history.back()
  else navigate('#/', { replace: true })
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash))
    listeners.add(update)
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    return () => {
      listeners.delete(update)
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])
  return route
}
