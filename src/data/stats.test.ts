import { describe, expect, it } from 'vitest'
import type { GameDigest, GameError } from '../chess/digest'
import type { GameRecord } from './library'
import { accuracyOf, colorInsight, findPatterns, groupByPeriod, openingFamily, openingStats, ratingSeries, seriousErrorsOf, timeClassFor, totalsOf } from './stats'

const DAY = 86_400_000
const BASE = Date.UTC(2026, 9, 5, 12) // segunda-feira

const error = (patch: Partial<GameError> = {}): GameError => ({ ply: 21, moveNumber: 11, san: 'Nf3', cls: 'blunder', loss: 30, phase: 'middlegame', theme: 'fork', timePressure: false, fen: '', bestUci: 'e2e4', pvUci: [], ...patch })

const digest = (errors: GameError[] = [], accuracy = 80): GameDigest => {
  const counts = () => ({ brilliant: 0, book: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 })
  const w = counts()
  w.blunder = errors.length
  return { id: 'x', depth: 15, analyzedAt: 0, plies: 40, accuracy: { w: accuracy, b: 50 }, counts: { w, b: counts() }, errors }
}

const record = (patch: Partial<GameRecord> = {}): GameRecord => ({
  key: String(Math.random()),
  pgn: '',
  white: 'eu',
  black: 'outro',
  result: '1-0',
  date: '',
  timeControl: '',
  playedAt: BASE,
  source: 'pgn',
  userColor: 'w',
  outcome: 'win',
  tags: [],
  note: '',
  createdAt: 0,
  updatedAt: 0,
  ...patch,
})

describe('totais', () => {
  it('sem partidas não há o que dividir', () => {
    const totals = totalsOf([])
    expect(totals.games).toBe(0)
    expect(totals.score).toBeNull()
    expect(totals.accuracy).toBeNull()
    expect(totals.errorsPerGame).toBeNull()
  })

  it('aproveitamento conta empate como meio ponto e ignora partida sem resultado', () => {
    const totals = totalsOf([record(), record({ outcome: 'draw' }), record({ outcome: 'loss' }), record({ outcome: 'loss' }), record({ outcome: null })])
    expect(totals.games).toBe(5)
    expect(totals.score).toBeCloseTo(37.5)
    expect(totals.wins).toBe(1)
    expect(totals.losses).toBe(2)
  })

  it('erros por partida só contam as analisadas', () => {
    const totals = totalsOf([record({ digest: digest([error(), error()]) }), record({ digest: digest([]) }), record()])
    expect(totals.errorsPerGame).toBe(1)
    expect(totals.analyzed).toBe(2)
  })

  it('precisão: a análise daqui vale mais que a do chess.com, e cada um olha a própria cor', () => {
    expect(accuracyOf(record({ digest: digest([], 90), accuracies: { white: 70 } }))).toBe(90)
    expect(accuracyOf(record({ accuracies: { white: 70, black: 60 } }))).toBe(70)
    expect(accuracyOf(record({ userColor: 'b', accuracies: { white: 70, black: 60 } }))).toBe(60)
    expect(accuracyOf(record({ userColor: null, accuracies: { white: 70 } }))).toBeNull()
    expect(accuracyOf(record())).toBeNull()
  })

  it('erros graves somam equívocos, capivaradas e chances perdidas', () => {
    const data = digest()
    data.counts.w.mistake = 2
    data.counts.w.miss = 1
    data.counts.w.blunder = 1
    data.counts.w.inaccuracy = 5
    expect(seriousErrorsOf(record({ digest: data }))).toBe(4)
    expect(seriousErrorsOf(record())).toBeNull()
  })
})

describe('evolução', () => {
  it('agrupa por semana e por mês, em ordem', () => {
    const items = [record({ playedAt: BASE + 2 * DAY }), record({ playedAt: BASE }), record({ playedAt: BASE + 8 * DAY }), record({ playedAt: BASE + 40 * DAY })]
    const weeks = groupByPeriod(items, 'week')
    expect(weeks.map((point) => point.games)).toEqual([2, 1, 1])
    expect(weeks[0].label).toBe('5 out')
    const months = groupByPeriod(items, 'month')
    expect(months.map((point) => point.label)).toEqual(['out 26', 'nov 26'])
    expect(months.map((point) => point.games)).toEqual([3, 1])
  })

  it('rating em ordem, sem partidas que não valem rating', () => {
    const series = ratingSeries([record({ whiteRating: 1210, playedAt: BASE + 1 }), record({ whiteRating: 1200, playedAt: BASE }), record({ whiteRating: 999, rated: false }), record({ userColor: 'b', blackRating: 1190, playedAt: BASE + 2 }), record()])
    expect(series.map((point) => point.rating)).toEqual([1200, 1210, 1190])
  })

  it('ritmo vem do chess.com ou do controle de tempo', () => {
    expect(timeClassFor(record({ timeClass: 'blitz', timeControl: '60' }))).toBe('blitz')
    expect(timeClassFor(record({ timeControl: '60' }))).toBe('bullet')
    expect(timeClassFor(record({ timeControl: '180+2' }))).toBe('blitz')
    expect(timeClassFor(record({ timeControl: '600' }))).toBe('rapid')
    expect(timeClassFor(record({ timeControl: '-' }))).toBeNull()
  })
})

describe('padrões de erro', () => {
  it('poucos erros não viram padrão', () => {
    expect(findPatterns([record({ digest: digest([error(), error()]) })])).toEqual([])
    expect(findPatterns([])).toEqual([])
  })

  it('aponta o tema que se repete, com a fase quando ela concentra', () => {
    const errors = [...Array.from({ length: 6 }, () => error()), error({ theme: 'hanging', phase: 'endgame' }), error({ theme: 'positional', phase: 'opening' }), error({ theme: 'pin', phase: 'endgame' })]
    const patterns = findPatterns([record({ digest: digest(errors) })])
    expect(patterns[0].text).toBe('6 dos 9 erros graves foram garfos no meio-jogo.')
    expect(patterns[0].theme).toBe('fork')
    expect(patterns.some((item) => item.id === 'fase-middlegame')).toBe(true)
  })

  it('não cita a fase quando os erros estão espalhados', () => {
    const errors = [error(), error(), error({ phase: 'endgame' }), error({ phase: 'opening' })]
    expect(findPatterns([record({ digest: digest(errors) })])[0].text).toBe('4 dos 4 erros graves foram garfos.')
  })

  it('erro sem tática clara não vira tema a treinar', () => {
    const errors = Array.from({ length: 5 }, () => error({ theme: 'positional', phase: 'opening' }))
    const patterns = findPatterns([record({ digest: digest(errors) })])
    expect(patterns.every((item) => item.theme !== 'positional')).toBe(true)
  })

  it('aponta a pressão de tempo', () => {
    const errors = Array.from({ length: 4 }, (_, index) => error({ theme: index % 2 ? 'fork' : 'pin', timePressure: index < 2, phase: index % 2 ? 'opening' : 'endgame' }))
    const more = [...errors, error({ theme: 'hanging', timePressure: true, phase: 'opening' })]
    expect(findPatterns([record({ digest: digest(more) })]).some((item) => item.id === 'tempo')).toBe(true)
  })

  it('olha só as partidas mais recentes', () => {
    const old = Array.from({ length: 5 }, (_, index) => record({ digest: digest([error({ theme: 'pin' })]), playedAt: BASE - index - 1 }))
    const recent = Array.from({ length: 5 }, (_, index) => record({ digest: digest([error({ theme: 'fork' })]), playedAt: BASE + index }))
    const patterns = findPatterns([...old, ...recent], 5)
    expect(patterns[0].theme).toBe('fork')
    expect(patterns[0].total).toBe(5)
  })

  it('compara as cores só com partidas suficientes e diferença de verdade', () => {
    const many = (color: 'w' | 'b', outcome: GameRecord['outcome'], count: number) => Array.from({ length: count }, () => record({ userColor: color, outcome }))
    expect(colorInsight([...many('w', 'win', 5), ...many('b', 'loss', 4)])).toBeNull()
    expect(colorInsight([...many('w', 'win', 5), ...many('b', 'win', 5)])).toBeNull()
    expect(colorInsight([...many('w', 'win', 5), ...many('b', 'loss', 5)])).toBe('Você pontua 100% de brancas e 0% de pretas.')
  })
})

describe('aberturas da pessoa', () => {
  it('junta as variantes na família, separando por cor', () => {
    expect(openingFamily('Defesa Siciliana: Variante Najdorf')).toBe('Defesa Siciliana')
    const opening = (name: string) => ({ eco: 'B90', name })
    const stats = openingStats([
      record({ opening: opening('Defesa Siciliana: Variante Najdorf') }),
      record({ opening: opening('Defesa Siciliana: Dragão'), outcome: 'loss' }),
      record({ opening: opening('Defesa Siciliana'), userColor: 'b', outcome: 'win' }),
      record({ opening: null }),
    ])
    expect(stats[0]).toMatchObject({ name: 'Defesa Siciliana', color: 'w', games: 2, score: 50 })
    expect(stats[1]).toMatchObject({ name: 'Defesa Siciliana', color: 'b', games: 1 })
    expect(stats).toHaveLength(2)
  })
})
