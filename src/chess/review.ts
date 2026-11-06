import type { AnalyzedMove, AnalyzedPosition } from './analyze'
import { type SideSummary, isTopClass } from './classify'
import { type ClockData, clockInsights, swingOf } from './clock'
import { type Color, type Eval, whiteWinPercent } from './evaluation'
import { sanToPt } from './notation'

export type MomentKind = 'brilliant' | 'great' | 'missed-mate' | 'allowed-mate' | 'blunder' | 'miss' | 'mistake' | 'inaccuracy' | 'opponent-error' | 'punished'

export interface KeyMoment {
  ply: number
  kind: MomentKind
  title: string
  /** Frase curta que situa o momento na partida. */
  note: string | null
  importance: number
  isTurningPoint: boolean
}

interface ReviewInput {
  moves: AnalyzedMove[]
  positions: AnalyzedPosition[]
}

/** Paradas demais viram tortura; de menos, perdem o ponto. */
const MAX_MOMENTS = 7
const MIN_MOMENTS = 3
const TURNING_POINT_LOSS = 15
const OPPONENT_ERROR_LOSS = 20
const PUNISHABLE_LOSS = 15
const PUNISHED_LOSS = 2
const ALLOWED_MATE_LOSS = 5

const mateFor = (evaluation: Eval, color: Color) => evaluation.kind === 'mate' && evaluation.winner === color && evaluation.moves > 0
const moveName = (move: Pick<AnalyzedMove, 'moveNumber' | 'color' | 'san'>) => `${move.moveNumber}${move.color === 'w' ? '.' : '...'} ${sanToPt(move.san)}`
const percent = (value: number) => `${Math.round(value)}%`
const side = (color: Color) => (color === 'w' ? 'brancas' : 'pretas')

/** O lance que mais custou na partida, se algum realmente mudou o rumo dela. */
export function turningPoint(moves: AnalyzedMove[]): AnalyzedMove | null {
  const judged = moves.filter((move) => move.cls !== 'book')
  if (judged.length === 0) return null
  const worst = judged.reduce((a, b) => (b.loss > a.loss ? b : a))
  return worst.loss >= TURNING_POINT_LOSS ? worst : null
}

/** Os pontos em que vale parar: os erros da pessoa pesam mais que os do adversário. */
export function findKeyMoments({ moves, positions }: ReviewInput, userColor: Color | null): KeyMoment[] {
  const turning = turningPoint(moves)
  const found: KeyMoment[] = []
  const minor: KeyMoment[] = []

  moves.forEach((move, index) => {
    if (move.cls === 'book') return
    const before = positions[index]
    const after = positions[index + 1]
    const mine = userColor === null || move.color === userColor
    const opponent: Color = move.color === 'w' ? 'b' : 'w'
    const isTurningPoint = turning?.ply === move.ply
    const base = { ply: move.ply, isTurningPoint }
    const weight = mine ? 20 : 0

    if (move.cls === 'brilliant') {
      found.push({ ...base, kind: 'brilliant', title: 'Lance brilhante', note: null, importance: mine ? 120 : 45 })
      return
    }

    if (move.cls === 'great') {
      found.push({ ...base, kind: 'great', title: 'Ótimo lance', note: 'Era o lance que decidia, e os outros ficavam bem atrás.', importance: mine ? 70 : 25 })
      return
    }

    if (mateFor(before.eval, move.color) && !mateFor(after.eval, move.color) && !isTopClass(move.cls)) {
      found.push({ ...base, kind: 'missed-mate', title: 'Mate perdido', note: null, importance: 90 + weight })
      return
    }
    // Numa posição já perdida, o mate custa pouco e não ensina nada: não vale a parada.
    if (mateFor(after.eval, opponent) && !mateFor(before.eval, opponent) && move.loss >= ALLOWED_MATE_LOSS) {
      found.push({ ...base, kind: 'allowed-mate', title: 'Mate permitido', note: null, importance: 85 + weight })
      return
    }

    if (mine && (move.cls === 'blunder' || move.cls === 'miss' || move.cls === 'mistake')) {
      const titles = { blunder: 'Erro grosseiro', miss: 'Chance perdida', mistake: 'Erro' }
      found.push({ ...base, kind: move.cls, title: titles[move.cls], note: null, importance: move.loss + weight })
      return
    }

    if (!mine && move.loss >= OPPONENT_ERROR_LOSS) {
      found.push({
        ...base,
        kind: 'opponent-error',
        title: 'O adversário errou',
        note: `Este lance deu ${percent(move.loss)} de chance de vitória para você.`,
        importance: move.loss * 0.6,
      })
      return
    }

    const previous = moves[index - 1]
    if (mine && previous && previous.color !== move.color && previous.loss >= PUNISHABLE_LOSS && move.loss < PUNISHED_LOSS && !after.terminal) {
      found.push({
        ...base,
        kind: 'punished',
        title: userColor ? 'Você puniu o erro' : 'Erro punido',
        note: `O adversário errou em ${moveName(previous)} e este lance aproveitou.`,
        importance: 12 + previous.loss * 0.3,
      })
      return
    }

    if (mine && move.cls === 'inaccuracy') {
      minor.push({ ...base, kind: 'inaccuracy', title: 'Imprecisão', note: null, importance: move.loss })
    }
  })

  // Em partida limpa, as imprecisões são o que há de mais útil para rever.
  const missing = MIN_MOMENTS - found.length
  const extra = missing > 0 ? [...minor].sort((a, b) => b.importance - a.importance).slice(0, missing) : []

  return [...found, ...extra]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, MAX_MOMENTS)
    .sort((a, b) => a.ply - b.ply)
}

interface PhaseStat {
  name: string
  accuracy: number
}

/** Abertura até o lance 10; final com pouco material além dos peões; o resto é meio-jogo. */
function phaseOf(move: AnalyzedMove, fenBefore: string): 'abertura' | 'meio-jogo' | 'final' {
  const values: Record<string, number> = { q: 9, r: 5, b: 3, n: 3 }
  let material = 0
  for (const char of fenBefore.split(' ')[0]) material += values[char.toLowerCase()] ?? 0
  if (material <= 14) return 'final'
  return move.moveNumber <= 10 ? 'abertura' : 'meio-jogo'
}

function phaseStats({ moves, positions }: ReviewInput, color: Color): PhaseStat[] {
  const groups = new Map<string, number[]>()
  moves.forEach((move, index) => {
    if (move.color !== color || move.cls === 'book') return
    const name = phaseOf(move, positions[index].fen)
    groups.set(name, [...(groups.get(name) ?? []), move.accuracy])
  })
  return [...groups.entries()]
    .filter(([, values]) => values.length >= 3)
    .map(([name, values]) => ({ name, accuracy: values.reduce((a, b) => a + b, 0) / values.length }))
}

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

function errorParts(summary: SideSummary): string[] {
  const { blunder, mistake, miss } = summary.counts
  const parts: string[] = []
  if (blunder) parts.push(`${blunder} ${blunder === 1 ? 'erro grosseiro' : 'erros grosseiros'}`)
  if (mistake) parts.push(`${mistake} ${mistake === 1 ? 'erro' : 'erros'}`)
  if (miss) parts.push(`${miss} ${miss === 1 ? 'chance perdida' : 'chances perdidas'}`)
  return parts
}

export interface InsightInput extends ReviewInput {
  summary: Record<Color, SideSummary>
  clock?: ClockData | null
}

const MAX_INSIGHTS = 5

/** As conclusões da partida. Cada uma só aparece quando os dados sustentam. */
export function gameInsights(analysis: InsightInput, userColor: Color | null): string[] {
  const { moves, positions, summary, clock } = analysis
  const insights: string[] = []
  const format = (value: number) => `${value.toFixed(1).replace('.', ',')}%`

  // 1. Precisão
  const { w, b } = summary
  if (userColor) {
    const mine = summary[userColor].accuracy
    const theirs = summary[userColor === 'w' ? 'b' : 'w'].accuracy
    if (mine !== null && theirs !== null) insights.push(`Sua precisão foi de ${format(mine)}, contra ${format(theirs)} do adversário.`)
    else if (mine !== null) insights.push(`Sua precisão foi de ${format(mine)}.`)
  } else if (w.accuracy !== null && b.accuracy !== null) {
    insights.push(`Precisão de ${format(w.accuracy)} das brancas e ${format(b.accuracy)} das pretas.`)
  }

  // 2. Erros
  if (userColor) {
    const parts = errorParts(summary[userColor])
    const own = moves.filter((move) => move.color === userColor && move.cls !== 'book')
    if (parts.length > 0) insights.push(`Você teve ${list(parts)}.`)
    else if (own.length >= 6) insights.push('Você não cometeu nenhum erro sério. Muito bom.')

    const { brilliant = 0, great = 0, excellent = 0 } = summary[userColor].counts
    if (brilliant > 0) insights.unshift(brilliant === 1 ? 'Você achou um lance brilhante nesta partida!' : `Você achou ${brilliant} lances brilhantes nesta partida!`)
    if (great > 0) insights.push(great === 1 ? 'Você achou 1 lance ótimo, daqueles que decidem.' : `Você achou ${great} lances ótimos, daqueles que decidem.`)
    if (excellent > 0) insights.push(excellent === 1 ? 'Você teve 1 lance excelente.' : `Você teve ${excellent} lances excelentes.`)
  }

  // 3. Mate perdido
  const missedMate = moves.find((move, index) => !isTopClass(move.cls) && (!userColor || move.color === userColor) && mateFor(positions[index].eval, move.color) && !mateFor(positions[index + 1].eval, move.color))
  if (missedMate) {
    const evaluation = positions[missedMate.ply - 1].eval
    if (evaluation.kind === 'mate') {
      insights.push(`${userColor ? 'Você tinha' : `As ${side(missedMate.color)} tinham`} mate em ${evaluation.moves} no lance ${missedMate.moveNumber} e o lance jogado deixou passar.`)
    }
  }

  // 5. Erros do adversário aproveitados
  if (userColor) {
    const gifts = moves.filter((move) => move.color !== userColor && move.cls !== 'book' && move.loss >= OPPONENT_ERROR_LOSS)
    if (gifts.length > 0) {
      const used = gifts.filter((move) => {
        const reply = moves[move.ply]
        return reply !== undefined && reply.loss < 5
      }).length
      insights.push(
        gifts.length === 1
          ? used === 1
            ? 'O adversário cometeu um erro grosseiro e você aproveitou.'
            : 'O adversário cometeu um erro grosseiro e você não aproveitou.'
          : `O adversário cometeu ${gifts.length} erros graves e você aproveitou ${used}.`,
      )
    }
  }

  // 6. Melhor e pior fase
  if (userColor) {
    const phases = phaseStats(analysis, userColor).sort((x, y) => y.accuracy - x.accuracy)
    if (phases.length >= 2) {
      const best = phases[0]
      const worst = phases[phases.length - 1]
      if (best.accuracy - worst.accuracy >= 8) {
        insights.push(`Sua melhor fase foi ${best.name === 'meio-jogo' ? 'o meio-jogo' : best.name === 'final' ? 'o final' : 'a abertura'} (${Math.round(best.accuracy)}%); a mais difícil, ${worst.name === 'meio-jogo' ? 'o meio-jogo' : worst.name === 'final' ? 'o final' : 'a abertura'} (${Math.round(worst.accuracy)}%).`)
      }
    }
  }

  // 7. Relógio
  if (clock && userColor) {
    const wins = positions.map((position) => whiteWinPercent(position.eval))
    const clockMoves = moves.map((move, index) => ({ color: move.color, moveNumber: move.moveNumber, cls: move.cls, swing: swingOf(wins, index) }))
    const [first] = clockInsights(clockMoves, clock, userColor, true)
    if (first) insights.push(first)
  }

  return insights.slice(0, MAX_INSIGHTS)
}

export const REVIEW_SPEEDS = [
  { id: '1x', label: '1×', ms: 1000 },
  { id: '2x', label: '2×', ms: 550 },
  { id: '4x', label: '4×', ms: 280 },
  { id: '8x', label: '8×', ms: 130 },
] as const

export type ReviewSpeedId = (typeof REVIEW_SPEEDS)[number]['id']

/** Teoria passa mais rápido; antes de um momento-chave, uma pausa pequena para a pessoa se situar. */
export function stepDelay(speed: ReviewSpeedId, nextIsBook: boolean, nextIsMoment: boolean): number {
  const base = REVIEW_SPEEDS.find((item) => item.id === speed)?.ms ?? 550
  if (nextIsMoment) return base * 1.5
  return nextIsBook ? base * 0.5 : base
}
