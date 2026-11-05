import { Chess, type PieceSymbol, type Square } from 'chess.js'
import type { Color, Eval } from './evaluation'
import { uciParts } from './notation'

const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Quanto material precisa ficar para trás, já descontado o que o lance capturou. */
const MIN_SACRIFICE = 2
/** Lance brilhante perde no máximo o mesmo que um lance excelente. */
const MAX_LOSS = 2
/** Depois de entregar a peça, quem jogou não pode estar pior. */
const MIN_WIN_AFTER = 50
/** Com a partida já ganha, entregar material não prova nada, a não ser que seja para dar mate. */
const ALREADY_WON = 97

/** O ganho de quem joga agora ao trocar peças nessa casa, sempre capturando com a peça mais barata. */
function exchangeGain(chess: Chess, square: Square): number {
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

export interface Sacrifice {
  piece: PieceSymbol
  square: Square
  /** Material entregue, já descontado o que o lance capturou. */
  value: number
}

/** O material que o lance entrega de verdade. Nulo em troca normal, lance forçado ou mate. */
export function sacrificeOf(fen: string, uci: string): Sacrifice | null {
  try {
    const chess = new Chess(fen)
    if (chess.moves().length <= 1) return null
    const side = chess.turn()
    const move = chess.move(uciParts(uci))
    if (chess.isGameOver()) return null
    const hanging = mostHanging(chess, side)
    if (!hanging) return null
    const captured = move.captured ? VALUES[move.captured] : 0
    const value = hanging.value - captured - hangingBefore(fen, side)
    return value >= MIN_SACRIFICE ? { piece: hanging.piece, square: hanging.square, value } : null
  } catch {
    return null
  }
}

export interface BrilliantInput {
  fen: string
  uci: string
  color: Color
  loss: number
  winBefore: number
  winAfter: number
  evalBefore: Eval
}

/** Brilhante: entrega material de verdade, é o melhor lance ou quase, e a posição continua boa. */
export function isBrilliant({ fen, uci, color, loss, winBefore, winAfter, evalBefore }: BrilliantInput): boolean {
  if (loss >= MAX_LOSS || winAfter < MIN_WIN_AFTER) return false
  const forcedMate = evalBefore.kind === 'mate' && evalBefore.winner === color
  if (winBefore >= ALREADY_WON && !forcedMate) return false
  return sacrificeOf(fen, uci) !== null
}
