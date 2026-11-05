import { describe, expect, it } from 'vitest'
import { type GameAnalysis, withBrilliantMoves } from './analyze'
import { isBrilliant, sacrificeOf } from './brilliant'
import { summarize } from './classify'
import { coachComment } from './comment'
import type { Eval } from './evaluation'

const cp = (value: number): Eval => ({ kind: 'cp', cp: value })
const OPERA = '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16'
const GREEK_GIFT = 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 8'
const LEGAL = 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5'

const good = { color: 'w' as const, loss: 0, winBefore: 60, winAfter: 75, evalBefore: cp(80) }

describe('sacrificeOf', () => {
  it('acha a dama entregue por Morphy na Ópera', () => {
    expect(sacrificeOf(OPERA, 'b3b8')).toEqual({ piece: 'q', square: 'b8', value: 9 })
  })

  it('desconta o peão capturado no sacrifício do bispo em h7', () => {
    expect(sacrificeOf(GREEK_GIFT, 'd3h7')).toEqual({ piece: 'b', square: 'h7', value: 2 })
  })

  it('reconhece a dama deixada para trás no golpe do cavalo em e5', () => {
    expect(sacrificeOf(LEGAL, 'f3e5')?.piece).toBe('q')
  })

  it('não confunde troca de damas com sacrifício', () => {
    expect(sacrificeOf('rnbqkbnr/ppp2ppp/8/4P3/4p3/8/PPP2PPP/RNBQKBNR w KQkq - 0 4', 'd1d8')).toBeNull()
  })

  it('não conta gambito de peão', () => {
    expect(sacrificeOf('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'f2f4')).toBeNull()
  })

  it('não conta o único lance legal, mesmo que a peça se perca', () => {
    expect(sacrificeOf('k7/8/1b6/8/8/4B3/6PP/5r1K w - - 0 1', 'e3g1')).toBeNull()
  })

  it('não conta o lance que dá mate', () => {
    expect(sacrificeOf('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7')).toBeNull()
  })

  it('não conta peça atacada que foge para uma casa segura', () => {
    expect(sacrificeOf('rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', 'f3g1')).toBeNull()
  })

  it('não quebra com lance inválido', () => {
    expect(sacrificeOf(OPERA, 'a1a8')).toBeNull()
  })
})

describe('isBrilliant', () => {
  it('aceita o sacrifício que mantém a posição boa', () => {
    expect(isBrilliant({ ...good, fen: GREEK_GIFT, uci: 'd3h7' })).toBe(true)
  })

  it('recusa o sacrifício que perde a vantagem', () => {
    expect(isBrilliant({ ...good, fen: GREEK_GIFT, uci: 'd3h7', loss: 30, winAfter: 30 })).toBe(false)
  })

  it('recusa quando quem jogou fica pior, mesmo sendo o melhor lance', () => {
    expect(isBrilliant({ ...good, fen: GREEK_GIFT, uci: 'd3h7', winBefore: 30, winAfter: 30 })).toBe(false)
  })

  it('recusa o sacrifício de quem já estava ganhando fácil', () => {
    expect(isBrilliant({ ...good, fen: GREEK_GIFT, uci: 'd3h7', winBefore: 99, winAfter: 99, evalBefore: cp(900) })).toBe(false)
  })

  it('aceita o sacrifício que força o mate, mesmo com a partida ganha', () => {
    expect(isBrilliant({ ...good, fen: OPERA, uci: 'b3b8', winBefore: 100, winAfter: 100, evalBefore: { kind: 'mate', moves: 2, winner: 'w' } })).toBe(true)
  })

  it('recusa o mate forçado do adversário como justificativa', () => {
    expect(isBrilliant({ ...good, fen: OPERA, uci: 'b3b8', winBefore: 99, winAfter: 99, evalBefore: { kind: 'mate', moves: 2, winner: 'b' } })).toBe(false)
  })
})

describe('partidas salvas antes do lance brilhante', () => {
  const position = { fen: GREEK_GIFT, terminal: null, eval: cp(80), bestUci: 'd3h7', pvUci: [] }
  const move = { ply: 1, moveNumber: 8, color: 'w' as const, san: 'Bxh7+', uci: 'd3h7', from: 'd3', to: 'h7', winBefore: 60, winAfter: 75, loss: 0, cls: 'best' as const, accuracy: 100 }
  const saved = (cls: 'best' | 'good', loss = 0) => {
    const moves = [{ ...move, cls, loss }]
    return { moves, positions: [position, { ...position, fen: '8/8/8/8/8/8/8/8 b - - 0 8' }], summary: summarize(moves) } as unknown as GameAnalysis
  }

  it('ganham a marca e o resumo é refeito ao abrir', () => {
    const upgraded = withBrilliantMoves(saved('best'))
    expect(upgraded.moves[0].cls).toBe('brilliant')
    expect(upgraded.summary.w.counts.brilliant).toBe(1)
    expect(upgraded.summary.w.counts.best).toBe(0)
  })

  it('não mexem em lance que não é o melhor nem quase', () => {
    expect(withBrilliantMoves(saved('good', 3)).moves[0].cls).toBe('good')
  })

  it('completam a contagem das análises antigas, que não tinham a categoria', () => {
    const old = saved('good', 3)
    delete (old.summary.w.counts as Partial<typeof old.summary.w.counts>).brilliant
    expect(withBrilliantMoves(old).summary.w.counts.brilliant).toBe(0)
  })

  it('não refazem nada quando já está tudo certo', () => {
    const current = saved('good', 3)
    expect(withBrilliantMoves(current)).toBe(current)
  })
})

describe('comentário do lance brilhante', () => {
  it('diz qual peça foi entregue e o que ela rendeu', () => {
    const before = { fen: OPERA, terminal: null, eval: { kind: 'mate', moves: 2, winner: 'w' }, bestUci: 'b3b8', pvUci: [] }
    const after = { fen: '1Q2kb1r/p2n1ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 b k - 1 16', terminal: null, eval: { kind: 'mate', moves: 1, winner: 'w' }, bestUci: 'd7b8', pvUci: [] }
    const move = { ply: 31, moveNumber: 16, color: 'w', san: 'Qb8+', uci: 'b3b8', from: 'b3', to: 'b8', winBefore: 100, winAfter: 100, loss: 0, cls: 'brilliant', accuracy: 100 }
    const text = coachComment({ move, before, after, isUserMove: true } as never)
    expect(text).toBe('Você entregou a dama em b8 e a conta fecha: tem mate em 1.')
  })
})
