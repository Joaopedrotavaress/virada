import { Chess } from 'chess.js'
import { afterAll, describe, expect, it } from 'vitest'
import { winPercentFor } from '../chess/evaluation'
import { nodeEngine } from '../chess/testkit'
import { LESSONS } from './lessons'

const engine = nodeEngine()
afterAll(() => engine.terminate())
const search = (fen: string) => engine.analyze(fen, 14, { movetime: 2500 })

describe('lições', () => {
  it('têm texto e ao menos um exercício ou puzzles para praticar', () => {
    const ids = new Set<string>()
    for (const lesson of LESSONS) {
      expect(ids.has(lesson.id), lesson.id).toBe(false)
      ids.add(lesson.id)
      expect(lesson.paragraphs.length, lesson.id).toBeGreaterThan(0)
      expect(lesson.positions.length > 0 || Boolean(lesson.puzzleTheme) || Boolean(lesson.link), lesson.id).toBe(true)
    }
  })

  for (const lesson of LESSONS) {
    lesson.positions.forEach((position, index) => {
      it(`${lesson.title} ${index + 1}: a solução funciona`, async () => {
        const chess = new Chess(position.fen)
        const side = chess.turn()
        // Lance da pessoa nos índices pares: o exercício pede sempre o lado com a vez.
        const firstFen = chess.fen()
        for (const san of position.solution) chess.move(san)
        if (position.goal === 'move') return
        if (position.goal === 'mate') {
          expect(chess.isCheckmate(), `${lesson.id}: ${chess.fen()}`).toBe(true)
          return
        }
        const final = await search(chess.fen())
        const win = winPercentFor(final.eval, side)
        const first = new Chess(firstFen)
        first.move(position.solution[0])
        const afterFirst = await search(first.fen())
        const afterFirstWin = winPercentFor(afterFirst.eval, side)
        if (position.goal === 'win') {
          expect(win, `${lesson.id} final ${JSON.stringify(final.eval)}`).toBeGreaterThanOrEqual(70)
          expect(afterFirstWin, `${lesson.id} primeiro lance ${JSON.stringify(afterFirst.eval)}`).toBeGreaterThanOrEqual(65)
        } else {
          expect(win, `${lesson.id} final ${JSON.stringify(final.eval)}`).toBeGreaterThanOrEqual(35)
          expect(afterFirstWin, `${lesson.id} primeiro lance ${JSON.stringify(afterFirst.eval)}`).toBeGreaterThanOrEqual(30)
        }
      })
    })
  }
})
