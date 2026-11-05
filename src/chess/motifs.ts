import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { type Color, type Eval, opposite } from './evaluation'
import { sanToPt, uciParts } from './notation'

export type Motif =
  | { kind: 'missed-mate'; moves: number; firstSan: string | null }
  | { kind: 'allowed-mate'; moves: number; replySan: string | null }
  | { kind: 'hanging'; piece: PieceSymbol; square: string }
  | { kind: 'material'; description: string; line: string[] }
  | { kind: 'fork'; san: string; targets: PieceSymbol[] }
  | { kind: 'pin'; bySan: string; byPiece: PieceSymbol; byPly: 'now' | 'reply'; pinned: PieceSymbol; square: string; behind: PieceSymbol }
  | { kind: 'missed-capture'; san: string; piece: PieceSymbol; square: string }

export interface MotifInput {
  color: Color
  uci: string
  beforeFen: string
  afterFen: string
  beforeEval: Eval
  afterEval: Eval
  bestUci: string | null
  /** Linha principal antes do lance (começa no melhor lance). */
  beforePv: string[]
  /** Linha principal depois do lance (começa na melhor resposta). */
  afterPv: string[]
}

const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

const NAMES: Record<PieceSymbol, { the: string; a: string; plural: string }> = {
  p: { the: 'o peão', a: 'um peão', plural: 'peões' },
  n: { the: 'o cavalo', a: 'um cavalo', plural: 'cavalos' },
  b: { the: 'o bispo', a: 'um bispo', plural: 'bispos' },
  r: { the: 'a torre', a: 'uma torre', plural: 'torres' },
  q: { the: 'a dama', a: 'a dama', plural: 'damas' },
  k: { the: 'o rei', a: 'o rei', plural: 'reis' },
}

const COUNTED: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q']

export const pieceName = (piece: PieceSymbol) => NAMES[piece].the

interface LineMove {
  san: string
  from: string
  to: string
  color: Color
  piece: PieceSymbol
  captured?: PieceSymbol
  after: string
}

function playLine(fen: string, pv: string[]): LineMove[] {
  const chess = new Chess(fen)
  const line: LineMove[] = []
  for (const uci of pv) {
    try {
      const move = chess.move(uciParts(uci))
      line.push({ san: move.san, from: move.from, to: move.to, color: move.color, piece: move.piece, captured: move.captured, after: move.after })
    } catch {
      break
    }
  }
  return line
}

function countPieces(fen: string): Record<Color, Record<PieceSymbol, number>> {
  const counts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  }
  for (const char of fen.split(' ')[0]) {
    const lower = char.toLowerCase()
    if (lower in VALUES) counts[char === lower ? 'b' : 'w'][lower as PieceSymbol] += 1
  }
  return counts
}

/** Saldo de material do ponto de vista de uma cor. */
function balance(fen: string, color: Color): number {
  const counts = countPieces(fen)
  return COUNTED.reduce((sum, piece) => sum + VALUES[piece] * (counts[color][piece] - counts[opposite(color)][piece]), 0)
}

/** Corta a linha em 4 a 6 jogadas, sem parar no meio de uma troca. */
function materialLine(fen: string, pv: string[]): LineMove[] {
  const line = playLine(fen, pv.slice(0, 8))
  let end = Math.min(6, line.length)
  while (end < line.length && line[end - 1].captured) end += 1
  return line.slice(0, end)
}

const lineEnd = (start: string, line: LineMove[]) => (line.length ? line[line.length - 1].after : start)

/** "um cavalo", "dois peões", "a qualidade"... ou null se não der para dizer em poucas palavras. */
function describeLoss(before: string, end: string, color: Color): string | null {
  const start = countPieces(before)
  const final = countPieces(end)
  const opponent = opposite(color)
  const lost: Partial<Record<PieceSymbol, number>> = {}
  const won: Partial<Record<PieceSymbol, number>> = {}
  for (const piece of COUNTED) {
    const mine = start[color][piece] - final[color][piece]
    const theirs = start[opponent][piece] - final[opponent][piece]
    const net = mine - theirs
    if (net > 0) lost[piece] = net
    if (net < 0) won[piece] = -net
  }
  const lostTypes = Object.keys(lost) as PieceSymbol[]
  const wonTypes = Object.keys(won) as PieceSymbol[]
  if (lostTypes.length === 0) return null
  if (wonTypes.length === 0) {
    const parts = lostTypes
      .sort((a, b) => VALUES[b] - VALUES[a])
      .map((piece) => (lost[piece] === 1 ? NAMES[piece].a : `${lost[piece] === 2 ? (piece === 'r' || piece === 'q' ? 'duas' : 'dois') : lost[piece]} ${NAMES[piece].plural}`))
    return parts.length > 2 ? 'muito material' : parts.join(' e ')
  }
  // Torre por peça menor é a "qualidade"; o resto vira só "material".
  if (lostTypes.length === 1 && lostTypes[0] === 'r' && wonTypes.length === 1 && (wonTypes[0] === 'n' || wonTypes[0] === 'b') && lost.r === won[wonTypes[0]]) {
    return 'a qualidade'
  }
  const points = COUNTED.reduce((sum, piece) => sum + VALUES[piece] * ((lost[piece] ?? 0) - (won[piece] ?? 0)), 0)
  return points === 1 ? '1 ponto de material' : `${points} pontos de material`
}

function detectMaterial(input: MotifInput): Extract<Motif, { kind: 'material' }> | null {
  const { color, beforeFen, afterFen, afterPv, beforePv } = input
  const line = materialLine(afterFen, afterPv)
  const end = lineEnd(afterFen, line)
  const start = balance(beforeFen, color)
  const playedDelta = balance(end, color) - start
  if (playedDelta > -1) return null
  // Se a melhor linha também perde o mesmo, o lance não é o culpado.
  const bestLine = materialLine(beforeFen, beforePv)
  const bestDelta = balance(lineEnd(beforeFen, bestLine), color) - start
  if (bestDelta - playedDelta < 1) return null
  const description = describeLoss(beforeFen, end, color)
  if (!description) return null
  const lastCapture = line.reduce((last, move, index) => (move.captured ? index : last), -1)
  if (lastCapture < 0) return null
  return { kind: 'material', description, line: line.slice(0, lastCapture + 1).map((move) => move.san) }
}

function capturesOn(chess: Chess, square: string) {
  return chess.moves({ verbose: true }).filter((move) => move.to === square && move.captured)
}

/** Peça que pode ser capturada de graça: depois da captura mais barata, ninguém retoma. */
function isHanging(fen: string, square: string): boolean {
  const chess = new Chess(fen)
  const captures = capturesOn(chess, square)
  if (captures.length === 0) return false
  const cheapest = captures.reduce((a, b) => (VALUES[b.piece] < VALUES[a.piece] ? b : a))
  chess.move(cheapest)
  return capturesOn(chess, square).length === 0
}

function detectHanging({ color, afterFen, afterPv }: MotifInput): Extract<Motif, { kind: 'hanging' }> | null {
  const chess = new Chess(afterFen)
  // Só afirma se a linha do motor de fato vai buscar a peça: evita apontar peça "envenenada".
  const line = playLine(afterFen, afterPv.slice(0, 3))
  const targeted = new Set(line.filter((move) => move.color !== color && move.captured).map((move) => move.to))
  let found: Extract<Motif, { kind: 'hanging' }> | null = null
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || cell.type === 'p' || cell.type === 'k') continue
      if (!targeted.has(cell.square) || !isHanging(afterFen, cell.square)) continue
      if (!found || VALUES[cell.type] > VALUES[found.piece]) found = { kind: 'hanging', piece: cell.type, square: cell.square }
    }
  }
  return found
}

function detectFork({ color, afterFen, afterPv }: MotifInput): Extract<Motif, { kind: 'fork' }> | null {
  const line = playLine(afterFen, afterPv.slice(0, 4))
  for (const move of line) {
    if (move.color === color) continue
    const chess = new Chess(move.after)
    // O garfo não existe se o defensor pode simplesmente capturar a peça que atacou.
    if (capturesOn(chess, move.to).length > 0) continue
    const targets: { piece: PieceSymbol; value: number }[] = []
    for (const row of chess.board()) {
      for (const cell of row) {
        if (!cell || cell.color !== color || VALUES[cell.type] < 3) continue
        if (!chess.attackers(cell.square as Square, opposite(color)).includes(move.to as Square)) continue
        const undefended = chess.attackers(cell.square as Square, color).length === 0
        if (VALUES[cell.type] > VALUES[move.piece] || undefended) targets.push({ piece: cell.type, value: VALUES[cell.type] })
      }
    }
    if (targets.length >= 2) {
      const sorted = targets.sort((a, b) => b.value - a.value).slice(0, 2)
      return { kind: 'fork', san: move.san, targets: sorted.map((target) => target.piece) }
    }
  }
  return null
}

const RAYS: Record<'b' | 'r', [number, number][]> = {
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
}

interface FoundPin {
  key: string
  by: PieceSymbol
  bySquare: string
  pinned: PieceSymbol
  square: string
  behind: PieceSymbol
}

/** Peças de uma cor cravadas por uma peça de longo alcance do adversário. */
function findPins(fen: string, color: Color): FoundPin[] {
  const board = new Chess(fen).board()
  const pins: FoundPin[] = []
  const at = (row: number, column: number) => (row >= 0 && row < 8 && column >= 0 && column < 8 ? board[row][column] : undefined)
  board.forEach((cells, row) => {
    cells.forEach((cell, column) => {
      if (!cell || cell.color === color) return
      const rays = cell.type === 'b' ? RAYS.b : cell.type === 'r' ? RAYS.r : cell.type === 'q' ? [...RAYS.b, ...RAYS.r] : []
      for (const [dr, dc] of rays) {
        let r = row + dr
        let c = column + dc
        let first: NonNullable<ReturnType<typeof at>> | null = null
        while (at(r, c) !== undefined) {
          const piece = at(r, c)
          if (piece) {
            if (piece.color !== color) break
            if (!first) {
              if (piece.type === 'k' || VALUES[piece.type] < 3) break
              first = piece
            } else {
              // Só é cravada se o que está atrás vale mais que a peça da frente e que a atacante.
              if (VALUES[piece.type] > VALUES[first.type] && VALUES[piece.type] > VALUES[cell.type]) {
                pins.push({
                  key: `${cell.square}-${first.square}-${piece.square}`,
                  by: cell.type,
                  bySquare: cell.square,
                  pinned: first.type,
                  square: first.square,
                  behind: piece.type,
                })
              }
              break
            }
          }
          r += dr
          c += dc
        }
      }
    })
  })
  return pins
}

function detectPin({ color, beforeFen, afterFen, afterPv }: MotifInput): Extract<Motif, { kind: 'pin' }> | null {
  const existing = new Set(findPins(beforeFen, color).map((pin) => pin.key))
  const fresh = (fen: string) => findPins(fen, color).filter((pin) => !existing.has(pin.key))
  const now = fresh(afterFen)[0]
  if (now) return { kind: 'pin', bySan: '', byPiece: now.by, byPly: 'now', pinned: now.pinned, square: now.square, behind: now.behind }
  const reply = playLine(afterFen, afterPv.slice(0, 1))[0]
  if (!reply) return null
  const pin = fresh(reply.after).find((candidate) => candidate.bySquare === reply.to)
  return pin ? { kind: 'pin', bySan: reply.san, byPiece: pin.by, byPly: 'reply', pinned: pin.pinned, square: pin.square, behind: pin.behind } : null
}

function detectMissedCapture({ color, uci, beforeFen, afterFen, afterPv, beforePv, bestUci }: MotifInput): Extract<Motif, { kind: 'missed-capture' }> | null {
  if (!bestUci || bestUci === uci) return null
  const best = playLine(beforeFen, [bestUci])[0]
  if (!best?.captured) return null
  const start = balance(beforeFen, color)
  const bestDelta = balance(lineEnd(beforeFen, materialLine(beforeFen, beforePv.length ? beforePv : [bestUci])), color) - start
  const playedDelta = balance(lineEnd(afterFen, materialLine(afterFen, afterPv)), color) - start
  if (bestDelta < 1 || bestDelta - playedDelta < 1) return null
  return { kind: 'missed-capture', san: best.san, piece: best.captured, square: best.to }
}

const isMateFor = (evaluation: Eval, color: Color) => evaluation.kind === 'mate' && evaluation.winner === color && evaluation.moves > 0

/** Procura os motivos táticos de um lance que perdeu avaliação. */
export function detectMotifs(input: MotifInput): Motif[] {
  const { color, beforeFen, afterFen, beforeEval, afterEval, bestUci, afterPv } = input
  const motifs: Motif[] = []
  const opponent = opposite(color)

  if (isMateFor(beforeEval, color) && !isMateFor(afterEval, color) && beforeEval.kind === 'mate') {
    motifs.push({ kind: 'missed-mate', moves: beforeEval.moves, firstSan: playLine(beforeFen, bestUci ? [bestUci] : [])[0]?.san ?? null })
  }
  if (isMateFor(afterEval, opponent) && !isMateFor(beforeEval, opponent) && afterEval.kind === 'mate') {
    motifs.push({ kind: 'allowed-mate', moves: afterEval.moves, replySan: playLine(afterFen, afterPv.slice(0, 1))[0]?.san ?? null })
    return motifs // Diante de um mate, o resto não importa.
  }

  const hanging = detectHanging(input)
  if (hanging) motifs.push(hanging)
  const fork = detectFork(input)
  if (fork) motifs.push(fork)
  const material = detectMaterial(input)
  // "Pendurada" já diz o que se perde quando é só aquela peça.
  if (material && !(hanging && material.description === NAMES[hanging.piece].a && material.line.length === 1)) motifs.push(material)
  const pin = detectPin(input)
  if (pin) motifs.push(pin)
  const missedCapture = detectMissedCapture(input)
  if (missedCapture) motifs.push(missedCapture)
  return motifs
}

const MAX_SENTENCES = 3
const capitalized = (text: string) => text[0].toUpperCase() + text.slice(1)
const sideOf = (color: Color) => (color === 'w' ? 'Brancas' : 'Pretas')

export interface ExplainOptions {
  color: Color
  /** O lance é da pessoa: fala "você" em vez de "as Brancas". */
  isUser?: boolean
  /** false: não diz qual era o melhor lance (para não estragar o "Tentar de novo"). */
  revealBest?: boolean
}

/** Junta os motivos em frases curtas. null se não houver nenhum. */
export function explainMotifs(motifs: Motif[], { color, isUser = false, revealBest = true }: ExplainOptions): string | null {
  const opponentName = `das ${sideOf(opposite(color))}`
  const sentences: string[] = []
  for (const motif of motifs) {
    switch (motif.kind) {
      case 'missed-mate': {
        const first = revealBest && motif.firstSan ? `, começando com ${sanToPt(motif.firstSan)}` : ''
        sentences.push(`${isUser ? 'Você tinha' : `As ${sideOf(color)} tinham`} mate em ${motif.moves}${first}.`)
        break
      }
      case 'allowed-mate': {
        const start = motif.replySan ? `, começando com ${sanToPt(motif.replySan)}` : ''
        sentences.push(`${isUser ? 'Depois do seu lance' : 'Depois deste lance'}, o adversário tem mate em ${motif.moves}${start}.`)
        break
      }
      case 'hanging':
        sentences.push(`${capitalized(NAMES[motif.piece].the)} em ${motif.square} ficou sozinh${motif.piece === 'r' || motif.piece === 'q' ? 'a' : 'o'}: atacad${motif.piece === 'r' || motif.piece === 'q' ? 'a' : 'o'} e sem ninguém defendendo.`)
        break
      case 'material':
        sentences.push(`A melhor resposta ${opponentName} ganha ${motif.description}: ${motif.line.map(sanToPt).join(' ')}.`)
        break
      case 'fork':
        sentences.push(`Olha o garfo: ${sanToPt(motif.san)} ataca ${NAMES[motif.targets[0]].the} e ${NAMES[motif.targets[1]].the} de uma vez.`)
        break
      case 'pin': {
        const pinned = `${NAMES[motif.pinned].the} em ${motif.square}`
        sentences.push(
          motif.byPly === 'reply'
            ? `${sanToPt(motif.bySan)} crava ${pinned} contra ${NAMES[motif.behind].the}.`
            : `${capitalized(pinned)} ficou cravad${motif.pinned === 'r' || motif.pinned === 'q' ? 'a' : 'o'}: se sair, expõe ${NAMES[motif.behind].the}.`,
        )
        break
      }
      case 'missed-capture':
        if (revealBest) sentences.push(`${isUser ? 'Você podia' : `As ${sideOf(color)} podiam`} ter capturado ${NAMES[motif.piece].the} em ${motif.square} com ${sanToPt(motif.san)}.`)
        break
    }
    if (sentences.length === MAX_SENTENCES) break
  }
  return sentences.length ? sentences.join(' ') : null
}

/** Material que o lance realmente ganha: só a troca imediata, não o que a linha promete depois. */
export function materialGain(color: Color, beforeFen: string, afterFen: string, afterPv: string[]): string | null {
  let end = afterFen
  for (const move of playLine(afterFen, afterPv.slice(0, 8))) {
    if (!move.captured) break
    end = move.after
  }
  if (balance(end, color) - balance(beforeFen, color) < 1) return null
  return describeLoss(beforeFen, end, opposite(color))
}
