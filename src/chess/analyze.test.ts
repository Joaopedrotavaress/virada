import { createRequire } from 'node:module'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { EngineAbortError, UciEngine } from '../engine/stockfish'
import { analyzeGame, type GameAnalysis } from './analyze'
import { CLASS_INFO, isErrorClass } from './classify'
import { coachComment } from './comment'
import { formatEval, whiteWinPercent } from './evaluation'
import { sanToPt } from './notation'
import { parsePgn } from './pgn'
import { SAMPLE_PGN } from './sample'

const require = createRequire(import.meta.url)

/** Mesmo motor do navegador (lite single), mas falando com o Node. Testa de verdade a fila UCI. */
function nodeEngine(): UciEngine {
  const load = require('stockfish') as (flavor: string, onLine: (line: string) => void) => { processCommand(c: string): void; terminate(): void }
  let handler: (line: string) => void = () => {}
  const stockfish = load('lite-single', (line) => handler(line))
  return new UciEngine({
    // Adiado como o postMessage do Worker: chamar o WASM de dentro do próprio callback trava.
    send: (command) => void setImmediate(() => stockfish.processCommand(command)),
    onLine: (next) => {
      handler = next
    },
    onFailure: () => {},
    close: () => stockfish.terminate(),
  })
}

describe('análise completa com Stockfish real', () => {
  let engine: UciEngine
  let analysis: GameAnalysis

  beforeAll(async () => {
    engine = nodeEngine()
    await engine.ready
    analysis = await analyzeGame(engine, parsePgn(SAMPLE_PGN), 15)
    // Relatório para conferir a olho.
    console.log(
      analysis.moves
        .map((move) => {
          const best = analysis.positions[move.ply - 1].bestUci
          return `${String(move.moveNumber).padStart(2)}${move.color === 'w' ? '.  ' : '...'} ${sanToPt(move.san).padEnd(8)} ${formatEval(analysis.positions[move.ply].eval).padStart(6)}  perda ${move.loss.toFixed(1).padStart(5)}  ${CLASS_INFO[move.cls].label.padEnd(15)} melhor ${best}`
        })
        .join('\n'),
    )
    console.log('precisão brancas', analysis.summary.w.accuracy?.toFixed(1), 'pretas', analysis.summary.b.accuracy?.toFixed(1))
  })

  afterAll(() => engine.terminate())

  it('avalia todas as posições', () => {
    expect(analysis.positions).toHaveLength(34)
    expect(analysis.moves).toHaveLength(33)
  })

  it('o xeque-mate final sai direto das regras, sem motor', () => {
    const last = analysis.positions[33]
    expect(last.eval).toEqual({ kind: 'mate', moves: 0, winner: 'w' })
    expect(last.bestUci).toBeNull()
    expect(whiteWinPercent(last.eval)).toBe(100)
  })

  it('reconhece os lances de mate como Melhor', () => {
    const [queenSac, mateMove] = analysis.moves.filter((move) => move.san === 'Qb8+' || move.san === 'Rd8#')
    expect(mateMove.cls).toBe('best')
    expect(queenSac.cls).toBe('best')
    expect(analysis.positions[30].eval).toEqual({ kind: 'mate', moves: 2, winner: 'w' })
  })

  it('na profundidade padrão, o sacrifício 15. Bxd7+ não é marcado como erro', () => {
    const sacrifice = analysis.moves.find((move) => move.san === 'Bxd7+')
    expect(sacrifice?.loss).toBeLessThan(10)
  })

  it('as brancas jogam melhor que as pretas nessa partida', () => {
    expect(analysis.summary.w.accuracy!).toBeGreaterThan(analysis.summary.b.accuracy!)
    const blackErrors = analysis.moves.filter((move) => move.color === 'b' && isErrorClass(move.cls))
    expect(blackErrors.length).toBeGreaterThan(0)
  })

  it('o resumo soma todos os lances', () => {
    const sum = (side: 'w' | 'b') => Object.values(analysis.summary[side].counts).reduce((a, b) => a + b, 0)
    expect(sum('w')).toBe(17)
    expect(sum('b')).toBe(16)
  })

  it('gera comentário para todos os lances, sem texto quebrado', () => {
    analysis.moves.forEach((move, index) => {
      const text = coachComment({
        move,
        before: analysis.positions[index],
        after: analysis.positions[index + 1],
        previousMove: analysis.moves[index - 1],
      })
      expect(text.length).toBeGreaterThan(10)
      expect(text).not.toMatch(/undefined|null|NaN/)
    })
  })

  it('o livro termina no lance que leva a mate: o mate do louco é erro, não teoria', async () => {
    const fools = await analyzeGame(engine, parsePgn('1. f3 e5 2. g4 Qh4# 0-1'), 12)
    expect(fools.moves[0].cls).toBe('book')
    expect(fools.moves[1].cls).toBe('book')
    expect(fools.moves[2].cls).toBe('blunder')
    expect(fools.moves[3].cls).toBe('best')
    expect(fools.opening?.name).toContain("Fool's Mate")
  })

  it('cancelar interrompe a análise e o motor continua utilizável', async () => {
    const controller = new AbortController()
    const game = parsePgn(SAMPLE_PGN)
    const running = analyzeGame(engine, game, 22, {
      signal: controller.signal,
      onProgress: (done) => {
        if (done === 2) controller.abort()
      },
    })
    await expect(running).rejects.toBeInstanceOf(EngineAbortError)
    const after = await engine.analyze(game.positions[0].fen, 8)
    expect(after.bestUci).toMatch(/^[a-h][1-8][a-h][1-8]/)
  })

  it('uma busca nova não recebe o bestmove da busca cancelada', async () => {
    const controller = new AbortController()
    const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'
    const cancelled = engine.analyze(parsePgn(SAMPLE_PGN).positions[0].fen, 30, { signal: controller.signal })
    const next = engine.analyze(fen, 6)
    controller.abort()
    await expect(cancelled).rejects.toBeInstanceOf(EngineAbortError)
    expect((await next).bestUci).toBe('d1d8')
  })
})
