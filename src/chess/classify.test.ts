import { describe, expect, it } from 'vitest'
import type { AnalyzedMove, AnalyzedPosition } from './analyze'
import { classifyMoves, moveAccuracy, summarize } from './classify'
import { coachComment } from './comment'
import { type Eval, formatEval, toWhitePov, whiteWinPercent, winPercentFor } from './evaluation'

const cp = (value: number): Eval => ({ kind: 'cp', cp: value })
const mate = (moves: number, winner: 'w' | 'b'): Eval => ({ kind: 'mate', moves, winner })

describe('avaliação', () => {
  it('converte o score para o ponto de vista das brancas', () => {
    expect(toWhitePov({ type: 'cp', value: 120 }, 'w')).toEqual(cp(120))
    expect(toWhitePov({ type: 'cp', value: 120 }, 'b')).toEqual(cp(-120))
    expect(toWhitePov({ type: 'mate', value: 3 }, 'w')).toEqual(mate(3, 'w'))
    expect(toWhitePov({ type: 'mate', value: 3 }, 'b')).toEqual(mate(3, 'b'))
    expect(toWhitePov({ type: 'mate', value: -3 }, 'b')).toEqual(mate(3, 'w'))
    expect(toWhitePov({ type: 'mate', value: -2 }, 'w')).toEqual(mate(2, 'b'))
  })

  it('calcula win% pela fórmula e trata mate como 100 ou 0', () => {
    expect(whiteWinPercent(cp(0))).toBeCloseTo(50)
    expect(whiteWinPercent(cp(100))).toBeCloseTo(50 + 50 * (2 / (1 + Math.exp(-0.368208)) - 1))
    expect(whiteWinPercent(mate(5, 'w'))).toBe(100)
    expect(whiteWinPercent(mate(5, 'b'))).toBe(0)
    expect(winPercentFor(mate(5, 'b'), 'b')).toBe(100)
    expect(winPercentFor(cp(100), 'b') + winPercentFor(cp(100), 'w')).toBeCloseTo(100)
  })

  it('formata no padrão brasileiro', () => {
    expect(formatEval(cp(120))).toBe('+1,2')
    expect(formatEval(cp(-340))).toBe('−3,4')
    expect(formatEval(cp(0))).toBe('0,0')
    expect(formatEval(cp(3))).toBe('0,0')
    expect(formatEval(cp(-4))).toBe('0,0')
    expect(formatEval(mate(3, 'w'))).toBe('M3')
    expect(formatEval(mate(3, 'b'))).toBe('−M3')
    expect(formatEval(mate(0, 'w'))).toBe('1-0')
    expect(formatEval(mate(0, 'b'))).toBe('0-1')
  })
})

describe('classificação', () => {
  it('calcula a precisão do lance dentro de 0 a 100', () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 2)
    expect(moveAccuracy(10)).toBeCloseTo(94 * Math.exp(-0.85) + 6)
    expect(moveAccuracy(100)).toBeCloseTo(6, 0)
  })

  const pos = (value: Eval, bestUci: string | null = 'x') => ({ eval: value, bestUci })

  it('mede a perda do ponto de vista de quem jogou', () => {
    const [white, black] = classifyMoves(
      [
        { uci: 'a', color: 'w' },
        { uci: 'b', color: 'b' },
      ],
      [pos(cp(0)), pos(cp(-400)), pos(cp(0), null)],
    )
    expect(white.loss).toBeCloseTo(whiteWinPercent(cp(0)) - whiteWinPercent(cp(-400)))
    expect(white.cls).toBe('blunder')
    // As pretas devolveram tudo: perderam a vantagem e não aproveitaram o erro.
    expect(black.loss).toBeCloseTo(white.loss)
    expect(black.cls).toBe('miss')
  })

  it('o lance igual ao bestmove é Melhor, sem perda, mesmo com ruído na avaliação', () => {
    const [move, next] = classifyMoves(
      [
        { uci: 'x', color: 'w' },
        { uci: 'y', color: 'b' },
      ],
      [pos(cp(100)), pos(cp(-200)), pos(cp(800), null)],
    )
    expect(move.cls).toBe('best')
    expect(move.loss).toBe(0)
    expect(move.accuracy).toBeCloseTo(100, 2)
    // O lance anterior não foi erro, então isto é erro comum, não chance perdida.
    expect(next.cls).toBe('blunder')
  })

  it('não dá perda negativa quando a avaliação melhora', () => {
    const [move] = classifyMoves([{ uci: 'a', color: 'w' }], [pos(cp(0)), pos(cp(50), null)])
    expect(move.loss).toBe(0)
    expect(move.cls).toBe('excellent')
  })

  it('chance perdida exige perda ≥ 10 nos dois lances', () => {
    const line = [
      { uci: 'a', color: 'w' as const },
      { uci: 'b', color: 'b' as const },
    ]
    const smallSecondLoss = classifyMoves(line, [pos(cp(0)), pos(cp(-300)), pos(cp(-250), null)])
    expect(smallSecondLoss[1].cls).not.toBe('miss')
    const smallFirstLoss = classifyMoves(line, [pos(cp(0)), pos(cp(-40)), pos(cp(400), null)])
    expect(smallFirstLoss[0].cls).toBe('good')
    expect(smallFirstLoss[1].cls).toBe('blunder')
  })

  it('o lance de mate fica com 100%', () => {
    const [move] = classifyMoves([{ uci: 'x', color: 'w' }], [pos(mate(1, 'w')), pos(mate(0, 'w'), null)])
    expect(move.winAfter).toBe(100)
    expect(move.cls).toBe('best')
  })

  it('o resumo faz a média por lado e conta as categorias', () => {
    const summary = summarize([
      { color: 'w', accuracy: 100, cls: 'best', loss: 0, winAfter: 0, winBefore: 0 },
      { color: 'w', accuracy: 50, cls: 'blunder', loss: 0, winAfter: 0, winBefore: 0 },
      { color: 'b', accuracy: 70, cls: 'good', loss: 0, winAfter: 0, winBefore: 0 },
    ])
    expect(summary.w.accuracy).toBeCloseTo(0.7 * 75 + 0.3 * (2 / (1 / 100 + 1 / 50)))
    expect(summary.w.counts.best).toBe(1)
    expect(summary.w.counts.blunder).toBe(1)
    expect(summary.w.counts.miss).toBe(0)
    expect(summary.b.accuracy).toBeCloseTo(70)
  })
})

describe('comentário do treinador', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const AFTER_F3 = 'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1'
  const position = (fen: string, value: Eval, bestUci: string | null): AnalyzedPosition => ({ fen, eval: value, bestUci, pvUci: bestUci ? [bestUci] : [], terminal: null })
  const move = (overrides: Partial<AnalyzedMove>): AnalyzedMove => ({
    ply: 1,
    moveNumber: 1,
    color: 'w',
    san: 'f3',
    uci: 'f2f3',
    from: 'f2',
    to: 'f3',
    captured: false,
    winBefore: 0,
    winAfter: 0,
    loss: 30,
    accuracy: 20,
    cls: 'blunder',
    ...overrides,
  })

  it('segue o formato pedido, em notação portuguesa', () => {
    const text = coachComment({
      move: move({}),
      before: position(START, cp(120), 'g1f3'),
      after: position(AFTER_F3, cp(-340), 'g8f6'),
      isUserMove: true,
    })
    expect(text).toContain('A avaliação caiu de +1,2 para −3,4.')
    expect(text).toContain('O melhor era Cf3.')
    expect(text).toContain('Depois do seu lance, o adversário tem')
  })

  it('não diz "seu lance" para o lance de outra pessoa', () => {
    const text = coachComment({ move: move({}), before: position(START, cp(120), 'g1f3'), after: position(AFTER_F3, cp(-340), 'g8f6') })
    expect(text).toContain('Depois deste lance, o adversário tem Cf6.')
  })

  it('avisa quando o lance entrega mate e quando deixa escapar um mate', () => {
    const allowsMate = coachComment({ move: move({}), before: position(START, cp(0), 'g1f3'), after: position(AFTER_F3, mate(2, 'b'), 'g8f6') })
    expect(allowsMate).toContain('o adversário tem mate em 2, começando com Cf6.')
    const missedMate = coachComment({ move: move({}), before: position(START, mate(3, 'w'), 'g1f3'), after: position(AFTER_F3, cp(50), 'g8f6') })
    expect(missedMate).toContain('As Brancas tinham mate em 3, começando com Cf3.')
  })

  it('comenta o xeque-mate e a chance perdida', () => {
    const checkmate = coachComment({
      move: move({ cls: 'best', loss: 0 }),
      before: position(START, mate(1, 'w'), 'f2f3'),
      after: { ...position(AFTER_F3, mate(0, 'w'), null), terminal: 'checkmate' },
    })
    expect(checkmate).toBe('Xeque-mate. Fim de papo: as brancas vencem.')
    const miss = coachComment({
      move: move({ cls: 'miss' }),
      before: position(START, cp(300), 'g1f3'),
      after: position(AFTER_F3, cp(0), 'g8f6'),
      previousMove: move({ san: 'Qh5', color: 'b' }),
    })
    expect(miss).toContain('O adversário vacilou no lance anterior (Dh5) e a chance passou.')
  })
})
