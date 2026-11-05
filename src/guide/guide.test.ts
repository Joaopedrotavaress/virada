import { Chess } from 'chess.js'
import { afterAll, describe, expect, it } from 'vitest'
import { bookKey, loadBook } from '../chess/book'
import { evaluatePosition } from '../chess/evaluate'
import { type Eval, winPercentFor } from '../chess/evaluation'
import { nodeEngine } from '../chess/testkit'
import { OPENING_GUIDES, guideForMoves, splitSans } from './openings'

const engine = nodeEngine()
afterAll(() => engine.terminate())

/** O texto cita lances em notação portuguesa. Sinais em inglês seriam um erro de digitação. */
const ENGLISH_PIECE = /\b(?:[NQK][a-h][1-8]|[NQK]x[a-h][1-8])\b/

function playAll(sans: string): Chess {
  const chess = new Chess()
  for (const san of splitSans(sans)) chess.move(san)
  return chess
}

const search = (fen: string) => engine.analyze(fen, 13, { movetime: 3000 })
const whiteCp = (value: Eval) => (value.kind === 'mate' ? (value.winner === 'w' ? 2000 : -2000) : value.cp)

describe('guia de aberturas: conteúdo', () => {
  it('são pelo menos 30 aberturas, com todos os campos', () => {
    expect(OPENING_GUIDES.length).toBeGreaterThanOrEqual(30)
    const slugs = new Set<string>()
    for (const guide of OPENING_GUIDES) {
      expect(slugs.has(guide.slug), guide.slug).toBe(false)
      slugs.add(guide.slug)
      expect(guide.summary.length, guide.slug).toBeGreaterThan(80)
      expect(guide.ideas.length, guide.slug).toBeGreaterThan(0)
      expect(guide.plans.white.length, guide.slug).toBeGreaterThan(0)
      expect(guide.plans.black.length, guide.slug).toBeGreaterThan(0)
      expect(guide.lines.length, guide.slug).toBeGreaterThan(0)
      expect(guide.mistakes.length, guide.slug).toBeGreaterThan(0)
    }
  })

  it('o texto usa a notação portuguesa', () => {
    for (const guide of OPENING_GUIDES) {
      const text = [guide.summary, ...guide.ideas, ...guide.plans.white, ...guide.plans.black, ...guide.mistakes, ...guide.lines.map((line) => line.note), ...guide.traps.map((trap) => trap.text)].join(' ')
      expect(text.match(ENGLISH_PIECE)?.[0], guide.slug).toBeUndefined()
    }
  })

  it('todos os lances são legais, e as linhas passam pela raiz da abertura', () => {
    for (const guide of OPENING_GUIDES) {
      const root = splitSans(guide.root)
      playAll(guide.root)
      for (const line of guide.lines) {
        const moves = splitSans(line.sans)
        playAll(line.sans)
        // A exceção é o sistema que pode começar por outro caminho, como o Índio do Rei contra a Francesa.
        if (!moves.join(' ').startsWith(root.join(' ')) && guide.slug !== 'ataque-indio-do-rei' && guide.slug !== 'londres') {
          throw new Error(`${guide.slug}: "${line.name}" não começa pela raiz`)
        }
      }
      for (const trap of guide.traps) {
        playAll(trap.sans)
        expect(trap.errorAt, trap.name).toBeLessThan(splitSans(trap.sans).length)
      }
    }
  })

  it('a raiz de cada abertura está na base de aberturas', async () => {
    const book = await loadBook()
    for (const guide of OPENING_GUIDES) {
      const key = bookKey(playAll(guide.root).fen())
      expect(book?.positions[key], guide.slug).toBeDefined()
    }
  })

  it('reconhece a abertura pelos lances, ficando com a mais específica', () => {
    const of = (sans: string) => guideForMoves(splitSans(sans))?.slug
    expect(of('e4 e5 Nf3 Nc6 Bc4 Bc5 c3')).toBe('italiana')
    expect(of('e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5')).toBe('dois-cavalos')
    expect(of('e4 e5 Nf3 Nc6 Bc4 Bc5 b4')).toBe('evans')
    expect(of('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6')).toBe('najdorf')
    expect(of('e4 c5 Nf3 e6')).toBe('siciliana')
    expect(of('d4 d5 c4 c6 Nf3 Nf6 Nc3 e6')).toBe('semi-eslava')
    expect(of('d4 d5 c4 c6')).toBe('eslava')
    expect(of('a3')).toBeUndefined()
  })
})

describe('guia de aberturas: o Stockfish confere', () => {
  for (const guide of OPENING_GUIDES) {
    for (const line of guide.lines) {
      it(`${guide.name}, ${line.name}: posição jogável, sem vantagem decisiva`, async () => {
        const chess = playAll(line.sans)
        const result = await search(chess.fen())
        const limit = line.sharp ? 300 : 170
        expect(Math.abs(whiteCp(result.eval)), `${guide.slug}: ${line.name} = ${JSON.stringify(result.eval)}`).toBeLessThanOrEqual(limit)
      })
    }
    for (const trap of guide.traps) {
      it(`${guide.name}, armadilha ${trap.name}: o lado certo fica ganhando`, async () => {
        const moves = splitSans(trap.sans)
        const chess = playAll(trap.sans)
        if (!chess.isCheckmate()) {
          const final = await search(chess.fen())
          expect(winPercentFor(final.eval, trap.who), `final de ${trap.name} = ${JSON.stringify(final.eval)}`).toBeGreaterThanOrEqual(trap.minWin ?? 70)
        }
        // O lance apontado como erro tem de ser mesmo um erro: logo depois dele, a vantagem já aparece.
        const afterError = new Chess()
        for (const san of moves.slice(0, trap.errorAt + 1)) afterError.move(san)
        const refuted = await search(afterError.fen())
        expect(winPercentFor(refuted.eval, trap.who), `depois do erro de ${trap.name} = ${JSON.stringify(refuted.eval)}`).toBeGreaterThanOrEqual(trap.minWin ?? 62)
        // Antes do erro, ainda não estava decidido; quem erra é quem perde.
        const before = new Chess()
        for (const san of moves.slice(0, trap.errorAt)) before.move(san)
        const mover = before.turn()
        expect(mover, `o lance ${moves[trap.errorAt]} em ${trap.name} deveria ser de quem cai na armadilha`).toBe(trap.who === 'w' ? 'b' : 'w')
        const start = await evaluatePosition(engine, before.fen(), { depth: 13, movetime: 3000 })
        expect(winPercentFor(start.eval, mover), `antes do erro de ${trap.name} = ${JSON.stringify(start.eval)}`).toBeGreaterThanOrEqual(30)
      })
    }
  }
})
