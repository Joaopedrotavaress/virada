import { createRequire } from 'node:module'
import { Chess } from 'chess.js'
import { expect } from 'vitest'
import { UciEngine } from '../engine/stockfish'
import type { GameAnalysis } from './analyze'
import { CLASS_INFO, MOVE_CLASSES, isErrorClass } from './classify'
import { coachComment } from './comment'
import { formatEval, whiteWinPercent } from './evaluation'
import { detectMotifs, explainMotifs } from './motifs'
import { formatLinePt, pvToSan, sanToPt, uciToSan } from './notation'

const require = createRequire(import.meta.url)

export function nodeEngine(): UciEngine {
  const load = require('stockfish') as (flavor: string, onLine: (line: string) => void) => { processCommand(c: string): void; terminate(): void }
  let handler: (line: string) => void = () => {}
  const stockfish = load('lite-single', (line) => handler(line))
  return new UciEngine({
    send: (command) => void setImmediate(() => stockfish.processCommand(command)),
    onLine: (next) => {
      handler = next
    },
    onFailure: () => {},
    close: () => stockfish.terminate(),
  })
}


/** Tudo o que a interface vai calcular para mostrar uma partida: nada pode quebrar nem sair sem sentido. */
export function checkAnalysis(analysis: GameAnalysis) {
  const { moves, positions, summary } = analysis
  expect(positions.length).toBe(moves.length + 1)

  const wins = positions.map((position) => whiteWinPercent(position.eval))
  for (const win of wins) {
    expect(win).toBeGreaterThanOrEqual(0)
    expect(win).toBeLessThanOrEqual(100)
  }

  moves.forEach((move, index) => {
    const before = positions[index]
    const after = positions[index + 1]
    expect(MOVE_CLASSES).toContain(move.cls)
    expect(move.loss).toBeGreaterThanOrEqual(0)
    expect(move.accuracy).toBeGreaterThanOrEqual(0)
    expect(move.accuracy).toBeLessThanOrEqual(100)
    expect(Number.isFinite(move.loss)).toBe(true)

    // O lance registrado leva mesmo de uma posição à outra.
    const replay = new Chess(before.fen)
    expect(replay.move({ from: move.from, to: move.to, promotion: move.uci[4] }).after).toBe(after.fen)

    // Quem não terminou a partida tem melhor lance legal.
    if (!before.terminal) {
      expect(before.bestUci).toBeTruthy()
      expect(uciToSan(before.fen, before.bestUci)).toBeTruthy()
    }

    for (const revealBest of [true, false]) {
      for (const isUserMove of [true, false]) {
        const text = coachComment({ move, before, after, previousMove: moves[index - 1], isUserMove, revealBest })
        expect(text.length).toBeGreaterThan(5)
        expect(text).not.toMatch(/undefined|null|NaN|\[object|\.\.\.\.|\s{2,}|^\s|\s$/)
      }
    }

    const motifs = detectMotifs({
      color: move.color,
      uci: move.uci,
      beforeFen: before.fen,
      afterFen: after.fen,
      beforeEval: before.eval,
      afterEval: after.eval,
      bestUci: before.bestUci,
      beforePv: before.pvUci,
      afterPv: after.pvUci,
    })
    const explained = explainMotifs(motifs, { color: move.color, isUser: true })
    if (explained) expect(explained).not.toMatch(/undefined|null|NaN|\[object/)

    expect(formatEval(after.eval)).toMatch(/^([+−]\d+,\d|0,0|−?M\d+|1-0|0-1)$/)
    expect(sanToPt(move.san)).not.toMatch(/[NQK]/)
    const line = pvToSan(before.fen, before.pvUci, 6)
    if (line.length > 0) expect(formatLinePt(before.fen, line)).not.toMatch(/undefined|NaN/)
    if (isErrorClass(move.cls)) expect(CLASS_INFO[move.cls].label).toBeTruthy()
  })

  for (const side of ['w', 'b'] as const) {
    const own = moves.filter((move) => move.color === side)
    expect(Object.values(summary[side].counts).reduce((a, b) => a + b, 0)).toBe(own.length)
    if (summary[side].accuracy !== null) {
      expect(summary[side].accuracy).toBeGreaterThanOrEqual(0)
      expect(summary[side].accuracy).toBeLessThanOrEqual(100)
    }
  }

  // A análise precisa sobreviver ao localStorage.
  expect(JSON.parse(JSON.stringify(analysis)).moves.length).toBe(moves.length)

  return wins
}

