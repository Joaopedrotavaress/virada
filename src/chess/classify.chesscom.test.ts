import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { type MoveClass, type PositionEval, classifyMoves, summarize } from './classify'
import type { Color } from './evaluation'
import fixtures from './caso-chesscom.fixture.json'

/**
 * Duas partidas reais de 10 minutos, com rating perto de 330, avaliadas pelo Stockfish 19 completo (profundidade 18)
 * e comparadas com a revisão do Chess.com. As regras não precisam acertar tudo: o teste segura o ganho que já existe.
 */
type Fixture = typeof fixtures.a
const moves = (f: Fixture) => f.moves as { uci: string; san: string; color: Color; book: boolean }[]
const classify = (f: Fixture) => classifyMoves(moves(f), f.positions as (PositionEval & { fen: string })[], moves(f).map((move) => move.book), f.ratings)
const counts = (f: Fixture) => summarize(classify(f).map((move, index) => ({ ...move, color: moves(f)[index].color })))
const classOf = (f: Fixture, san: string, color: Color) => classify(f)[moves(f).findIndex((move) => move.san === san && move.color === color)].cls

const TABLES: { fixture: Fixture; color: Color; want: Partial<Record<MoveClass, number>> }[] = [
  { fixture: fixtures.a, color: 'w', want: { great: 4, best: 11, excellent: 6 } },
  { fixture: fixtures.b, color: 'w', want: { great: 2, best: 16, excellent: 5, good: 7, inaccuracy: 2, mistake: 11, miss: 2, blunder: 0 } },
  { fixture: fixtures.b, color: 'b', want: { great: 7, best: 18, excellent: 5, good: 7, inaccuracy: 3, mistake: 1, miss: 3, blunder: 2 } },
]

describe('as partidas comparadas com o Chess.com', () => {
  it('a diferença total nas tabelas não volta a crescer', () => {
    let total = 0
    for (const { fixture, color, want } of TABLES) {
      const got = counts(fixture)[color].counts
      for (const cls of Object.keys(want) as MoveClass[]) total += Math.abs(got[cls] - (want[cls] as number))
    }
    expect(total).toBeLessThanOrEqual(34)
  })

  it('a quantidade de "!" fica a até 1 do Chess.com, nos três lados', () => {
    for (const { fixture, color, want } of TABLES) expect(Math.abs(counts(fixture)[color].counts.great - (want.great as number))).toBeLessThanOrEqual(1)
  })

  it('retomar a peça nunca é "!", nem com rating baixo', () => {
    expect(classOf(fixtures.b, 'Bxe2', 'w')).toBe('best')
    expect(classOf(fixtures.b, 'Rxd8+', 'w')).toBe('best')
  })

  it('jogar fora a vantagem alguns lances depois do erro do outro é Chance perdida', () => {
    expect(classOf(fixtures.b, 'Be3', 'w')).toBe('miss')
  })

  it('lance fora do primeiro do motor nunca é Melhor', () => {
    for (const fixture of [fixtures.a, fixtures.b]) {
      const classified = classify(fixture)
      moves(fixture).forEach((move, index) => {
        const position = fixture.positions[index]
        const mateKept = position.eval.kind === 'mate'
        if (!move.book && position.bestUci !== move.uci && !mateKept && new Chess(position.fen).moves().length > 1) expect(classified[index].cls, move.san).not.toBe('best')
      })
    }
  })
})
