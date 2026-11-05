import { useEffect, useState } from 'react'
import { sanToPt } from './notation'

const BASE = 'https://tablebase.lichess.ovh/standard'
const MAX_PIECES = 7

export type TablebaseCategory = 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss' | 'maybe-win' | 'maybe-loss' | 'unknown'

export interface TablebaseAnswer {
  /** Do ponto de vista de quem tem a vez. */
  category: TablebaseCategory
  bestSan: string | null
  /** Lances até o mate, quando a base informa. */
  dtm: number | null
}

interface RawMove {
  san: string
}

interface RawAnswer {
  category?: TablebaseCategory
  dtm?: number | null
  moves?: RawMove[]
}

/** Só finais com poucas peças estão na base. */
export function pieceCount(fen: string): number {
  return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length
}

export const inTablebase = (fen: string) => pieceCount(fen) <= MAX_PIECES

const memory = new Map<string, TablebaseAnswer>()

/** Consulta a base. Sem internet ou se o serviço falhar, responde null: o app segue sem ela. */
export async function queryTablebase(fen: string, deps: { fetch?: typeof fetch; signal?: AbortSignal; isOnline?: () => boolean } = {}): Promise<TablebaseAnswer | null> {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  if (!inTablebase(fen) || !isOnline()) return null
  const known = memory.get(fen)
  if (known) return known
  try {
    const response = await doFetch(`${BASE}?fen=${encodeURIComponent(fen)}`, { signal: deps.signal })
    if (!response.ok) return null
    const data = (await response.json()) as RawAnswer
    if (!data.category || data.category === 'unknown') return null
    const answer: TablebaseAnswer = { category: data.category, bestSan: data.moves?.[0]?.san ?? null, dtm: data.dtm ?? null }
    memory.set(fen, answer)
    return answer
  } catch {
    return null
  }
}

/** Frase para a pessoa, nomeando quem ganha. */
export function describeTablebase(answer: TablebaseAnswer, fen: string): string {
  const toMove = fen.split(' ')[1] === 'w' ? 'brancas' : 'pretas'
  const other = toMove === 'brancas' ? 'pretas' : 'brancas'
  const best = answer.bestSan ? ` Melhor lance: ${sanToPt(answer.bestSan)}.` : ''
  const inMoves = answer.dtm ? ` Mate em ${Math.ceil(Math.abs(answer.dtm) / 2)}.` : ''
  switch (answer.category) {
    case 'win':
    case 'maybe-win':
      return `Pelo banco de finais, as ${toMove} ganham.${inMoves}${best}`
    case 'loss':
    case 'maybe-loss':
      return `Pelo banco de finais, as ${other} ganham.${inMoves}${best}`
    case 'cursed-win':
    case 'blessed-loss':
      return `Pelo banco de finais, é empate pela regra dos 50 lances.${best}`
    default:
      return `Pelo banco de finais, é empate com o melhor jogo.${best}`
  }
}

/** Resposta da base para a posição na tela. Fora da base ou sem internet, fica vazio. */
export function useTablebase(fen: string | null): string | null {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    setText(null)
    if (!fen || !inTablebase(fen)) return
    const controller = new AbortController()
    void queryTablebase(fen, { signal: controller.signal }).then((answer) => {
      if (answer && !controller.signal.aborted) setText(describeTablebase(answer, fen))
    })
    return () => controller.abort()
  }, [fen])
  return text
}
