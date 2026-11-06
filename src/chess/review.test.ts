import { describe, expect, it } from 'vitest'
import type { AnalyzedMove, AnalyzedPosition } from './analyze'
import { type MoveClass, summarize } from './classify'
import type { Eval } from './evaluation'
import { findKeyMoments, gameInsights, stepDelay } from './review'

const cp = (value: number): Eval => ({ kind: 'cp', cp: value })
const mate = (moves: number, winner: 'w' | 'b'): Eval => ({ kind: 'mate', moves, winner })
const MIDDLEGAME = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 11'
const ENDGAME = '8/5pk1/6p1/8/8/5P2/6PK/8 w - - 0 50'

type Row = [MoveClass, number, Eval?]

/** Monta uma partida alternando as cores, com [classe, perda, avaliação depois do lance]. */
function build(rows: Row[], fen = MIDDLEGAME, firstMove = 11) {
  const moves: AnalyzedMove[] = rows.map(([cls, loss], index) => ({
    ply: index + 1,
    moveNumber: firstMove + Math.floor(index / 2),
    color: index % 2 === 0 ? 'w' : 'b',
    san: 'Nf3',
    uci: 'g1f3',
    from: 'g1',
    to: 'f3',
    captured: false,
    winBefore: 50,
    winAfter: 50 - loss,
    loss,
    cls,
    accuracy: 100 - loss * 2,
  }))
  const positions: AnalyzedPosition[] = [
    { fen, eval: cp(0), bestUci: 'g1f3', pvUci: ['g1f3'], terminal: null },
    ...rows.map(([, , evaluation]) => ({ fen, eval: evaluation ?? cp(0), bestUci: 'g1f3', pvUci: ['g1f3'], terminal: null })),
  ]
  return { moves, positions, summary: summarize(moves) }
}

const quiet = (count: number): Row[] => Array.from({ length: count }, () => ['good', 3])

describe('momentos-chave', () => {
  it('para nos erros da pessoa, na ordem da partida', () => {
    const game = build([['good', 1], ['good', 1], ['blunder', 30], ['good', 1], ['mistake', 12], ['good', 1]])
    expect(findKeyMoments(game, 'w').map((moment) => [moment.ply, moment.kind])).toEqual([[3, 'blunder'], [5, 'mistake']])
  })

  it('de pretas, os erros das brancas são do adversário', () => {
    const game = build([['blunder', 30], ['good', 1], ['good', 1], ['mistake', 12]])
    const moments = findKeyMoments(game, 'b')
    expect(moments.find((moment) => moment.ply === 1)?.kind).toBe('opponent-error')
    expect(moments.find((moment) => moment.ply === 4)?.kind).toBe('mistake')
  })

  it('não para em erro pequeno do adversário', () => {
    const game = build([['mistake', 12], ['good', 1]])
    expect(findKeyMoments(game, 'b').some((moment) => moment.ply === 1)).toBe(false)
  })

  it('marca quando a pessoa pune o erro', () => {
    const game = build([['blunder', 30], ['best', 0], ['good', 1], ['good', 1]])
    expect(findKeyMoments(game, 'b').find((moment) => moment.ply === 2)).toMatchObject({ kind: 'punished', title: 'Você puniu o erro' })
  })

  it('distingue mate perdido e mate permitido', () => {
    const missed = build([['mistake', 15, cp(300)]])
    missed.positions[0].eval = mate(3, 'w')
    expect(findKeyMoments(missed, 'w')[0]).toMatchObject({ kind: 'missed-mate', title: 'Mate perdido' })
    const allowed = build([['blunder', 40, mate(2, 'b')]])
    expect(findKeyMoments(allowed, 'w')[0]).toMatchObject({ kind: 'allowed-mate', title: 'Mate permitido' })
  })

  it('não para em mate permitido numa posição que já estava perdida', () => {
    const game = build([['excellent', 1.4, mate(2, 'b')]])
    game.positions[0].eval = cp(-1100)
    expect(findKeyMoments(game, 'w')).toEqual([])
  })

  it('jogar o melhor lance enquanto tem mate não é mate perdido', () => {
    const game = build([['best', 0, cp(900)]])
    game.positions[0].eval = mate(5, 'w')
    expect(findKeyMoments(game, 'w').map((moment) => moment.kind)).not.toContain('missed-mate')
  })

  it('marca o lance que mais custou, sem falar disso na tela', () => {
    const game = build([['mistake', 12], ['good', 1], ['blunder', 40], ['good', 1]])
    const moments = findKeyMoments(game, 'w')
    expect(moments.find((moment) => moment.ply === 3)).toMatchObject({ isTurningPoint: true, note: null })
    expect(moments.find((moment) => moment.ply === 1)?.isTurningPoint).toBe(false)
  })

  it('não para em lance de livro', () => {
    const game = build([['book', 0], ['book', 0], ['blunder', 30]])
    expect(findKeyMoments(game, 'w').map((moment) => moment.ply)).toEqual([3])
  })

  it('nunca para mais de 7 vezes e fica com os mais graves', () => {
    const rows: Row[] = []
    for (let index = 0; index < 12; index += 1) rows.push(['mistake', 10 + index], ['good', 1])
    const moments = findKeyMoments(build(rows), 'w')
    expect(moments).toHaveLength(7)
    expect(moments[0].ply).toBeGreaterThan(9)
    expect(moments.map((moment) => moment.ply)).toEqual([...moments.map((moment) => moment.ply)].sort((a, b) => a - b))
  })

  it('em partida limpa, usa as imprecisões, sem encher', () => {
    const game = build([['inaccuracy', 6], ['good', 1], ['inaccuracy', 9], ['good', 1], ['inaccuracy', 7], ['good', 1], ['inaccuracy', 5], ['good', 1]])
    expect(findKeyMoments(game, 'w').map((moment) => moment.ply)).toEqual([1, 3, 5])
  })

  it('uma partida perfeita não tem paradas', () => {
    expect(findKeyMoments(build(quiet(10)), 'w')).toEqual([])
  })

  it('sem saber quem é a pessoa, considera os dois lados', () => {
    const game = build([['blunder', 30], ['good', 1], ['good', 1], ['blunder', 25]])
    expect(findKeyMoments(game, null).map((moment) => moment.kind)).toEqual(['blunder', 'punished', 'blunder'])
  })
})

describe('insights', () => {
  it('compara a precisão e conta os erros', () => {
    const game = build([...quiet(6), ['blunder', 40], ['good', 1]])
    const insights = gameInsights(game, 'w')
    expect(insights[0]).toMatch(/^Sua precisão foi de .*, contra .* do adversário\.$/)
    expect(insights).toContain('Você teve 1 capivarada.')
  })

  it('nunca fala de virada, nem do lance que mais custou', () => {
    const game = build([...quiet(6), ['blunder', 40], ['good', 1]])
    for (const side of ['w', 'b', null] as const) expect(gameInsights(game, side).join(' ')).not.toMatch(/virou|rumo/)
  })

  it('elogia só quando não houve erro sério em partida de verdade', () => {
    expect(gameInsights(build(quiet(14)), 'w')).toContain('Você não cometeu nenhum erro sério. Muito bom.')
    expect(gameInsights(build(quiet(4)), 'w').join(' ')).not.toContain('Muito bom')
  })

  it('conta os erros do adversário aproveitados', () => {
    const used = build([['blunder', 30], ['best', 0], ['good', 1], ['good', 1]])
    expect(gameInsights(used, 'b')).toContain('O adversário cometeu uma capivarada e você aproveitou.')
    const wasted = build([['blunder', 30], ['mistake', 15], ['good', 1], ['good', 1]])
    expect(gameInsights(wasted, 'b')).toContain('O adversário cometeu uma capivarada e você não aproveitou.')
  })

  it('compara as fases só com lances suficientes e diferença real', () => {
    const rows: Row[] = [...Array.from({ length: 8 }, (): Row => ['good', 1]), ...Array.from({ length: 8 }, (): Row => ['mistake', 18])]
    const game = build(rows)
    game.positions.forEach((position, index) => {
      if (index >= 8) position.fen = ENDGAME
    })
    expect(gameInsights(game, 'w').join(' ')).toMatch(/Sua melhor fase foi o meio-jogo \(\d+%\); a mais difícil, o final \(\d+%\)\./)
    expect(gameInsights(build(quiet(14)), 'w').join(' ')).not.toContain('fase')
  })

  it('não passa de 5 conclusões', () => {
    const rows: Row[] = [...Array.from({ length: 8 }, (): Row => ['good', 1]), ...Array.from({ length: 8 }, (): Row => ['mistake', 18]), ['blunder', 30], ['blunder', 30]]
    expect(gameInsights(build(rows), 'w').length).toBeLessThanOrEqual(5)
  })

  it('partida só com teoria não gera frases vazias', () => {
    const insights = gameInsights(build([['book', 0], ['book', 0]]), 'w')
    expect(insights.join(' ')).not.toMatch(/undefined|null|NaN/)
  })
})

describe('ritmo', () => {
  it('cada velocidade é mais rápida que a anterior', () => {
    expect(stepDelay('1x', false, false)).toBeGreaterThan(stepDelay('2x', false, false))
    expect(stepDelay('2x', false, false)).toBeGreaterThan(stepDelay('4x', false, false))
    expect(stepDelay('4x', false, false)).toBeGreaterThan(stepDelay('8x', false, false))
  })

  it('teoria passa mais rápido e o momento-chave tem uma pausa antes', () => {
    expect(stepDelay('2x', true, false)).toBeLessThan(stepDelay('2x', false, false))
    expect(stepDelay('2x', false, true)).toBeGreaterThan(stepDelay('2x', false, false))
  })
})
