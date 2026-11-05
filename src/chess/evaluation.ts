export type Color = 'w' | 'b'

/** Avaliação sempre do ponto de vista das brancas (cp) ou com o vencedor explícito (mate). */
export type Eval =
  | { kind: 'cp'; cp: number }
  /** moves = 0 significa que o xeque-mate já está no tabuleiro. */
  | { kind: 'mate'; moves: number; winner: Color }

export const opposite = (color: Color): Color => (color === 'w' ? 'b' : 'w')

/** Converte o score do UCI (ponto de vista de quem joga) para o das brancas. */
export function toWhitePov(score: { type: 'cp' | 'mate'; value: number }, sideToMove: Color): Eval {
  if (score.type === 'mate') {
    const winner = score.value > 0 ? sideToMove : opposite(sideToMove)
    return { kind: 'mate', moves: Math.abs(score.value), winner }
  }
  return { kind: 'cp', cp: sideToMove === 'w' ? score.value : -score.value }
}

/** Chance de vitória das brancas, de 0 a 100. */
export function whiteWinPercent(evaluation: Eval): number {
  if (evaluation.kind === 'mate') return evaluation.winner === 'w' ? 100 : 0
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * evaluation.cp)) - 1)
}

export function winPercentFor(evaluation: Eval, color: Color): number {
  const white = whiteWinPercent(evaluation)
  return color === 'w' ? white : 100 - white
}

const MINUS = '−'

/** Formato brasileiro: +1,2 / −3,4 / 0,0 / M3 / −M3. */
export function formatEval(evaluation: Eval): string {
  if (evaluation.kind === 'mate') {
    if (evaluation.moves === 0) return evaluation.winner === 'w' ? '1-0' : '0-1'
    return `${evaluation.winner === 'w' ? '' : MINUS}M${evaluation.moves}`
  }
  const pawns = evaluation.cp / 100
  const text = Math.abs(pawns).toFixed(1).replace('.', ',')
  if (text === '0,0') return '0,0'
  return `${pawns > 0 ? '+' : MINUS}${text}`
}
