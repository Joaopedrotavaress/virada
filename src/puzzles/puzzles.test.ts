import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { GameRecord } from '../data/library'
import { EMPTY_PUZZLE_STATS, LEVELS, THEMES, type Puzzle, afterSolved, loadPuzzles, pickPuzzles, puzzleOfDay, suggestedLevel, toPuzzle, morePuzzles } from './puzzles'

const puzzle = (id: string, rating: number, themes = ['fork']): Puzzle => ({ id, fen: '', setup: { from: 'a2', to: 'a3' }, solution: [], rating, themes })

describe('base de puzzles', () => {
  it('é legal do começo ao fim, com a pessoa jogando depois do lance do adversário', async () => {
    const puzzles = await loadPuzzles()
    expect(puzzles.length).toBeGreaterThan(1500)
    for (const item of puzzles) {
      const chess = new Chess(item.fen)
      for (const san of item.solution) chess.move(san)
      expect(item.solution.length % 2, item.id).toBe(1)
    }
  })

  it('todos os temas têm puzzles em todas as faixas', async () => {
    const puzzles = await loadPuzzles()
    for (const theme of THEMES) {
      for (const level of LEVELS) {
        const count = puzzles.filter((item) => item.themes.includes(theme.id) && item.rating >= level.min && item.rating < level.max).length
        expect(count, `${theme.id} em ${level.id}`).toBeGreaterThanOrEqual(10)
      }
    }
  })

  it('converte a linha da base', () => {
    const item = toPuzzle(['abc', 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24', 'f2g3 e6e7 b2b1 b3c1 b1c1 h6c1', 1600, 'fork mateIn1'])
    expect(item.setup).toEqual({ from: 'f2', to: 'g3' })
    expect(item.fen.split(' ')[1]).toBe('w')
    expect(item.solution[0]).toBe('Rxe7')
    expect(item.themes).toEqual(['fork', 'mateIn1'])
  })
})

describe('escolha de puzzles', () => {
  const list = [puzzle('a', 900), puzzle('b', 1100), puzzle('c', 1200, ['pin']), puzzle('d', 1500), puzzle('e', 2000)]

  it('o puzzle do dia não muda no mesmo dia e muda entre dias', async () => {
    const puzzles = await loadPuzzles()
    const today = puzzleOfDay(puzzles, '2026-11-05', 'medio')
    expect(puzzleOfDay(puzzles, '2026-11-05', 'medio')?.id).toBe(today?.id)
    const days = Array.from({ length: 10 }, (_, index) => puzzleOfDay(puzzles, `2026-11-${String(index + 10)}`, 'medio')?.id)
    expect(new Set(days).size).toBeGreaterThan(5)
    expect(today!.rating).toBeGreaterThanOrEqual(1000)
    expect(today!.rating).toBeLessThan(1400)
  })

  it('sem puzzles na faixa, não inventa', () => {
    expect(puzzleOfDay([], '2026-11-05', 'medio')).toBeNull()
  })

  it('filtra por tema e dificuldade, deixando os resolvidos por último', () => {
    const random = () => 0.5
    expect(pickPuzzles(list, { theme: 'pin', random }).map((item) => item.id)).toEqual(['c'])
    expect(pickPuzzles(list, { levelId: 'medio', random }).map((item) => item.id)).toEqual(['b', 'c'])
    expect(pickPuzzles(list, { levelId: 'medio', solved: new Set(['b']), random }).map((item) => item.id)).toEqual(['c', 'b'])
    expect(pickPuzzles(list, { theme: 'nao-existe', random })).toEqual([])
    expect(pickPuzzles(list, { limit: 2, random })).toHaveLength(2)
  })

  it('sugere a dificuldade pelo rating das partidas', () => {
    const record = (whiteRating?: number) => ({ userColor: 'w', whiteRating }) as GameRecord
    expect(suggestedLevel([])).toBe('medio')
    expect(suggestedLevel([record(700)])).toBe('facil')
    expect(suggestedLevel([record(1500), record(1700)])).toBe('dificil')
    expect(suggestedLevel([record(2500)])).toBe('avancado')
  })

  it('guarda o que foi resolvido, sem repetir', () => {
    const once = afterSolved(EMPTY_PUZZLE_STATS, 'a', '2026-11-05')
    expect(once).toEqual({ solved: ['a'], dailyDone: '2026-11-05' })
    expect(afterSolved(once, 'a').solved).toEqual(['a'])
    expect(afterSolved(once, 'b').dailyDone).toBe('2026-11-05')
  })
})

describe('rodada sem fim', () => {
  const make = (id: string, rating = 1200): Puzzle => ({ id, fen: '', setup: { from: 'a1', to: 'a2' }, solution: [], rating, themes: ['fork'] })
  const pool = ['a', 'b', 'c'].map((id) => make(id))

  it('traz só o que ainda não apareceu nesta rodada', () => {
    expect(morePuzzles(pool, { levelId: 'medio' }, new Set(['a', 'b'])).map((puzzle) => puzzle.id)).toEqual(['c'])
  })

  it('quando acabam, volta a repetir em vez de parar', () => {
    expect(morePuzzles(pool, { levelId: 'medio' }, new Set(['a', 'b', 'c']))).toHaveLength(3)
  })

  it('não mistura outra dificuldade para continuar', () => {
    expect(morePuzzles([...pool, make('facil', 500)], { levelId: 'medio' }, new Set(['a', 'b', 'c'])).map((puzzle) => puzzle.id)).not.toContain('facil')
  })

  it('abre milhares de puzzles sem calcular os lances, e calcula quando vai para o tabuleiro', async () => {
    const list = await loadPuzzles()
    const started = performance.now()
    const picked = pickPuzzles(list, { levelId: 'medio', limit: 20 })
    expect(performance.now() - started).toBeLessThan(500)
    expect(picked).toHaveLength(20)
    expect(picked[0].fen.split(' ')).toHaveLength(6)
    expect(picked[0].solution.length).toBeGreaterThan(0)
  })
})
