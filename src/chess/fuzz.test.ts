import { Chess } from 'chess.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { UciEngine } from '../engine/stockfish'
import { analyzeGame } from './analyze'
import { clockInsights, computeClock, swingOf } from './clock'
import { parsePgn } from './pgn'
import { checkAnalysis, nodeEngine } from './testkit'

/** Gerador com semente: a mesma partida sai de novo se um teste falhar. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

/** Partida com lances aleatórios (com viés para capturas), até acabar: gera finais raros de propósito. */
function randomGame(seed: number, maxPlies = 400, fen?: string): string {
  const random = seeded(seed)
  const chess = fen ? new Chess(fen) : new Chess()
  for (let ply = 0; ply < maxPlies && !chess.isGameOver(); ply += 1) {
    const moves = chess.moves({ verbose: true })
    const captures = moves.filter((move) => move.captured)
    const pool = captures.length > 0 && random() < 0.6 ? captures : moves
    chess.move(pool[Math.floor(random() * pool.length)])
  }
  if (fen) chess.setHeader('FEN', fen)
  chess.setHeader('White', `Aleatório ${seed}`)
  chess.setHeader('Black', 'Outro "com aspas"')
  chess.setHeader('Result', chess.isCheckmate() ? (chess.turn() === 'w' ? '0-1' : '1-0') : chess.isDraw() ? '1/2-1/2' : '*')
  return chess.pgn()
}

const GAMES = Number(process.env.FUZZ_GAMES ?? 6)
const DEPTH = Number(process.env.FUZZ_DEPTH ?? 5)

describe('partidas aleatórias', () => {
  let engine: UciEngine
  const endings: Record<string, number> = {}

  beforeAll(async () => {
    engine = nodeEngine()
    await engine.ready
  })
  afterAll(() => {
    engine.terminate()
    console.log('finais encontrados:', JSON.stringify(endings))
  })

  it(`${GAMES} partidas chegam até o fim sem nada quebrar`, async () => {
    for (let seed = 1; seed <= GAMES; seed += 1) {
      const pgn = randomGame(seed * 7919)
      const game = parsePgn(pgn)
      expect(game.black).toBe('Outro "com aspas"')
      const ending = game.positions[game.positions.length - 1].terminal ?? 'sem fim'
      endings[ending] = (endings[ending] ?? 0) + 1
      const analysis = await analyzeGame(engine, game, DEPTH)
      const wins = checkAnalysis(analysis)

      // Relógio sintético: o cálculo e as frases também não podem quebrar.
      const random = seeded(seed * 104729)
      const clockMoves = game.moves
      let w = 300
      let b = 300
      const clocks = clockMoves.map((move) => {
        const spent = random() * 20
        if (move.color === 'w') w = Math.max(0, w - spent + 2)
        else b = Math.max(0, b - spent + 2)
        return move.color === 'w' ? w : b
      })
      const data = computeClock(clockMoves, clocks, '300+2')!
      expect(data.spent.every((value) => value !== null && value >= 0)).toBe(true)
      const insightMoves = analysis.moves.map((move, index) => ({ color: move.color, moveNumber: move.moveNumber, cls: move.cls, swing: swingOf(wins, index) }))
      for (const sentence of [...clockInsights(insightMoves, data, 'w', true), ...clockInsights(insightMoves, data, 'b', false)]) {
        expect(sentence).not.toMatch(/undefined|null|NaN/)
      }
    }
  }, 600_000)

  it('partidas a partir de posições raras', async () => {
    const positions = [
      '8/P6k/8/8/8/8/8/K7 w - - 0 1', // promoção
      '7k/8/8/3pP3/8/8/8/K7 w - d6 0 1', // en passant já no início
      'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', // roque com as pretas jogando primeiro
      '8/8/8/8/8/5k2/6q1/7K w - - 0 1', // quem começa já está em mate
      '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', // quem começa já está afogado
      'k7/8/8/8/8/8/8/K7 w - - 0 1', // material insuficiente de saída
      '4k3/P7/8/8/8/8/p7/4K3 w - - 99 80', // regra dos 50 lances quase no limite
    ]
    for (const [index, fen] of positions.entries()) {
      const chess = new Chess(fen)
      if (chess.isGameOver()) {
        // Sem lances, o PGN é recusado com mensagem clara em vez de quebrar.
        expect(() => parsePgn(`[FEN "${fen}"]\n\n*`)).toThrow(/nenhum lance/)
        continue
      }
      const game = parsePgn(randomGame(31 * (index + 1), 60, fen))
      checkAnalysis(await analyzeGame(engine, game, DEPTH))
    }
  }, 300_000)
})
