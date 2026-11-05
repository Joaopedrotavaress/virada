import { Chess } from 'chess.js'
import type { GameAnalysis } from './analyze'
import { MOVE_CLASSES, type MoveClass } from './classify'
import { parseTimeControl } from './clock'
import type { Color } from './evaluation'
import { type Motif, detectMotifs } from './motifs'

export type GamePhase = 'opening' | 'middlegame' | 'endgame'
export type ErrorTheme = Motif['kind'] | 'positional'

export const SERIOUS_CLASSES: MoveClass[] = ['mistake', 'blunder', 'miss']

/** Um erro da pessoa, com o necessário para agrupar em padrões e virar exercício. */
export interface GameError {
  ply: number
  moveNumber: number
  san: string
  cls: MoveClass
  loss: number
  phase: GamePhase
  theme: ErrorTheme
  timePressure: boolean
  fen: string
  bestUci: string
  pvUci: string[]
}

/** O resumo da análise que fica junto da partida: dá para calcular a evolução sem abrir cada análise. */
export interface GameDigest {
  id: string
  depth: number
  analyzedAt: number
  plies: number
  accuracy: Record<Color, number | null>
  counts: Record<Color, Record<MoveClass, number>>
  errors: GameError[]
}

const VALUES: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 }

/** Final: pouco material além dos peões. Abertura: os dez primeiros lances, se ainda não virou final. */
export function phaseOf(fen: string, moveNumber: number): GamePhase {
  let material = 0
  for (const char of fen.split(' ')[0]) material += VALUES[char.toLowerCase()] ?? 0
  if (material <= 20) return 'endgame'
  return moveNumber <= 10 ? 'opening' : 'middlegame'
}

function underTimePressure(clock: number | undefined, base: number | null): boolean {
  if (clock === undefined) return false
  return clock < Math.max(15, (base ?? 0) * 0.1)
}

export function digestAnalysis(analysis: GameAnalysis, userColor: Color | null): GameDigest {
  const emptyCounts = () => Object.fromEntries(MOVE_CLASSES.map((cls) => [cls, 0])) as Record<MoveClass, number>
  const counts: GameDigest['counts'] = { w: emptyCounts(), b: emptyCounts() }
  for (const move of analysis.moves) counts[move.color][move.cls] += 1

  const base = parseTimeControl(analysis.timeControl)?.base ?? null
  const errors: GameError[] = []
  if (userColor) {
    analysis.moves.forEach((move, index) => {
      if (move.color !== userColor || !SERIOUS_CLASSES.includes(move.cls)) return
      const before = analysis.positions[index]
      const after = analysis.positions[index + 1]
      if (!before.bestUci) return
      const motifs = detectMotifs({
        color: move.color,
        uci: move.uci,
        beforeFen: before.fen,
        afterFen: after.fen,
        beforeEval: before.eval,
        afterEval: after.eval,
        bestUci: before.bestUci,
        beforePv: before.pvUci,
        afterPv: after.pvUci,
      })
      errors.push({
        ply: move.ply,
        moveNumber: move.moveNumber,
        san: move.san,
        cls: move.cls,
        loss: move.loss,
        phase: phaseOf(before.fen, move.moveNumber),
        theme: motifs[0]?.kind ?? 'positional',
        timePressure: underTimePressure(move.clock, base),
        fen: before.fen,
        bestUci: before.bestUci,
        pvUci: before.pvUci.slice(0, 6),
      })
    })
  }

  return {
    id: analysis.id,
    depth: analysis.depth,
    analyzedAt: analysis.analyzedAt,
    plies: analysis.moves.length,
    accuracy: { w: analysis.summary.w.accuracy, b: analysis.summary.b.accuracy },
    counts,
    errors,
  }
}

/** Refaz o PGN de uma análise antiga, guardada sem ele. */
export function pgnFromAnalysis(analysis: GameAnalysis): string {
  const first = analysis.positions[0]?.fen
  const chess = first ? new Chess(first) : new Chess()
  for (const move of analysis.moves) chess.move(move.san)
  chess.setHeader('White', analysis.white)
  chess.setHeader('Black', analysis.black)
  chess.setHeader('Result', analysis.result)
  chess.setHeader('Date', analysis.date)
  if (analysis.timeControl) chess.setHeader('TimeControl', analysis.timeControl)
  if (analysis.link) chess.setHeader('Link', analysis.link)
  return chess.pgn()
}
