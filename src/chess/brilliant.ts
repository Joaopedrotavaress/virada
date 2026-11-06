import { Chess, type PieceSymbol, type Square } from 'chess.js'
import type { Color, Eval } from './evaluation'
import { DEFAULT_RATING, expectedPoints } from './expectedPoints'
import { uciParts } from './notation'

export const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Quanto material precisa ficar para trás, já descontado o que o lance capturou. */
const MIN_SACRIFICE = 2
/** Depois de entregar a peça, quem jogou não pode estar pior. */
const MIN_POINTS_AFTER = 0.5
/** Com outro lance já ganhando com folga, entregar material não prova nada. */
const ALREADY_WON_POINTS = 0.9
/** Até aqui o lance ainda conta como "o melhor ou quase": mais folga para quem tem rating baixo, como o Chess.com faz. */
const NEAR_BEST_LOW = 0.02
const NEAR_BEST_HIGH = 0.01
const LOW_RATING = 1000
const HIGH_RATING = 2000

/** O ganho de quem joga agora ao trocar peças nessa casa, sempre capturando com a peça mais barata. */
export function exchangeGain(chess: Chess, square: Square): number {
  const captures = chess
    .moves({ verbose: true })
    .filter((move) => move.to === square && move.captured && (!move.promotion || move.promotion === 'q'))
    .sort((a, b) => VALUES[a.piece] - VALUES[b.piece])
  const capture = captures[0]
  if (!capture) return 0
  chess.move(capture)
  const reply = exchangeGain(chess, square)
  chess.undo()
  return Math.max(0, VALUES[capture.captured as PieceSymbol] - reply)
}

/** O material que quem joga agora ganha de imediato com a melhor captura. */
export function bestCaptureGain(chess: Chess): number {
  const squares = new Set(
    chess
      .moves({ verbose: true })
      .filter((move) => move.captured)
      .map((move) => move.to),
  )
  let best = 0
  for (const square of squares) best = Math.max(best, exchangeGain(chess, square))
  return best
}

/** A peça que o lado que acabou de jogar perderia, se o adversário a capturasse agora. */
function mostHanging(chess: Chess, side: Color): { value: number; square: Square; piece: PieceSymbol } | null {
  let worst: { value: number; square: Square; piece: PieceSymbol } | null = null
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== side || VALUES[cell.type] < 3) continue
      const value = exchangeGain(chess, cell.square)
      if (value > (worst?.value ?? 0)) worst = { value, square: cell.square, piece: cell.type }
    }
  }
  return worst
}

/** O que já estava pendurado antes do lance. Passa a vez; numa posição em que isso é ilegal, conta zero. */
function hangingBefore(fen: string, side: Color): number {
  try {
    const fields = fen.split(' ')
    fields[1] = side === 'w' ? 'b' : 'w'
    fields[3] = '-'
    return mostHanging(new Chess(fields.join(' ')), side)?.value ?? 0
  } catch {
    return 0
  }
}

/** Se o adversário pega a peça e quem jogou ganha o mesmo de volta noutra casa, foi troca, não sacrifício. */
function paidBackAtOnce(chess: Chess, square: Square, value: number): boolean {
  const capture = chess
    .moves({ verbose: true })
    .filter((move) => move.to === square && move.captured)
    .sort((a, b) => VALUES[a.piece] - VALUES[b.piece])[0]
  if (!capture) return false
  chess.move(capture)
  const back = bestCaptureGain(chess)
  chess.undo()
  return back >= value
}

export interface Sacrifice {
  piece: PieceSymbol
  square: Square
  /** Material entregue, já descontado o que o lance capturou. */
  value: number
}

/** O material que o lance entrega de verdade. Nulo em troca normal, promoção, lance forçado ou mate. */
export function sacrificeOf(fen: string, uci: string): Sacrifice | null {
  try {
    const chess = new Chess(fen)
    if (chess.moves().length <= 1) return null
    const side = chess.turn()
    const move = chess.move(uciParts(uci))
    if (chess.isGameOver() || move.promotion) return null
    const hanging = mostHanging(chess, side)
    if (!hanging) return null
    const captured = move.captured ? VALUES[move.captured] : 0
    const value = hanging.value - captured - hangingBefore(fen, side)
    if (value < MIN_SACRIFICE || paidBackAtOnce(chess, hanging.square, value)) return null
    return { piece: hanging.piece, square: hanging.square, value }
  } catch {
    return null
  }
}

/** A folga de "quase o melhor" em cada rating. */
export function nearBestFor(rating: number): number {
  if (rating <= LOW_RATING) return NEAR_BEST_LOW
  if (rating >= HIGH_RATING) return NEAR_BEST_HIGH
  return NEAR_BEST_LOW + ((NEAR_BEST_HIGH - NEAR_BEST_LOW) * (rating - LOW_RATING)) / (HIGH_RATING - LOW_RATING)
}

export interface BrilliantInput {
  fen: string
  uci: string
  color: Color
  /** Pontos esperados perdidos pelo lance. */
  pointsLost: number
  evalBefore: Eval
  evalAfter: Eval
  /** A segunda melhor linha, quando o lance jogado foi o primeiro do motor. */
  secondEval?: Eval
  /** O lance jogado foi o primeiro do motor. */
  isBest: boolean
  rating?: number
}

/**
 * Brilhante, nas palavras públicas do Chess.com: um bom sacrifício de peça, sendo o melhor lance ou quase,
 * sem deixar a posição ruim e sem que a partida já estivesse ganha com folga de qualquer jeito.
 */
export function isBrilliant({ fen, uci, color, pointsLost, evalBefore, evalAfter, secondEval, isBest, rating = DEFAULT_RATING }: BrilliantInput): boolean {
  if (pointsLost >= nearBestFor(rating)) return false
  if (expectedPoints(evalAfter, color, rating) < MIN_POINTS_AFTER) return false
  // A alternativa é a segunda linha, se o lance foi o primeiro do motor, ou o próprio lance do motor, se não foi.
  const alternative = isBest ? secondEval : evalBefore
  if (alternative) {
    const alternativeMates = alternative.kind === 'mate' && alternative.winner === color
    if (alternativeMates || expectedPoints(alternative, color, rating) >= ALREADY_WON_POINTS) return false
  } else {
    // Análise antiga, sem a segunda linha: só dá para olhar a avaliação da própria posição.
    const forcedMate = evalBefore.kind === 'mate' && evalBefore.winner === color
    if (!forcedMate && expectedPoints(evalBefore, color, rating) >= ALREADY_WON_POINTS) return false
  }
  return sacrificeOf(fen, uci) !== null
}
