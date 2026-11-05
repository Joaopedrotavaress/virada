import { type EngineLike, EngineAbortError } from '../engine/stockfish'
import { type OpeningInfo, findBookMoves, loadBook } from './book'
import { type ClassifiedMove, type SideSummary, classifyMoves, summarize } from './classify'
import { type ClockData, computeClock } from './clock'
import { type Color, type Eval, opposite } from './evaluation'
import type { GameMove, GamePosition, ParsedGame, TerminalState } from './pgn'

export interface AnalyzedPosition extends GamePosition {
  eval: Eval
  bestUci: string | null
  pvUci: string[]
}

export type AnalyzedMove = GameMove & ClassifiedMove

export interface GameAnalysis {
  id: string
  analyzedAt: number
  depth: number
  white: string
  black: string
  result: string
  date: string
  timeControl: string
  positions: AnalyzedPosition[]
  moves: AnalyzedMove[]
  summary: Record<Color, SideSummary>
  /** A abertura mais profunda em que a partida passou. */
  opening?: OpeningInfo | null
  /** Relógio de cada lance. Ausente em partidas daily ou sem [%clk]. */
  clock?: ClockData | null
  /** De onde veio. Ausente: PGN colado. */
  source?: 'bot' | 'chesscom'
  /** Endereço da partida no chess.com, para marcar como "Analisada" na lista. */
  link?: string
  /** Cor da pessoa quando o nome não basta para descobrir (partidas contra bots). */
  userColor?: Color
}

/** Só o que cabe mostrar (4–6 lances), para não inflar o localStorage. */
const STORED_PV_LENGTH = 8

/** Avaliação definida pelas regras: xeque-mate ou empate não passam pelo motor. */
export function terminalEval(terminal: TerminalState, fen: string): Eval {
  if (terminal !== 'checkmate') return { kind: 'cp', cp: 0 }
  const mated: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  return { kind: 'mate', moves: 0, winner: opposite(mated) }
}

export function hashText(text: string): string {
  let hash = 5381
  for (let index = 0; index < text.length; index += 1) hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0
  return hash.toString(36)
}

export function gameId(game: ParsedGame, depth: number): string {
  const text = [game.white, game.black, game.date, depth, game.positions[0].fen, ...game.moves.map((move) => move.uci)].join('|')
  return `${hashText(text)}-${game.moves.length}-${depth}`
}

/** Identifica a partida independentemente da profundidade da análise. */
export function gameKey(game: ParsedGame): string {
  const text = [game.white, game.black, game.date, game.positions[0].fen, ...game.moves.map((move) => move.uci)].join('|')
  return `${hashText(text)}-${game.moves.length}`
}

export interface AnalyzeGameOptions {
  /** done: posições já avaliadas; total: número de posições. */
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

export async function analyzeGame(
  engine: EngineLike,
  game: ParsedGame,
  depth: number,
  { onProgress, signal }: AnalyzeGameOptions = {},
): Promise<GameAnalysis> {
  await engine.newGame()

  const positions: AnalyzedPosition[] = []
  const total = game.positions.length
  onProgress?.(0, total)
  for (const position of game.positions) {
    if (signal?.aborted) throw new EngineAbortError()
    if (position.terminal) {
      positions.push({ ...position, eval: terminalEval(position.terminal, position.fen), bestUci: null, pvUci: [] })
    } else {
      const result = await engine.analyze(position.fen, depth, { signal })
      positions.push({
        ...position,
        eval: result.eval,
        bestUci: result.bestUci,
        pvUci: result.pvUci.slice(0, STORED_PV_LENGTH),
      })
    }
    onProgress?.(positions.length, total)
  }

  const { bookMoves, opening } = findBookMoves(await loadBook(), positions.slice(1).map((position) => position.fen))
  // A base inclui armadilhas, como o mate do louco. Um lance que leva a mate forçado não é teoria a respeitar:
  // o livro termina ali, para o treinador poder avisar do erro.
  const firstMate = positions.slice(1).findIndex((position) => position.eval.kind === 'mate')
  if (firstMate !== -1) bookMoves.fill(false, firstMate)
  const classified = classifyMoves(game.moves, positions, bookMoves)
  const moves: AnalyzedMove[] = game.moves.map((move, index) => ({ ...move, ...classified[index] }))

  return {
    id: gameId(game, depth),
    analyzedAt: Date.now(),
    depth,
    white: game.white,
    black: game.black,
    result: game.result,
    date: game.date,
    timeControl: game.timeControl,
    link: game.headers.Link,
    positions,
    moves,
    summary: summarize(moves),
    opening,
    clock: computeClock(game.moves, game.moves.map((move) => move.clock), game.timeControl),
  }
}
