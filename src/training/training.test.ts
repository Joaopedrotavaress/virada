import { describe, expect, it } from 'vitest'
import type { GameDigest, GameError } from '../chess/digest'
import { MAX_CARDS_PER_GAME, answerCard, cardsFromDigest, dueLabel, isDue, lineCard } from './cards'
import { EMPTY_DAILY, afterExercise, currentDaily, dayOf, pickSession } from './daily'
import { lineSteps } from './useLine'

const START = new Date('2026-11-05T10:00:00Z')
const days = (count: number) => new Date(START.getTime() + count * 86_400_000)

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
const FORCED = '7k/8/8/8/8/8/5q2/7K w - - 0 1'

const error = (patch: Partial<GameError> = {}): GameError => ({ ply: 6, moveNumber: 3, san: 'Nf6', cls: 'blunder', loss: 25, phase: 'opening', theme: 'fork', timePressure: false, fen: FEN, bestUci: 'f8c5', pvUci: ['f8c5'], ...patch })
const digest = (errors: GameError[]) => ({ errors }) as GameDigest

describe('exercícios a partir dos erros', () => {
  it('pega os piores erros, no máximo três por partida', () => {
    const cards = cardsFromDigest('k', digest([error({ ply: 2, loss: 10 }), error({ ply: 4, loss: 40 }), error({ ply: 6, loss: 30 }), error({ ply: 8, loss: 20 })]), 'b', 'Fulano', START)
    expect(cards).toHaveLength(MAX_CARDS_PER_GAME)
    expect(cards.map((card) => card.id)).toEqual(['k:4', 'k:6', 'k:8'])
    expect(cards[0].label).toBe('Contra Fulano, lance 3')
    expect(isDue(cards[0], START)).toBe(true)
  })

  it('lance forçado não vira exercício', () => {
    expect(cardsFromDigest('k', digest([error({ fen: FORCED })]), 'w', 'x', START)).toHaveLength(0)
  })
})

describe('agenda de revisão', () => {
  const card = cardsFromDigest('k', digest([error()]), 'b', 'x', START)[0]

  it('errou: volta no mesmo dia. Acertou de primeira: demora mais', () => {
    const wrong = answerCard(card, 'again', START)
    const right = answerCard(card, 'good', START)
    expect(new Date(wrong.schedule.due).getTime()).toBeLessThanOrEqual(new Date(right.schedule.due).getTime())
    expect(new Date(wrong.schedule.due).getTime() - START.getTime()).toBeLessThan(86_400_000)
    expect(right.reviews).toBe(1)
  })

  it('acertar seguidas vezes afasta cada vez mais, e errar traz de volta', () => {
    let current = card
    let now = START
    const gaps: number[] = []
    for (let round = 0; round < 5; round += 1) {
      current = answerCard(current, 'good', now)
      const due = new Date(current.schedule.due)
      gaps.push(due.getTime() - now.getTime())
      now = due
    }
    for (let index = 1; index < gaps.length; index += 1) expect(gaps[index]).toBeGreaterThanOrEqual(gaps[index - 1])
    expect(gaps[4]).toBeGreaterThan(3 * 86_400_000)
    const forgotten = answerCard(current, 'again', now)
    expect(new Date(forgotten.schedule.due).getTime() - now.getTime()).toBeLessThan(2 * 86_400_000)
  })

  it('a agenda sobrevive a virar JSON', () => {
    const stored = JSON.parse(JSON.stringify(answerCard(card, 'good', START)))
    const next = answerCard(stored, 'good', days(10))
    expect(new Date(next.schedule.due).getTime()).toBeGreaterThan(days(10).getTime())
  })

  it('cartão apagado nunca fica devido', () => {
    expect(isDue({ ...card, deletedAt: 1 }, START)).toBe(false)
  })

  it('texto da próxima revisão', () => {
    const at = (due: Date) => ({ ...card, schedule: { ...card.schedule, due: due.toISOString() } })
    expect(dueLabel(at(days(-1)), START)).toBe('hoje')
    expect(dueLabel(at(days(0.3)), START)).toBe('ainda hoje')
    expect(dueLabel(at(days(1)), START)).toBe('amanhã')
    expect(dueLabel(at(days(7)), START)).toBe('em 7 dias')
  })

  it('linha de abertura tem id estável, para não duplicar', () => {
    expect(lineCard('italiana', 'Italiana', ['e4', 'e5'], 'w', START).id).toBe(lineCard('italiana', 'Outro nome', ['e4', 'e5'], 'w', days(3)).id)
  })
})

describe('sequência de dias', () => {
  const at = (hours: number) => new Date(2026, 10, 5, hours)

  it('o primeiro exercício conta um dia', () => {
    const state = afterExercise(EMPTY_DAILY, at(10))
    expect(state).toMatchObject({ streak: 1, doneToday: 1, total: 1, best: 1, lastDay: dayOf(at(10)) })
  })

  it('mais exercícios no mesmo dia não aumentam a sequência', () => {
    const state = afterExercise(afterExercise(EMPTY_DAILY, at(10)), at(22))
    expect(state).toMatchObject({ streak: 1, doneToday: 2, total: 2 })
  })

  it('dia seguinte soma; pular um dia recomeça; o recorde fica', () => {
    let state = afterExercise(EMPTY_DAILY, new Date(2026, 10, 5, 23, 50))
    state = afterExercise(state, new Date(2026, 10, 6, 0, 10))
    expect(state.streak).toBe(2)
    state = afterExercise(state, new Date(2026, 10, 7, 12))
    expect(state.streak).toBe(3)
    state = afterExercise(state, new Date(2026, 10, 9, 12))
    expect(state).toMatchObject({ streak: 1, best: 3, doneToday: 1 })
  })

  it('funciona na virada do mês e do ano', () => {
    const state = afterExercise(afterExercise(EMPTY_DAILY, new Date(2026, 11, 31, 12)), new Date(2027, 0, 1, 12))
    expect(state.streak).toBe(2)
  })

  it('ao abrir o app: ontem ainda vale, anteontem zera, e o contador de hoje recomeça', () => {
    const state = afterExercise(EMPTY_DAILY, new Date(2026, 10, 5, 12))
    expect(currentDaily(state, new Date(2026, 10, 5, 18))).toMatchObject({ streak: 1, doneToday: 1 })
    expect(currentDaily(state, new Date(2026, 10, 6, 12))).toMatchObject({ streak: 1, doneToday: 0 })
    expect(currentDaily(state, new Date(2026, 10, 7, 12))).toMatchObject({ streak: 0, doneToday: 0 })
  })

  it('sessão começa pelos mais atrasados e respeita o limite', () => {
    const card = (due: string) => ({ schedule: { due } })
    const pick = pickSession([card('2026-11-03'), card('2026-11-01'), card('2026-11-02')], 2)
    expect(pick.items.map((item) => item.schedule.due)).toEqual(['2026-11-01', '2026-11-02'])
    expect(pick.remaining).toBe(1)
  })
})

describe('linhas', () => {
  it('calcula a posição depois de cada lance', () => {
    const steps = lineSteps(['e4', 'e5', 'Nf3'])
    expect(steps.map((step) => step.uci)).toEqual(['e2e4', 'e7e5', 'g1f3'])
    expect(steps[2].fen.split(' ')[1]).toBe('b')
  })

  it('aceita começar de outra posição', () => {
    const steps = lineSteps(['Nf6'], FEN)
    expect(steps[0].from).toBe('g8')
  })

  it('lance impossível é erro, para os testes do guia pegarem', () => {
    expect(() => lineSteps(['e5'])).toThrow()
  })
})
