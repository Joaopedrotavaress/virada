import { createRequire } from 'node:module'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { UciEngine } from '../engine/stockfish'
import { analyzeGame } from './analyze'
import { CLASS_INFO, isErrorClass } from './classify'
import { coachComment } from './comment'
import { sanToPt } from './notation'
import { parsePgn } from './pgn'

const require = createRequire(import.meta.url)

function nodeEngine(): UciEngine {
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

const GAMES: Record<string, string> = {
  'Mate de Légal': '1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0',
  'Armadilha Blackburne': '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1',
  'Peça pendurada': '1. e4 e5 2. Nf3 Nf6 3. Bc4 Nc6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Qf3 cxb5 9. Qxa8 Bc5 *',
  'Dama perdida': '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. Nxd5 Nxd5 7. Bxd8 Bb4+ 8. Qd2 Bxd2+ 9. Kxd2 Kxd8 *',
}

describe('explicações em partidas reais', () => {
  let engine: UciEngine

  beforeAll(async () => {
    engine = nodeEngine()
    await engine.ready
  })
  afterAll(() => engine.terminate())

  for (const [name, pgn] of Object.entries(GAMES)) {
    it(name, async () => {
      const analysis = await analyzeGame(engine, parsePgn(pgn), 15)
      const report: string[] = []
      analysis.moves.forEach((move, index) => {
        const text = coachComment({ move, before: analysis.positions[index], after: analysis.positions[index + 1], previousMove: analysis.moves[index - 1], revealBest: true })
        expect(text).not.toMatch(/undefined|null|NaN|\[object/)
        if (isErrorClass(move.cls)) report.push(`  ${move.moveNumber}${move.color === 'w' ? '.' : '...'} ${sanToPt(move.san)} [${CLASS_INFO[move.cls].label}] ${text}`)
      })
      console.log(`${name}\n${report.join('\n')}`)
    })
  }
})
