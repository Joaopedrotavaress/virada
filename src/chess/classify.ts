import { isBrilliant } from './brilliant'
import { type Color, type Eval, winPercentFor } from './evaluation'
import type { GameMove } from './pgn'

export type MoveClass = 'brilliant' | 'book' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'miss'

export const MOVE_CLASSES: MoveClass[] = ['brilliant', 'book', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder']

export const CLASS_INFO: Record<MoveClass, { label: string; symbol: string }> = {
  brilliant: { label: 'Brilhante', symbol: '!!' },
  book: { label: 'Livro', symbol: '' },
  best: { label: 'Melhor', symbol: '★' },
  excellent: { label: 'Excelente', symbol: '!' },
  good: { label: 'Boa', symbol: '✓' },
  inaccuracy: { label: 'Imprecisão', symbol: '?!' },
  mistake: { label: 'Erro', symbol: '?' },
  blunder: { label: 'Erro grave', symbol: '??' },
  miss: { label: 'Chance perdida', symbol: '✕' },
}

/** Categorias que recebem um ponto no gráfico de avaliação. */
export const isErrorClass = (cls: MoveClass) => cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder' || cls === 'miss'

const OPPORTUNITY_THRESHOLD = 10

export interface PositionEval {
  eval: Eval
  bestUci: string | null
}

export interface ClassifiedMove {
  winBefore: number
  winAfter: number
  loss: number
  cls: MoveClass
  accuracy: number
}

export function moveAccuracy(loss: number): number {
  return Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669))
}

export function classifyLoss(loss: number): MoveClass {
  if (loss < 2) return 'excellent'
  if (loss < 5) return 'good'
  if (loss < 10) return 'inaccuracy'
  if (loss < 20) return 'mistake'
  return 'blunder'
}

export interface GradedMove {
  winBefore: number
  winAfter: number
  loss: number
  isBest: boolean
  accuracy: number
}

/** Mede um lance comparando as avaliações antes e depois, do ponto de vista de quem jogou. */
export function gradeMove(uci: string, color: Color, before: PositionEval, after: Pick<PositionEval, 'eval'>): GradedMove {
  const winBefore = winPercentFor(before.eval, color)
  const winAfter = winPercentFor(after.eval, color)
  const isBest = before.bestUci === uci
  // As duas buscas têm horizontes diferentes. Jogar o lance do motor não pode custar precisão:
  // sem isso, o ruído viraria perda e até um falso "o adversário errou" para o lance seguinte.
  const loss = isBest ? 0 : Math.max(0, winBefore - winAfter)
  return { winBefore, winAfter, loss, isBest, accuracy: moveAccuracy(loss) }
}

/** Classificação de um lance testado fora da partida (sem o contexto do lance anterior). */
export function classOf(graded: GradedMove, played?: { fen: string; uci: string; color: Color; evalBefore: Eval }): MoveClass {
  if (played && isBrilliant({ ...played, loss: graded.loss, winBefore: graded.winBefore, winAfter: graded.winAfter })) return 'brilliant'
  return graded.isBest ? 'best' : classifyLoss(graded.loss)
}

/** positions tem moves.length + 1 itens: positions[i] é a posição antes de moves[i]. */
export function classifyMoves(moves: Pick<GameMove, 'uci' | 'color'>[], positions: (PositionEval & { fen?: string })[], bookMoves: boolean[] = []): ClassifiedMove[] {
  const classified: ClassifiedMove[] = []
  moves.forEach((move, index) => {
    const { winBefore, winAfter, loss: rawLoss, isBest, accuracy } = gradeMove(move.uci, move.color, positions[index], positions[index + 1])
    // Teoria não se julga: um gambito pode "perder" avaliação sem ser erro de ninguém.
    if (bookMoves[index]) {
      classified.push({ winBefore, winAfter, loss: 0, cls: 'book', accuracy: 100 })
      return
    }
    const loss = rawLoss
    const previousLoss = index > 0 ? classified[index - 1].loss : 0

    let cls: MoveClass
    if (isBest) cls = 'best'
    else if (previousLoss >= OPPORTUNITY_THRESHOLD && loss >= OPPORTUNITY_THRESHOLD) cls = 'miss'
    else cls = classifyLoss(loss)

    const { fen } = positions[index]
    if (fen && isBrilliant({ fen, uci: move.uci, color: move.color, loss, winBefore, winAfter, evalBefore: positions[index].eval })) cls = 'brilliant'

    classified.push({ winBefore, winAfter, loss, cls, accuracy })
  })
  return classified
}

export interface SideSummary {
  /** null quando o lado não fez nenhum lance. */
  accuracy: number | null
  counts: Record<MoveClass, number>
}

export function summarize(moves: (ClassifiedMove & { color: Color })[]): Record<Color, SideSummary> {
  const side = (color: Color): SideSummary => {
    const own = moves.filter((move) => move.color === color)
    const counts = Object.fromEntries(MOVE_CLASSES.map((cls) => [cls, 0])) as Record<MoveClass, number>
    for (const move of own) counts[move.cls] += 1
    const judged = own.filter((move) => move.cls !== 'book')
    const accuracy = judged.length ? judged.reduce((sum, move) => sum + move.accuracy, 0) / judged.length : null
    return { accuracy, counts }
  }
  return { w: side('w'), b: side('b') }
}
