import { Chess, type Square } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { AULAS, type Frame } from './aulas'
import { LESSONS } from './lessons'
import { LEVELS, allRoadmapLessons, framesWithFens } from '../learn/roadmap'

const SQUARE = /^[a-h][1-8]$/

describe('as aulas em tabuleiro', () => {
  it('toda aula tem demonstração, frase para levar e prática', () => {
    for (const lesson of LESSONS) {
      expect(lesson.frames?.length, lesson.id).toBeGreaterThan(0)
      expect(lesson.takeaway, lesson.id).toBeTruthy()
      expect(lesson.positions.length > 0 || Boolean(lesson.puzzleTheme) || Boolean(lesson.link), lesson.id).toBe(true)
    }
  })

  it('não há aula sobrando no conteúdo', () => {
    const ids = new Set(LESSONS.map((lesson) => lesson.id))
    for (const id of Object.keys(AULAS)) expect(ids.has(id), id).toBe(true)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.title}: os lances, as casas e os mates estão certos`, () => {
      const frames = lesson.frames as Frame[]
      expect(frames[0].fen, 'o primeiro quadro precisa de posição').toBeTruthy()
      const steps = framesWithFens(frames)
      frames.forEach((frame, index) => {
        const where = `${lesson.id} quadro ${index}`
        expect(frame.say.length, where).toBeGreaterThan(0)
        expect(frame.say.length, `${where}: frase comprida demais`).toBeLessThanOrEqual(150)
        expect(steps[index].fen, where).toBeTruthy()
        for (const square of [...(frame.good ?? []), ...(frame.bad ?? []), ...(frame.focus ?? [])]) expect(square, where).toMatch(SQUARE)
        for (const [from, to] of [...(frame.arrows ?? []), ...(frame.threats ?? [])]) {
          expect(from, where).toMatch(SQUARE)
          expect(to, where).toMatch(SQUARE)
        }
        const chess = new Chess(steps[index].fen)
        if (frame.reach) {
          expect(chess.get(frame.reach as Square), `${where}: sem peça em ${frame.reach}`).toBeTruthy()
          expect(chess.moves({ square: frame.reach as Square }).length, `${where}: ${frame.reach} não tem lance`).toBeGreaterThan(0)
        }
        if (frame.move?.endsWith('#')) expect(chess.isCheckmate(), where).toBe(true)
        if (/\bmate\b/i.test(frame.say) && frame.move && !frame.move.endsWith('#') && /^mate/i.test(frame.say)) expect(chess.isCheckmate(), where).toBe(true)
      })
    })
  }

  it('afogamento e xeque nas posições citadas', () => {
    expect(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').isStalemate()).toBe(true)
    const trap = new Chess('k7/8/1K6/8/8/8/2Q5/8 w - - 0 1')
    trap.move('Qc7')
    expect(trap.isStalemate()).toBe(true)
  })

  it('os vídeos têm o formato de endereço do YouTube', () => {
    for (const lesson of LESSONS) for (const video of lesson.videos ?? []) expect(video.id, lesson.id).toMatch(/^[\w-]{11}$/)
  })
})

describe('o roteiro', () => {
  it('tem os quatro níveis, nessa ordem', () => {
    expect(LEVELS.map((level) => level.title)).toEqual(['Iniciante', 'Básico', 'Intermediário', 'Avançado'])
  })

  it('cobre todas as aulas, cada uma uma vez', () => {
    const ids = allRoadmapLessons()
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(LESSONS.map((lesson) => lesson.id).sort())
  })
})
