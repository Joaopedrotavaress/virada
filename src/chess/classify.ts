import { Chess } from 'chess.js'
import { VALUES, exchangeGain, isBrilliant } from './brilliant'
import { type Color, type Eval, winPercentFor } from './evaluation'
import { DEFAULT_RATING, expectedPoints, isWinning, standingOf } from './expectedPoints'
import { uciParts } from './notation'
import type { GameMove } from './pgn'

/** Os nomes seguem o Chess.com em português: lá, "Great" (!) é Excelente e "Excellent" (polegar) é Ótimo. */
export type MoveClass = 'brilliant' | 'great' | 'book' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'miss'

export const MOVE_CLASSES: MoveClass[] = ['brilliant', 'great', 'book', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder']

export const CLASS_INFO: Record<MoveClass, { label: string; symbol: string }> = {
  brilliant: { label: 'Brilhante', symbol: '!!' },
  great: { label: 'Excelente', symbol: '!' },
  book: { label: 'Livro', symbol: '' },
  best: { label: 'Melhor', symbol: '★' },
  excellent: { label: 'Ótimo', symbol: '' },
  good: { label: 'Bom', symbol: '✓' },
  inaccuracy: { label: 'Imprecisão', symbol: '?!' },
  mistake: { label: 'Erro', symbol: '?' },
  blunder: { label: 'Erro grosseiro', symbol: '??' },
  miss: { label: 'Chance perdida', symbol: '✕' },
}

/** Categorias que recebem um ponto no gráfico de avaliação. */
export const isErrorClass = (cls: MoveClass) => cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder' || cls === 'miss'

/** Lances que merecem festa: achar é o que importa neles. */
export const isSpecialClass = (cls: MoveClass) => cls === 'brilliant' || cls === 'great'

/** Melhor, "!" ou Brilhante: não há seta de "o melhor era" para mostrar. */
export const isTopClass = (cls: MoveClass) => cls === 'best' || isSpecialClass(cls)

/**
 * Sobe sempre que as regras mudam: a análise guardada com outra versão é reclassificada ao abrir,
 * com as avaliações que já tem, sem chamar o motor de novo.
 */
export const CLASS_VERSION = 4

export interface PositionEval {
  eval: Eval
  bestUci: string | null
  /** A avaliação da segunda melhor linha, medida quando o lance jogado foi o primeiro do motor. */
  secondEval?: Eval
}

export interface ClassifiedMove {
  winBefore: number
  winAfter: number
  loss: number
  cls: MoveClass
  accuracy: number
  /** Pontos esperados perdidos, de 0 a 1. Ausente em análises antigas. */
  pointsLost?: number
}

/**
 * A precisão foi ajustada à oficial do Chess.com em 160 partidas públicas revisadas (docs/classificacao.md).
 * A CAPS deles é fechada: isto aproxima o resultado, não reproduz o cálculo.
 */
const ACCURACY_FLOOR = 6
const ACCURACY_DECAY = 0.085
const ACCURACY_MEAN_WEIGHT = 0.7
const HARMONIC_MIN = 5

export function moveAccuracy(loss: number): number {
  return Math.min(100, Math.max(0, (100 - ACCURACY_FLOOR) * Math.exp(-ACCURACY_DECAY * loss) + ACCURACY_FLOOR))
}

/** Média comum misturada com a harmônica: um erro grande pesa mais do que numa média simples, como lá. */
export function gameAccuracy(accuracies: number[]): number | null {
  if (accuracies.length === 0) return null
  const mean = accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length
  const harmonic = accuracies.length / accuracies.reduce((sum, value) => sum + 1 / Math.max(value, HARMONIC_MIN), 0)
  return ACCURACY_MEAN_WEIGHT * mean + (1 - ACCURACY_MEAN_WEIGHT) * harmonic
}

/** A tabela pública do Chess.com, em pontos esperados perdidos. Melhor é só o primeiro lance do motor, sem faixa de perda. */
const EXCELLENT = 0.02
const GOOD = 0.05
const INACCURACY = 0.1
const MISTAKE = 0.2

export function classifyPointsLost(pointsLost: number): MoveClass {
  if (pointsLost < EXCELLENT) return 'excellent'
  if (pointsLost < GOOD) return 'good'
  if (pointsLost < INACCURACY) return 'inaccuracy'
  if (pointsLost < MISTAKE) return 'mistake'
  return 'blunder'
}

export interface GradedMove {
  winBefore: number
  winAfter: number
  loss: number
  isBest: boolean
  accuracy: number
  pointsLost: number
}

/** Mede um lance comparando as avaliações antes e depois, do ponto de vista de quem jogou. */
export function gradeMove(uci: string, color: Color, before: PositionEval, after: Pick<PositionEval, 'eval'>, rating: number = DEFAULT_RATING): GradedMove {
  const winBefore = winPercentFor(before.eval, color)
  const winAfter = winPercentFor(after.eval, color)
  const isBest = before.bestUci === uci
  // As duas buscas têm horizontes diferentes. Jogar o lance do motor não pode custar precisão:
  // sem isso, o ruído viraria perda e até um falso "o adversário errou" para o lance seguinte.
  const loss = isBest ? 0 : Math.max(0, winBefore - winAfter)
  const pointsLost = isBest ? 0 : Math.max(0, expectedPoints(before.eval, color, rating) - expectedPoints(after.eval, color, rating))
  return { winBefore, winAfter, loss, isBest, accuracy: moveAccuracy(loss), pointsLost }
}

type MateEval = Extract<Eval, { kind: 'mate' }>

/** Em mate contra mate os pontos não mudam: o que conta é quantos lances a mais ou a menos ele levou. */
function classOfMateDistance(extra: number): MoveClass {
  if (extra <= 0) return 'best'
  if (extra === 1) return 'excellent'
  return extra <= 5 ? 'good' : 'inaccuracy'
}

/** Entregar um mate é sempre digno de nota, mesmo numa posição em que já quase não havia ponto a perder. */
function classOfMateAllowed(after: MateEval, base: MoveClass, wasMated: MateEval | null): MoveClass {
  if (wasMated) return classOfMateDistance(wasMated.moves - 1 - after.moves)
  if (base === 'blunder' || base === 'mistake') return base
  return after.moves <= 3 ? 'mistake' : 'inaccuracy'
}

/** A classe só pelo tamanho da perda, com os casos de mate. */
function baseClass(color: Color, before: Eval, after: Eval, graded: GradedMove): MoveClass {
  if (graded.isBest) return 'best'
  const base = classifyPointsLost(graded.pointsLost)
  if (after.kind !== 'mate' || after.moves === 0) return base
  if (after.winner === color) return before.kind === 'mate' && before.winner === color ? classOfMateDistance(after.moves - (before.moves - 1)) : base
  return classOfMateAllowed(after, base, before.kind === 'mate' && before.winner !== color ? before : null)
}

/** Quanto a segunda melhor linha precisa ficar atrás para o lance ser decisivo. Com rating baixo, é mais generoso. */
const GREAT_GAP_LOW = 0.045
const GREAT_GAP_MID = 0.08
const GREAT_GAP_HIGH = 0.12
/** Abaixo deste rating, pegar a peça que decide a partida também conta: quem está começando pode não ver. */
const OBVIOUS_CAPTURES_COUNT_BELOW = 1200
/** Com a alternativa já ganhando com folga, achar o lance não decide nada. */
const SECOND_ALREADY_WON = 0.9
/** Melhor lance de uma posição que continua perdida não salva ninguém. */
const STILL_LOST = 0.3

export function greatGapFor(rating: number): number {
  if (rating <= 1000) return GREAT_GAP_LOW
  if (rating <= 1500) return GREAT_GAP_LOW + ((GREAT_GAP_MID - GREAT_GAP_LOW) * (rating - 1000)) / 500
  if (rating >= 2200) return GREAT_GAP_HIGH
  return GREAT_GAP_MID + ((GREAT_GAP_HIGH - GREAT_GAP_MID) * (rating - 1500)) / 700
}

/** Sem mudar de estado, a diferença precisa ser maior: é o caso do "único lance bom". Com rating baixo, não há essa exigência. */
function onlyMoveFactor(rating: number): number {
  if (rating <= 1000) return 1
  return rating >= 1800 ? 2 : 1 + (rating - 1000) / 800
}

export interface GreatInput {
  fen: string
  uci: string
  color: Color
  evalBefore: Eval
  evalAfter: Eval
  secondEval?: Eval
  rating?: number
  /** O adversário acabou de mexer nessa casa: pegar a peça dele é a resposta que qualquer um vê. */
  lastMoveTo?: string
}

/**
 * O "!" (Great): decisivo para o resultado. O Chess.com cita três casos: de perdido para igual, de igual para ganho,
 * ou o único lance bom. Aqui isso é medido contra a segunda melhor linha.
 */
export function isGreat({ fen, uci, color, evalBefore, evalAfter, secondEval, rating = DEFAULT_RATING, lastMoveTo }: GreatInput): boolean {
  if (!secondEval) return false
  const generous = rating < OBVIOUS_CAPTURES_COUNT_BELOW
  if (!generous && uci.slice(2, 4) === lastMoveTo) return false
  const points = expectedPoints(evalBefore, color, rating)
  const second = expectedPoints(secondEval, color, rating)
  const gap = points - second
  const needed = greatGapFor(rating)
  if (gap < needed || second >= SECOND_ALREADY_WON) return false
  if (expectedPoints(evalAfter, color, rating) <= STILL_LOST) return false
  if (standingOf(points) === standingOf(second) && gap < needed * onlyMoveFactor(rating)) return false
  try {
    const chess = new Chess(fen)
    const legal = chess.moves().length
    // Com uma ou duas saídas do xeque, achar o lance é quase obrigação.
    if (legal <= 1 || (chess.inCheck() && legal <= 2)) return false
    const gainOf = (square: Parameters<typeof exchangeGain>[1]) => exchangeGain(new Chess(fen), square)
    const move = chess.move(uciParts(uci))
    if (chess.isCheckmate() || move.promotion === 'q') return false
    // Pegar o que ficou solto ou trocar peças também decide a partida, mas o jogador experiente vê.
    // Para ele, só conta a captura em que se entrega mais do que se leva.
    return generous || !move.captured || (gainOf(move.to) === 0 && VALUES[move.piece] > VALUES[move.captured])
  } catch {
    return false
  }
}

/** O erro do adversário precisa ser de verdade, e o lance jogado também, para valer como chance perdida. */
const PUNISHABLE = INACCURACY
const MISS_MIN_LOST = INACCURACY

/**
 * Chance perdida: o adversário acabou de errar, havia posição ganha na mesa e o lance jogado a deixou passar.
 * É a definição pública do Chess.com, que acrescenta: em geral, a pessoa termina igual ou pior.
 */
function isMiss(previousLost: number, pointsBefore: number, pointsAfter: number, pointsLost: number): boolean {
  return previousLost >= PUNISHABLE && pointsLost >= MISS_MIN_LOST && isWinning(pointsBefore) && !isWinning(pointsAfter)
}

export interface PlayedContext {
  fen: string
  uci: string
  color: Color
  evalBefore: Eval
  evalAfter?: Eval
  secondEval?: Eval
  rating?: number
  lastMoveTo?: string
}

/** Classificação de um lance testado fora da partida (sem o contexto do lance anterior). */
export function classOf(graded: GradedMove, played?: PlayedContext): MoveClass {
  if (!played) return graded.isBest ? 'best' : classifyPointsLost(graded.pointsLost)
  const { fen, uci, color, evalBefore, secondEval, rating, lastMoveTo } = played
  const evalAfter = played.evalAfter ?? evalBefore
  if (isBrilliant({ fen, uci, color, pointsLost: graded.pointsLost, evalBefore, evalAfter, secondEval, isBest: graded.isBest, rating })) return 'brilliant'
  if (graded.isBest && isGreat({ fen, uci, color, evalBefore, evalAfter, secondEval, rating, lastMoveTo })) return 'great'
  return baseClass(color, evalBefore, evalAfter, graded)
}

const hasOneLegalMove = (fen: string | undefined) => {
  if (!fen) return false
  try {
    return new Chess(fen).moves().length === 1
  } catch {
    return false
  }
}

export interface Ratings {
  w?: number | null
  b?: number | null
}

/** positions tem moves.length + 1 itens: positions[i] é a posição antes de moves[i]. */
export function classifyMoves(moves: Pick<GameMove, 'uci' | 'color'>[], positions: (PositionEval & { fen?: string })[], bookMoves: boolean[] = [], ratings: Ratings = {}): ClassifiedMove[] {
  const classified: ClassifiedMove[] = []
  moves.forEach((move, index) => {
    const before = positions[index]
    const after = positions[index + 1]
    const rating = ratings[move.color] ?? DEFAULT_RATING
    const graded = gradeMove(move.uci, move.color, before, after, rating)
    const { winBefore, winAfter, loss, accuracy, pointsLost } = graded
    // Teoria não se julga: um gambito pode "perder" avaliação sem ser erro de ninguém.
    if (bookMoves[index]) {
      classified.push({ winBefore, winAfter, loss: 0, cls: 'book', accuracy: 100, pointsLost: 0 })
      return
    }
    // Sem escolha, não há o que julgar.
    if (hasOneLegalMove(before.fen)) {
      classified.push({ winBefore, winAfter, loss: 0, cls: 'best', accuracy: 100, pointsLost: 0 })
      return
    }

    // Num xeque perpétuo, o mesmo lance se repete: só a primeira vez merece a festa.
    const repeated = moves.slice(0, index).some((other) => other.color === move.color && other.uci === move.uci)

    let cls: MoveClass = before.fen
      ? classOf(graded, { fen: before.fen, uci: move.uci, color: move.color, evalBefore: before.eval, evalAfter: after.eval, secondEval: repeated ? undefined : before.secondEval, rating, lastMoveTo: index > 0 ? moves[index - 1].uci.slice(2, 4) : undefined })
      : baseClass(move.color, before.eval, after.eval, graded)

    const previousLost = index > 0 ? (classified[index - 1].pointsLost ?? 0) : 0
    if (!graded.isBest && isMiss(previousLost, expectedPoints(before.eval, move.color, rating), expectedPoints(after.eval, move.color, rating), pointsLost)) cls = 'miss'

    classified.push({ winBefore, winAfter, loss, cls, accuracy, pointsLost })
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
    const accuracy = gameAccuracy(judged.map((move) => move.accuracy))
    return { accuracy, counts }
  }
  return { w: side('w'), b: side('b') }
}
