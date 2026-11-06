import { afterAll, describe, expect, it } from 'vitest'
import { analyzeGame } from './analyze'
import { CLASS_VERSION, type MoveClass } from './classify'
import { parsePgn } from './pgn'
import { SAMPLE_PGN } from './sample'
import { nodeEngine } from './testkit'

const engine = nodeEngine()
afterAll(() => engine.terminate())

const classesOf = async (pgn: string) => {
  const analysis = await analyzeGame(engine, parsePgn(pgn), 12)
  return { analysis, bySan: (san: string) => analysis.moves.filter((move) => move.san === san).map((move) => move.cls as MoveClass) }
}

describe('com o Stockfish de verdade', () => {
  it('a Ópera de Morphy: a dama entregue é Brilhante e o mate é Melhor', async () => {
    const { analysis, bySan } = await classesOf(SAMPLE_PGN)
    expect(bySan('Qb8+')).toEqual(['brilliant'])
    expect(bySan('Rd8#')).toEqual(['best'])
    expect(bySan('e4')).toEqual(['book'])
    expect(analysis.classVersion).toBe(CLASS_VERSION)
  }, 120_000)

  it('o mate do pastor: quem deixa é Erro grosseiro, quem dá é Melhor', async () => {
    const { bySan } = await classesOf('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
    expect(bySan('Nf6')).toEqual(['blunder'])
    expect(bySan('Qxf7#')).toEqual(['best'])
  }, 60_000)

  it('o rating do PGN muda o julgamento e fica guardado', async () => {
    const pgn = (rating: number) => `[WhiteElo "${rating}"]\n[BlackElo "${rating}"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Qe2 Nxe4 *`
    const { analysis } = await classesOf(pgn(900))
    expect(analysis.ratings).toEqual({ w: 900, b: 900 })
    const strong = await classesOf(pgn(2200))
    const lost = (moves: typeof analysis.moves) => moves.reduce((sum, move) => sum + (move.pointsLost ?? 0), 0)
    expect(lost(strong.analysis.moves)).toBeGreaterThanOrEqual(lost(analysis.moves))
  }, 120_000)

  it('sem rating no PGN, não quebra', async () => {
    const { analysis } = await classesOf('1. d4 d5 2. c4 *')
    expect(analysis.ratings).toEqual({ w: null, b: null })
  }, 60_000)
})
