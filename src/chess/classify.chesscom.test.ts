import { describe, expect, it } from 'vitest'
import { type PositionEval, classifyMoves, summarize } from './classify'
import type { Color } from './evaluation'
import fixture from './caso-chesscom.fixture.json'

/**
 * Uma partida real de 10 minutos, rating 324 contra 294, comparada com o resumo do Chess.com.
 * As brancas receberam lá: 4 "!" (Excelente), 11 Melhores e 6 polegares (Ótimo).
 */
const moves = fixture.moves as { uci: string; san: string; color: Color; book: boolean }[]
const classified = classifyMoves(moves, fixture.positions as (PositionEval & { fen: string })[], moves.map((move) => move.book), fixture.ratings)
const whites = summarize(classified.map((move, index) => ({ ...move, color: moves[index].color }))).w.counts
const classOfSan = (san: string, color: Color) => classified[moves.findIndex((move) => move.san === san && move.color === color)].cls

describe('a partida comparada com o Chess.com', () => {
  it('Melhor mais "!" são os lances do motor: 15, como lá', () => {
    expect(whites.best + whites.great + whites.brilliant).toBe(15)
  })

  it('dá uma quantidade de "!" perto dos 4 de lá', () => {
    expect(whites.great).toBeGreaterThanOrEqual(3)
    expect(whites.great).toBeLessThanOrEqual(5)
  })

  it('com rating baixo, pegar a peça que decide a partida conta como "!"', () => {
    expect(classOfSan('Kxc1', 'w')).toBe('great')
    expect(classOfSan('axb3', 'w')).toBe('great')
  })

  it('lance fora do primeiro do motor nunca é Melhor', () => {
    expect(classOfSan('Na3', 'w')).toBe('excellent')
    expect(classOfSan('O-O', 'w')).toBe('excellent')
  })
})
