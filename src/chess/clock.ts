import type { MoveClass } from './classify'
import type { Color } from './evaluation'

export interface TimeControl {
  base: number
  increment: number
}

/** "600+5" = 10 min com 5 s; "180" = sem incremento. Partidas daily e formatos estranhos: null. */
export function parseTimeControl(text: string): TimeControl | null {
  const match = text.trim().match(/^(\d+)(?:\+(\d+(?:\.\d+)?))?$/)
  if (!match) return null
  const base = Number(match[1])
  if (base <= 0) return null
  return { base, increment: match[2] ? Number(match[2]) : 0 }
}

/** Lê o [%clk h:mm:ss.s] de um comentário, em segundos. */
export function parseClock(comment: string): number | null {
  const match = comment.match(/\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/** Dados do relógio de cada lance. null: a partida não tem relógio utilizável. */
export interface ClockData {
  control: TimeControl
  /** Relógio depois de cada lance, em segundos. */
  remaining: (number | null)[]
  /** Tempo gasto em cada lance, em segundos. */
  spent: (number | null)[]
}

interface ClockMove {
  color: Color
}

/** Tempo gasto = relógio anterior do mesmo jogador − relógio atual + incremento. */
export function computeClock(moves: ClockMove[], clocks: (number | null | undefined)[], timeControl: string): ClockData | null {
  const control = parseTimeControl(timeControl)
  if (!control) return null
  if (!clocks.some((clock) => clock !== null && clock !== undefined)) return null

  const last: Record<Color, number> = { w: control.base, b: control.base }
  const remaining: (number | null)[] = []
  const spent: (number | null)[] = []
  moves.forEach((move, index) => {
    const clock = clocks[index]
    if (clock === null || clock === undefined) {
      remaining.push(null)
      spent.push(null)
      return
    }
    remaining.push(clock)
    spent.push(Math.max(0, last[move.color] - clock + control.increment))
    last[move.color] = clock
  })
  return { control, remaining, spent }
}

/** 12 → "12s"; 75 → "1:15"; 3700 → "1:01:40". Abaixo de 20 s, com décimos. */
export function formatClock(seconds: number): string {
  if (seconds < 20) return `${seconds.toFixed(1).replace('.', ',')}s`
  const whole = Math.round(seconds)
  if (whole < 60) return `${whole}s`
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = String(whole % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

/** Relógio de cada jogador em dada posição (0 = antes do primeiro lance). */
export function clocksAt(data: ClockData, moves: ClockMove[], ply: number): Record<Color, number> {
  const result: Record<Color, number> = { w: data.control.base, b: data.control.base }
  for (let index = 0; index < ply && index < moves.length; index += 1) {
    const value = data.remaining[index]
    if (value !== null) result[moves[index].color] = value
  }
  return result
}

export interface InsightMove {
  color: Color
  moveNumber: number
  cls: MoveClass
  /** Quanto o lance mudou a chance de vitória, para qualquer lado. */
  swing: number
}

/** Quanto a chance de vitória se mexeu em torno do lance: o dele ou o erro que ele podia punir. */
export function swingOf(wins: number[], index: number): number {
  const own = Math.abs(wins[index + 1] - wins[index])
  const previous = index > 0 ? Math.abs(wins[index] - wins[index - 1]) : 0
  return Math.max(own, previous)
}

const LOW_TIME = 30
const SERIOUS: MoveClass[] = ['mistake', 'blunder', 'miss']
const isSerious = (move: InsightMove) => SERIOUS.includes(move.cls)
const isTracked = (move: InsightMove) => move.cls !== 'book'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

interface Voice {
  /** "dos seus", "das brancas" */
  of: string
  /** "Você gastou", "As brancas gastaram" */
  spent: string
  /** "Seus 5 lances", "Os 5 lances das brancas" */
  moves: (count: number) => string
  ended: string
  could: string
}

const VOICES: Record<'you' | Color, Voice> = {
  you: { of: 'dos seus', spent: 'Você gastou', moves: (n) => `Seus ${n} lances`, ended: 'Você terminou', could: 'dava pra pensar mais' },
  w: { of: 'das brancas entre os', spent: 'As brancas gastaram', moves: (n) => `Os ${n} lances das brancas`, ended: 'As brancas terminaram', could: 'dava pra pensar mais' },
  b: { of: 'das pretas entre os', spent: 'As pretas gastaram', moves: (n) => `Os ${n} lances das pretas`, ended: 'As pretas terminaram', could: 'dava pra pensar mais' },
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

/**
 * Frases do card "Você e o relógio". Cada regra só fala quando os dados sustentam:
 * nenhuma frase é melhor que uma frase forçada.
 */
export function clockInsights(moves: InsightMove[], data: ClockData, color: Color, isUser: boolean): string[] {
  const voice = VOICES[isUser ? 'you' : color]
  const own = moves.map((move, index) => ({ ...move, index })).filter((move) => move.color === color && isTracked(move) && data.spent[move.index] !== null && data.remaining[move.index] !== null)
  if (own.length < 4) return []
  const spentOf = (move: (typeof own)[number]) => data.spent[move.index]!
  const remainingOf = (move: (typeof own)[number]) => data.remaining[move.index]!
  const typical = median(own.map(spentOf))
  const sentences: string[] = []

  // 1. Erros graves com pouco tempo.
  const blunders = own.filter((move) => move.cls === 'blunder')
  const hurried = blunders.filter((move) => remainingOf(move) < LOW_TIME)
  if (hurried.length > 0 && hurried.length * 2 >= blunders.length) {
    const side = color === 'w' ? 'brancas' : 'pretas'
    const limit = `com menos de ${LOW_TIME} segundos no relógio.`
    if (blunders.length === 1) {
      sentences.push(`${isUser ? 'Seu erro grosseiro' : `O erro grosseiro das ${side}`} foi ${limit}`)
    } else if (hurried.length === blunders.length) {
      sentences.push(`${isUser ? `Seus ${blunders.length} erros graves` : `Os ${blunders.length} erros graves das ${side}`} foram ${limit}`)
    } else {
      sentences.push(`${hurried.length} ${isUser ? `dos seus ${blunders.length} erros graves` : `dos ${blunders.length} erros graves das ${side}`} ${plural(hurried.length, 'foi', 'foram')} ${limit}`)
    }
  }

  // 2. Pensou muito e mesmo assim errou. Só vale se foi muito acima do normal dessa pessoa.
  const longThink = Math.max(30, data.control.base * 0.08, typical * 3)
  const thoughtHard = own.filter((move) => isSerious(move) && spentOf(move) >= longThink).sort((a, b) => spentOf(b) - spentOf(a))[0]
  if (thoughtHard) {
    sentences.push(`${voice.spent} ${formatClock(spentOf(thoughtHard))} no lance ${thoughtHard.moveNumber} e mesmo assim ${isUser ? 'errou' : 'erraram'}: posição difícil, vale revisar.`)
  }

  // 3. Rapidez em posições críticas: entre as mais rápidas, houve erros?
  const critical = own.filter((move) => move.swing >= 10 && spentOf(move) <= typical).sort((a, b) => spentOf(a) - spentOf(b)).slice(0, 5)
  const criticalErrors = critical.filter(isSerious).length
  if (critical.length >= 3 && criticalErrors >= 1) {
    sentences.push(`${voice.moves(critical.length)} mais rápidos em posições críticas (a avaliação mudou muito) tiveram ${criticalErrors} ${plural(criticalErrors, 'erro', 'erros')}.`)
  }

  // 4. Sobrou tempo e os erros vieram apressados: qual trecho mais pedia atenção?
  const final = remainingOf(own[own.length - 1])
  if (final >= Math.max(60, data.control.base * 0.25)) {
    const rushed = own.filter((move) => isSerious(move) && spentOf(move) <= Math.max(typical, 5))
    if (rushed.length > 0) {
      const window = bestWindow(rushed.map((move) => move.moveNumber))
      const where = window.first === window.last ? `no lance ${window.first}` : `nos lances ${window.first} a ${window.last}`
      sentences.push(`${voice.ended} com ${formatClock(final)} sobrando: ${voice.could} ${where}.`)
    }
  }

  return sentences
}

/** O trecho curto (até 5 lances) com mais erros. */
function bestWindow(numbers: number[]): { first: number; last: number } {
  let best = { first: numbers[0], last: numbers[0], count: 1 }
  for (const first of numbers) {
    const inside = numbers.filter((number) => number >= first && number < first + 5)
    if (inside.length > best.count) best = { first, last: inside[inside.length - 1], count: inside.length }
  }
  return { first: best.first, last: best.last }
}
