import { describe, expect, it } from 'vitest'
import type { AnalyzedMove, AnalyzedPosition } from './analyze'
import { MOVE_CLASSES, type MoveClass } from './classify'
import type { Eval } from './evaluation'
import { lessonOf, moodOf, speechOf } from './professor'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER = 'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1'
const cp = (value: number): Eval => ({ kind: 'cp', cp: value })
const position = (fen: string, evaluation: Eval, overrides: Partial<AnalyzedPosition> = {}) => ({ fen, terminal: null, eval: evaluation, bestUci: 'g1f3', pvUci: [], ...overrides }) as AnalyzedPosition
const move = (cls: MoveClass, ply = 1) => ({ ply, moveNumber: 1, color: 'w', san: 'f3', uci: 'f2f3', from: 'f2', to: 'f3', winBefore: 60, winAfter: 40, loss: 20, cls, accuracy: 50 }) as AnalyzedMove

const speak = (cls: MoveClass, isUserMove = true, after = position(AFTER, cp(-50), { bestUci: 'g8f6' })) => speechOf({ move: move(cls), before: position(START, cp(30)), after, isUserMove })

describe('fala do professor', () => {
  it('tem o que dizer em todas as classes, sendo o lance da pessoa ou não', () => {
    for (const cls of MOVE_CLASSES) {
      expect(speak(cls, true).opener).toBeTruthy()
      expect(speak(cls, false).opener).toBeTruthy()
    }
  })

  it('não fala de "você" ou "chefia" errando o sujeito: lance do outro não é tratado como seu', () => {
    for (const cls of MOVE_CLASSES) expect(speak(cls, false).opener).not.toMatch(/\bvocê\b/i)
  })

  it('repete a mesma frase para o mesmo lance, para o texto não mudar na tela', () => {
    const first = speechOf({ move: move('best', 7), before: position(START, cp(30)), after: position(AFTER, cp(30)), isUserMove: true })
    const second = speechOf({ move: move('best', 7), before: position(START, cp(30)), after: position(AFTER, cp(30)), isUserMove: true })
    expect(first).toEqual(second)
  })

  it('não comemora em posição perdida', () => {
    const lost = speak('best', true, position(AFTER, { kind: 'mate', moves: 2, winner: 'b' }, { bestUci: 'g8f6' }))
    expect(lost).toEqual({ opener: null, lesson: null, mood: 'neutro' })
  })

  it('reconhece o xeque-mate de quem joga e o de quem levou', () => {
    const mated = position(AFTER, { kind: 'mate', moves: 0, winner: 'w' }, { terminal: 'checkmate', bestUci: null })
    expect(speak('best', true, mated).opener).toBe('Fecha a conta, chefia!')
    expect(speak('best', false, mated).opener).toBe('Acabou, chefia. Amanhã tem revanche.')
  })

  it('ensina nos erros e no brilhante, e não enche o saco nos lances comuns', () => {
    expect(speak('blunder').lesson).toBeTruthy()
    expect(speak('inaccuracy').lesson).toBeTruthy()
    expect(speak('brilliant').lesson).toContain('Sacrifício')
    expect(speak('best').lesson).toBeNull()
    expect(speak('good').lesson).toBeNull()
  })

  it('a lição acompanha o motivo do erro', () => {
    expect(lessonOf([{ kind: 'hanging', piece: 'q', square: 'd5' }])).toContain('sem proteção')
    expect(lessonOf([{ kind: 'allowed-mate', moves: 2, replySan: null }])).toContain('xeques')
    expect(lessonOf([])).toContain('o que o outro quer')
  })

  it('a lição nunca entrega um lance da posição', () => {
    const lessons = [
      lessonOf([{ kind: 'missed-capture', san: 'Bxd5', piece: 'n', square: 'd5' }]),
      lessonOf([{ kind: 'missed-mate', moves: 2, firstSan: 'Qh7' }]),
      lessonOf([{ kind: 'fork', san: 'Nc7', targets: ['r', 'k'] }]),
    ]
    for (const lesson of lessons) expect(lesson).not.toMatch(/[a-h][1-8]/)
  })

  it('muda a cara conforme o lance', () => {
    expect(moodOf('brilliant')).toBe('espantado')
    expect(moodOf('best')).toBe('feliz')
    expect(moodOf('mistake')).toBe('bravo')
    expect(moodOf('blunder')).toBe('espantado')
    expect(moodOf(null)).toBe('neutro')
  })
})
