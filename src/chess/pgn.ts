import { Chess, DEFAULT_POSITION } from 'chess.js'
import { parseClock } from './clock'
import type { Color } from './evaluation'

export class PgnError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PgnError'
  }
}

export type TerminalState = 'checkmate' | 'stalemate' | 'draw'

export interface GameMove {
  /** Índice 1..N: o lance leva da posição N−1 para a posição N. */
  ply: number
  moveNumber: number
  color: Color
  san: string
  uci: string
  from: string
  to: string
  captured: boolean
  /** Relógio depois do lance, em segundos, quando o PGN traz [%clk]. */
  clock?: number
}

export interface GamePosition {
  fen: string
  /** Quando definido, a avaliação sai direto das regras, sem passar pelo motor. */
  terminal: TerminalState | null
}

export interface ParsedGame {
  headers: Record<string, string>
  white: string
  black: string
  result: string
  date: string
  timeControl: string
  moves: GameMove[]
  /** moves.length + 1 posições: a inicial e uma após cada lance. */
  positions: GamePosition[]
}

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '½-½', '*'])
const NULL_MOVES = new Set(['--', 'Z0', 'null'])

/** Separa os cabeçalhos do início do texto do restante (os lances). */
function splitHeaders(text: string): { headers: Record<string, string>; movetext: string } {
  const headers: Record<string, string> = {}
  const pattern = /^\s*\[\s*(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]/
  // Há programas que não escapam aspas no valor: [Black "Fulano "o Rei" Silva"]. Vale a linha inteira.
  const lenient = /^\s*\[\s*(\w+)\s+"(.*)"\s*\][ \t]*(?=\r?\n|$)/
  let rest = text.replace(/^\uFEFF/, '')
  for (;;) {
    const match = rest.match(pattern) ?? rest.match(lenient)
    if (!match) break
    headers[match[1]] = match[2].replace(/\\(["\\])/g, '$1')
    rest = rest.slice(match[0].length)
  }
  return { headers, movetext: rest }
}

/**
 * Remove comentários {...} e ;..., variações (...) aninhadas e linhas de escape %.
 * O relógio de um comentário da linha principal vira uma marca §n§, para ficar junto do lance.
 */
function stripCommentsAndVariations(movetext: string, clocks: number[]): string {
  let output = ''
  let depth = 0
  let index = 0
  while (index < movetext.length) {
    const char = movetext[index]
    if (char === '{') {
      const end = movetext.indexOf('}', index)
      const clock = depth === 0 ? parseClock(movetext.slice(index, end === -1 ? movetext.length : end)) : null
      index = end === -1 ? movetext.length : end + 1
      if (clock === null) {
        output += ' '
      } else {
        output += ` §${clocks.length}§ `
        clocks.push(clock)
      }
    } else if (char === ';' || (char === '%' && (index === 0 || movetext[index - 1] === '\n'))) {
      const end = movetext.indexOf('\n', index)
      index = end === -1 ? movetext.length : end
    } else if (char === '(') {
      depth += 1
      index += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
      index += 1
      output += ' '
    } else {
      if (depth === 0) output += char
      index += 1
    }
  }
  return output
}

/** Limpa o texto dos lances e devolve os tokens de SAN, até o resultado, com o relógio de cada um. */
export function tokenizeMovesWithClocks(movetext: string): { tokens: string[]; clocks: (number | undefined)[] } {
  const found: number[] = []
  const clean = stripCommentsAndVariations(movetext, found)
    .replace(/\$\d+/g, ' ') // NAGs
    .replace(/\d+\s*[.…]+/g, ' ') // 1. e 1...
    .replace(/[!?]+/g, ' ') // anotações
    .replace(/\be\.p\.?/gi, ' ')

  const tokens: string[] = []
  const clocks: (number | undefined)[] = []
  for (const raw of clean.split(/\s+/)) {
    // "1. ... e5" sobra só os pontos: não é lance.
    if (!raw || /^\d+$/.test(raw) || /^[.…]+$/.test(raw)) continue
    const marker = raw.match(/^§(\d+)§$/)
    if (marker) {
      if (tokens.length > 0) clocks[tokens.length - 1] = found[Number(marker[1])]
      continue
    }
    if (RESULT_TOKENS.has(raw)) break
    tokens.push(raw.replace(/^[0o]-[0o]-[0o]/i, 'O-O-O').replace(/^[0o]-[0o]/i, 'O-O'))
  }
  return { tokens, clocks }
}

export function tokenizeMoves(movetext: string): string[] {
  return tokenizeMovesWithClocks(movetext).tokens
}

export function terminalStateOf(chess: Chess, isLastPosition: boolean): TerminalState | null {
  if (chess.isCheckmate()) return 'checkmate'
  if (chess.isStalemate()) return 'stalemate'
  // Repetição e 50 lances dependem de reivindicação: só valem se a partida acabou ali.
  if (isLastPosition && chess.isDraw()) return 'draw'
  return null
}

function describeMove(moveNumber: number, color: Color, san: string): string {
  return `${moveNumber}${color === 'w' ? '.' : '...'} ${san}`
}

/** "?" e "-" são como o PGN diz "não sei". */
const known = (value: string | undefined) => {
  const text = value?.trim()
  return text && text !== '?' && text !== '-' ? text : ''
}

export function parsePgn(pgn: string): ParsedGame {
  if (!pgn.trim()) throw new PgnError('Cole o PGN da partida para começar.')

  const { headers, movetext } = splitHeaders(pgn)
  const { tokens, clocks } = tokenizeMovesWithClocks(movetext)
  if (tokens.length === 0) throw new PgnError('Não encontrei nenhum lance neste PGN.')

  const initialFen = headers.FEN?.trim() || DEFAULT_POSITION
  let chess: Chess
  try {
    chess = new Chess(initialFen)
  } catch {
    throw new PgnError(`A posição inicial (FEN) deste PGN é inválida: ${initialFen}`)
  }

  const moves: GameMove[] = []
  const fens: string[] = [chess.fen()]
  for (const token of tokens) {
    const moveNumber = Number(chess.fen().split(' ')[5])
    const color = chess.turn()
    const fail = () =>
      new PgnError(
        `Lance inválido: ${describeMove(moveNumber, color, token)} (${color === 'w' ? 'brancas' : 'pretas'}). ` +
          `Esse lance não é possível nesta posição. ${
            moves.length > 0 ? `Os ${moves.length} lances anteriores foram lidos normalmente.` : 'Foi o primeiro lance da partida.'
          }`,
      )
    if (NULL_MOVES.has(token)) throw fail()
    let played
    try {
      played = chess.move(token)
    } catch {
      throw fail()
    }
    moves.push({
      ply: moves.length + 1,
      moveNumber,
      color,
      san: played.san,
      uci: played.lan,
      from: played.from,
      to: played.to,
      captured: Boolean(played.captured),
      ...(clocks[moves.length] !== undefined ? { clock: clocks[moves.length] } : {}),
    })
    fens.push(chess.fen())
  }

  // Refaz a partida para marcar as posições finais (só a última pode ser empate por regra).
  const replay = new Chess(initialFen)
  const positions: GamePosition[] = [{ fen: fens[0], terminal: terminalStateOf(replay, moves.length === 0) }]
  moves.forEach((move, index) => {
    replay.move(move.san)
    positions.push({ fen: fens[index + 1], terminal: terminalStateOf(replay, index === moves.length - 1) })
  })

  return {
    headers,
    white: known(headers.White) || 'Brancas',
    black: known(headers.Black) || 'Pretas',
    result: headers.Result?.trim() || '*',
    date: headers.Date?.trim() || '',
    timeControl: headers.TimeControl?.trim() || '',
    moves,
    positions,
  }
}

/** "2024.03.15" → "15/03/2024"; datas com "??" viram o que for conhecido. */
export function formatDate(date: string): string {
  const match = date.match(/^(\d{4}|\?{4})[.\-/](\d{2}|\?{2})[.\-/](\d{2}|\?{2})$/)
  if (!match) return date
  const [, year, month, day] = match
  if (year.includes('?')) return ''
  if (month.includes('?')) return year
  if (day.includes('?')) return `${month}/${year}`
  return `${day}/${month}/${year}`
}

/** "600" → "10 min"; "180+2" → "3 min + 2 s"; "1/86400" → "1 dia por lance". */
export function formatTimeControl(timeControl: string): string {
  if (!timeControl || timeControl === '-' || timeControl === '?') return ''
  const daily = timeControl.match(/^1\/(\d+)$/)
  if (daily) {
    const days = Math.round(Number(daily[1]) / 86400)
    return `${days} ${days === 1 ? 'dia' : 'dias'} por lance`
  }
  const match = timeControl.match(/^(\d+)(?:\+(\d+(?:\.\d+)?))?$/)
  if (!match) return timeControl
  const seconds = Number(match[1])
  const base = seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`
  return match[2] && Number(match[2]) !== 0 ? `${base} + ${match[2].replace('.', ',')} s` : base
}
