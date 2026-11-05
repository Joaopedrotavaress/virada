import { Chess } from 'chess.js'
import type { AnalyzeOptions, EngineLike, EngineLine } from '../engine/stockfish'
import { terminalEval } from './analyze'
import type { Eval } from './evaluation'
import { type TerminalState, terminalStateOf } from './pgn'

export interface PositionResult {
  eval: Eval
  bestUci: string | null
  pvUci: string[]
  terminal: TerminalState | null
  lines: EngineLine[]
}

/** O limite dos lances testados: profundidade 14 ou 1,5 s, o que vier primeiro. */
export const QUICK_EVAL = { depth: 14, movetime: 1500 }

/** Avalia uma posição solta. Xeque-mate e empate saem das regras, sem passar pelo motor. */
export async function evaluatePosition(
  engine: EngineLike,
  fen: string,
  { depth = QUICK_EVAL.depth, movetime, signal, multiPv, onUpdate }: { depth?: number | null; movetime?: number } & Pick<AnalyzeOptions, 'signal' | 'multiPv'> & {
      onUpdate?: (partial: PositionResult) => void
    } = {},
): Promise<PositionResult> {
  const terminal = terminalStateOf(new Chess(fen), true)
  if (terminal) return { eval: terminalEval(terminal, fen), bestUci: null, pvUci: [], terminal, lines: [] }
  const toResult = (result: Pick<PositionResult, 'eval' | 'bestUci' | 'pvUci' | 'lines'>): PositionResult => ({
    eval: result.eval,
    bestUci: result.bestUci,
    pvUci: result.pvUci,
    lines: result.lines,
    terminal: null,
  })
  const result = await engine.analyze(fen, depth, {
    movetime: movetime ?? (depth === QUICK_EVAL.depth ? QUICK_EVAL.movetime : undefined),
    signal,
    multiPv,
    onUpdate: onUpdate ? (partial) => onUpdate(toResult(partial)) : undefined,
  })
  return toResult(result)
}
