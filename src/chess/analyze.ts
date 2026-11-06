import type { RemoteAnalyzer } from '../engine/servidor'
import { type EngineLike, type EngineResult, EngineAbortError } from '../engine/stockfish'
import { type OpeningInfo, findBookMoves, loadBook } from './book'
import { CLASS_VERSION, type ClassifiedMove, type Ratings, type SideSummary, classifyMoves, summarize } from './classify'
import { type ClockData, computeClock } from './clock'
import { type Color, type Eval, opposite } from './evaluation'
import { DEFAULT_RATING, expectedPoints, toModelRating } from './expectedPoints'
import type { GameMove, GamePosition, ParsedGame, TerminalState } from './pgn'

export interface AnalyzedPosition extends GamePosition {
  eval: Eval
  bestUci: string | null
  pvUci: string[]
  /** A segunda melhor linha, medida quando o lance jogado foi o primeiro do motor. */
  secondEval?: Eval
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
  /** Rating de cada lado, já na escala da curva de pontos esperados. Ausente: sem rating no PGN. */
  ratings?: Ratings
  /** A versão das regras que classificou os lances. */
  classVersion?: number
  /** Onde o motor rodou. Ausente: análise antiga, feita no aparelho. */
  engine?: 'servidor' | 'aparelho'
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
  /** Motor no servidor. O que ele não responder é calculado no aparelho. */
  remote?: RemoteAnalyzer
}

/**
 * Análise guardada com regras antigas é reclassificada ao abrir, com as avaliações que já tem.
 * O que depende da segunda melhor linha, como o lance "!", só aparece analisando de novo.
 */
export function upgradeAnalysis(analysis: GameAnalysis): GameAnalysis {
  if (analysis.classVersion === CLASS_VERSION) return analysis
  const classified = classifyMoves(analysis.moves, analysis.positions, analysis.moves.map((move) => move.cls === 'book'), analysis.ratings)
  const moves = analysis.moves.map((move, index) => ({ ...move, ...classified[index] }))
  return { ...analysis, moves, summary: summarize(moves), classVersion: CLASS_VERSION }
}

/** O rating de cada lado, quando o PGN traz. */
export function ratingsOf(headers: Record<string, string>): Ratings {
  const fromChessCom = /chess\.com/i.test(headers.Site ?? '') || /chess\.com/i.test(headers.Link ?? '')
  const read = (value: string | undefined) => {
    const rating = Number(value)
    return Number.isFinite(rating) && rating >= 100 ? toModelRating(rating, fromChessCom) : null
  }
  return { w: read(headers.WhiteElo), b: read(headers.BlackElo) }
}

export async function analyzeGame(
  engine: EngineLike,
  game: ParsedGame,
  depth: number,
  { onProgress, signal, remote }: AnalyzeGameOptions = {},
): Promise<GameAnalysis> {
  await engine.newGame()

  const book = await loadBook()
  const ratings = ratingsOf(game.headers)
  const { bookMoves: earlyBook } = findBookMoves(book, game.positions.slice(1).map((position) => position.fen))
  const positions: AnalyzedPosition[] = []
  const total = game.positions.length
  // A barra nunca anda para trás, mesmo quando o aparelho completa o que o servidor não respondeu.
  let shown = 0
  const report = (done: number) => {
    shown = Math.max(shown, Math.min(done, total))
    onProgress?.(shown, total)
  }
  report(0)

  let fromServer = new Map<string, EngineResult>()
  if (remote) {
    const asked = game.positions.filter((position) => !position.terminal).map((position) => position.fen)
    const counts = new Map<string, number>()
    for (const fen of asked) counts.set(fen, (counts.get(fen) ?? 0) + 1)
    let done = total - asked.length
    fromServer = await remote(asked, depth, {
      signal,
      onResult: (fen) => {
        done += counts.get(fen) ?? 1
        report(done)
      },
    })
    if (signal?.aborted) throw new EngineAbortError()
  }
  for (const position of game.positions) {
    if (signal?.aborted) throw new EngineAbortError()
    if (position.terminal) {
      positions.push({ ...position, eval: terminalEval(position.terminal, position.fen), bestUci: null, pvUci: [] })
    } else {
      const remoteResult = fromServer.get(position.fen)
      const result = remoteResult ?? (await engine.analyze(position.fen, depth, { signal }))
      const index = positions.length
      const move = game.moves[index]
      // O "!" e o Brilhante dependem de saber o que a segunda melhor linha daria. Só vale buscar quando o lance
      // jogado foi o primeiro do motor, fora do livro e numa posição que não esteja perdida.
      const worthSecond = move && move.uci === result.bestUci && !earlyBook[index] && expectedPoints(result.eval, move.color, ratings[move.color] ?? DEFAULT_RATING) > 0.3
      const second = !worthSecond ? null : (remoteResult ?? (await engine.analyze(position.fen, depth, { signal, multiPv: 2 })))
      positions.push({
        ...position,
        eval: result.eval,
        bestUci: result.bestUci,
        pvUci: result.pvUci.slice(0, STORED_PV_LENGTH),
        ...(second?.lines[1] ? { secondEval: second.lines[1].eval } : {}),
      })
    }
    if (!fromServer.has(position.fen)) report(positions.length)
  }

  report(total)

  const { bookMoves, opening } = findBookMoves(book, positions.slice(1).map((position) => position.fen))
  // A base inclui armadilhas, como o mate do louco. Um lance que leva a mate forçado não é teoria a respeitar:
  // o livro termina ali, para o treinador poder avisar do erro.
  const firstMate = positions.slice(1).findIndex((position) => position.eval.kind === 'mate')
  if (firstMate !== -1) bookMoves.fill(false, firstMate)
  const classified = classifyMoves(game.moves, positions, bookMoves, ratings)
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
    ratings,
    classVersion: CLASS_VERSION,
    engine: remote && positions.every((position) => position.terminal || fromServer.has(position.fen)) ? 'servidor' : 'aparelho',
    opening,
    clock: computeClock(game.moves, game.moves.map((move) => move.clock), game.timeControl),
  }
}
