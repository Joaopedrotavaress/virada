import type { Color } from './evaluation'

export type CapturedType = 'p' | 'n' | 'b' | 'r' | 'q'

const VALUES: Record<CapturedType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }
/** Da menos para a mais valiosa, como nos sites de xadrez. */
const ORDER: CapturedType[] = ['p', 'n', 'b', 'r', 'q']

type Counts = Record<CapturedType, number>

function countPieces(fen: string): Record<Color, Counts> {
  const counts: Record<Color, Counts> = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } }
  for (const char of fen.split(' ')[0]) {
    const lower = char.toLowerCase() as CapturedType
    if (lower in VALUES) counts[char === lower ? 'b' : 'w'][lower] += 1
  }
  return counts
}

export interface MaterialState {
  /** Peças que cada cor capturou: captured.w são as peças pretas que as brancas tomaram. */
  captured: Record<Color, CapturedType[]>
  /** Vantagem de material em pontos: quem está à frente tem o número positivo; o outro, 0. */
  advantage: Record<Color, number>
}

function lostPieces(start: Counts, current: Counts): CapturedType[] {
  // Peão promovido não foi capturado: cada peça a mais que no início veio de um peão.
  const promoted = ORDER.reduce((sum, type) => sum + Math.max(0, current[type] - start[type]), 0)
  const lost: CapturedType[] = []
  for (const type of ORDER) {
    const missing = Math.max(0, start[type] - current[type]) - (type === 'p' ? promoted : 0)
    for (let index = 0; index < missing; index += 1) lost.push(type)
  }
  return lost
}

/** Compara a posição com a inicial da partida, que pode não ser a padrão. */
export function materialState(fen: string, initialFen: string): MaterialState {
  const start = countPieces(initialFen)
  const current = countPieces(fen)
  const score = (color: Color) => ORDER.reduce((sum, type) => sum + VALUES[type] * current[color][type], 0)
  const difference = score('w') - score('b')
  return {
    captured: { w: lostPieces(start.b, current.b), b: lostPieces(start.w, current.w) },
    advantage: { w: Math.max(0, difference), b: Math.max(0, -difference) },
  }
}
