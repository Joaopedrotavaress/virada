import { describe, expect, it } from 'vitest'
import type { MoveClass } from './classify'
import { type ClockData, type InsightMove, clockInsights, clocksAt, computeClock, formatClock, parseClock, parseTimeControl } from './clock'
import { parsePgn } from './pgn'

describe('controle de tempo', () => {
  it('lê incremento, sem incremento e desliga as daily', () => {
    expect(parseTimeControl('600+5')).toEqual({ base: 600, increment: 5 })
    expect(parseTimeControl('180')).toEqual({ base: 180, increment: 0 })
    expect(parseTimeControl('10+0.1')).toEqual({ base: 10, increment: 0.1 })
    expect(parseTimeControl('1/86400')).toBeNull()
    expect(parseTimeControl('')).toBeNull()
    expect(parseTimeControl('-')).toBeNull()
    expect(parseTimeControl('?')).toBeNull()
    expect(parseTimeControl('40/7200:3600')).toBeNull()
  })
})

describe('relógio no PGN', () => {
  it('lê h:mm:ss e décimos', () => {
    expect(parseClock('[%clk 0:09:58]')).toBe(598)
    expect(parseClock('[%clk 0:02:59.9]')).toBeCloseTo(179.9)
    expect(parseClock('[%clk 1:00:00]')).toBe(3600)
    expect(parseClock('comentário sem relógio')).toBeNull()
  })

  it('o parser associa cada relógio ao lance certo, ignorando variações', () => {
    const game = parsePgn(
      '[TimeControl "180+2"]\n\n1. e4 {[%clk 0:03:01]} 1... e5 {[%clk 0:02:58.5]} (1... c5 {[%clk 0:00:01]} 2. Nf3) 2. Nf3 {texto} 2... Nc6 {[%eval 0.3] [%clk 0:02:50]} *',
    )
    expect(game.moves.map((move) => move.clock)).toEqual([181, 178.5, undefined, 170])
  })
})

describe('tempo gasto', () => {
  const moves = [{ color: 'w' as const }, { color: 'b' as const }, { color: 'w' as const }, { color: 'b' as const }]

  it('anterior − atual + incremento, separado por jogador', () => {
    const data = computeClock(moves, [598, 595, 590, 580], '600+5')!
    expect(data.spent).toEqual([7, 10, 13, 20])
    expect(data.remaining).toEqual([598, 595, 590, 580])
  })

  it('sem incremento', () => {
    expect(computeClock(moves, [175, 170, 160, 150], '180')!.spent).toEqual([5, 10, 15, 20])
  })

  it('o relógio pode subir: não gera tempo negativo', () => {
    expect(computeClock(moves, [603, 600, 610, 600], '600+5')!.spent).toEqual([2, 5, 0, 5])
  })

  it('lance sem relógio não quebra o cálculo do seguinte', () => {
    const data = computeClock(moves, [598, undefined, 590, 580], '600')!
    expect(data.spent).toEqual([2, null, 8, 20])
  })

  it('desliga em partida daily e sem relógio', () => {
    expect(computeClock(moves, [1, 2, 3, 4], '1/86400')).toBeNull()
    expect(computeClock(moves, [null, null, null, null], '600')).toBeNull()
    expect(computeClock(moves, [], '')).toBeNull()
  })

  it('devolve o relógio de cada jogador ao navegar', () => {
    const data = computeClock(moves, [598, 595, 590, 580], '600')!
    expect(clocksAt(data, moves, 0)).toEqual({ w: 600, b: 600 })
    expect(clocksAt(data, moves, 1)).toEqual({ w: 598, b: 600 })
    expect(clocksAt(data, moves, 3)).toEqual({ w: 590, b: 595 })
  })
})

describe('formato do relógio', () => {
  it('fica legível em cada faixa', () => {
    expect(formatClock(4.2)).toBe('4,2s')
    expect(formatClock(25)).toBe('25s')
    expect(formatClock(160)).toBe('2:40')
    expect(formatClock(252)).toBe('4:12')
    expect(formatClock(3700)).toBe('1:01:40')
  })
})

describe('você e o relógio', () => {
  /** Monta uma partida só de um lado, com [classe, gasto, restante, mudança]. */
  function build(rows: [MoveClass, number, number, number?][], base = 600): { moves: InsightMove[]; data: ClockData } {
    return {
      moves: rows.map(([cls, , , swing], index) => ({ color: 'w', moveNumber: index + 1, cls, swing: swing ?? 0 })),
      data: { control: { base, increment: 0 }, spent: rows.map((row) => row[1]), remaining: rows.map((row) => row[2]) },
    }
  }
  const quiet = (count: number, spent = 10, remaining = 300): [MoveClass, number, number][] => Array.from({ length: count }, () => ['good', spent, remaining])

  it('erros graves com pouco tempo, contando certo', () => {
    const { moves, data } = build([...quiet(6), ['blunder', 3, 20], ['blunder', 3, 15], ['blunder', 3, 10], ['blunder', 20, 200]])
    expect(clockInsights(moves, data, 'w', true)).toContain('3 dos seus 4 erros graves foram com menos de 30 segundos no relógio.')
  })

  it('quando foram todos, diz de forma natural', () => {
    const { moves, data } = build([...quiet(6), ['blunder', 3, 20], ['blunder', 3, 15]])
    expect(clockInsights(moves, data, 'w', true)).toContain('Seus 2 erros graves foram com menos de 30 segundos no relógio.')
    expect(clockInsights(moves, data, 'w', false)).toContain('Os 2 erros graves das brancas foram com menos de 30 segundos no relógio.')
  })

  it('não diz isso se os erros graves foram com tempo de sobra', () => {
    const { moves, data } = build([...quiet(6), ['blunder', 3, 200], ['blunder', 3, 150], ['blunder', 3, 20]])
    expect(clockInsights(moves, data, 'w', true).join()).not.toContain('erros graves')
  })

  it('um único erro grave no aperto', () => {
    const { moves, data } = build([...quiet(6), ['blunder', 3, 12]])
    expect(clockInsights(moves, data, 'w', true)).toContain('Seu erro grave foi com menos de 30 segundos no relógio.')
  })

  it('pensou muito e errou', () => {
    const { moves, data } = build([...quiet(13), ['mistake', 160, 300], ...quiet(2)])
    expect(clockInsights(moves, data, 'w', true)).toContain('Você gastou 2:40 no lance 14 e mesmo assim errou: posição difícil, vale revisar.')
  })

  it('não chama de "pensou muito" o que é normal para o jogador', () => {
    const { moves, data } = build([...quiet(13, 60), ['mistake', 70, 300], ...quiet(2, 60)])
    expect(clockInsights(moves, data, 'w', true).join()).not.toContain('gastou')
  })

  it('lances rápidos em posições críticas', () => {
    const { moves, data } = build([...quiet(10, 30), ['mistake', 2, 300, 25], ['good', 3, 300, 15], ['blunder', 4, 300, 40], ['good', 5, 300, 12], ['excellent', 6, 300, 11], ['good', 7, 300, 11]])
    expect(clockInsights(moves, data, 'w', true)).toContain('Seus 5 lances mais rápidos em posições críticas (a avaliação mudou muito) tiveram 2 erros.')
  })

  it('não fala de posições críticas com poucos casos ou sem erros', () => {
    const few = build([...quiet(10, 30), ['mistake', 2, 300, 25], ['good', 3, 300, 15]])
    expect(clockInsights(few.moves, few.data, 'w', true).join()).not.toContain('críticas')
    const clean = build([...quiet(10, 30), ['good', 2, 300, 25], ['good', 3, 300, 15], ['good', 4, 300, 40]])
    expect(clockInsights(clean.moves, clean.data, 'w', true).join()).not.toContain('críticas')
  })

  it('sobrou tempo e os erros vieram apressados', () => {
    const rows: [MoveClass, number, number][] = [...quiet(17, 15, 400), ['mistake', 5, 390], ['good', 5, 380], ['blunder', 4, 370], ['good', 5, 360], ['mistake', 3, 300]]
    const { moves, data } = build(rows)
    expect(clockInsights(moves, data, 'w', true)).toContain('Você terminou com 5:00 sobrando: dava pra pensar mais nos lances 18 a 22.')
  })

  it('não cobra quem terminou sem tempo, nem quem não errou', () => {
    const tight = build([...quiet(10, 15, 400), ['mistake', 3, 20]])
    expect(clockInsights(tight.moves, tight.data, 'w', true).join()).not.toContain('sobrando')
    const clean = build(quiet(10, 15, 400))
    expect(clockInsights(clean.moves, clean.data, 'w', true)).toEqual([])
  })

  it('não diz nada com poucos lances', () => {
    const { moves, data } = build([['blunder', 3, 10], ['blunder', 3, 5]])
    expect(clockInsights(moves, data, 'w', true)).toEqual([])
  })

  it('lances de livro não entram nas contas', () => {
    const { moves, data } = build([['book', 1, 300], ['book', 1, 300], ['book', 1, 300], ['book', 1, 300], ['blunder', 1, 10]])
    expect(clockInsights(moves, data, 'w', true)).toEqual([])
  })

  it('fala das cores quando não sabe quem é o usuário', () => {
    const { moves, data } = build([...quiet(13), ['mistake', 160, 300], ...quiet(2)])
    expect(clockInsights(moves, data, 'w', false)).toContain('As brancas gastaram 2:40 no lance 14 e mesmo assim erraram: posição difícil, vale revisar.')
  })
})
