import { createRequire } from 'node:module'
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { parsePgn } from '../chess/pgn'
import type { EngineResult } from '../engine/stockfish'
import { UciEngine } from '../engine/stockfish'
import { BOTS, buildBotPgn, pickBotMove, swapSideFen, thinkingDelay } from './bots'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const clube = BOTS.find((bot) => bot.id === 'clube')!
const mestre = BOTS.find((bot) => bot.id === 'mestre')!
const iniciante = BOTS.find((bot) => bot.id === 'iniciante')!

const result = (lines: [string, number][]): EngineResult => ({
  bestUci: lines[0][0],
  pvUci: [lines[0][0]],
  depth: 10,
  eval: { kind: 'cp', cp: lines[0][1] },
  lines: lines.map(([uci, cp]) => ({ pvUci: [uci], depth: 10, eval: { kind: 'cp', cp } })),
})

/** Sequência fixa de "sorteios" para os testes não dependerem da sorte. */
const rolls = (...values: number[]) => {
  let index = 0
  return () => values[index++ % values.length]
}

describe('escolha do lance do bot', () => {
  const lines = result([
    ['e2e4', 30],
    ['d2d4', 20],
    ['a2a3', -300],
  ])

  it('sem sorteio joga o melhor', () => {
    expect(pickBotMove(lines, clube, START, rolls(0.99))).toBe('e2e4')
    expect(pickBotMove(lines, mestre, START, rolls(0))).toBe('e2e4')
  })

  it('o sorteio pondera: lance muito pior sai bem menos', () => {
    const seen: Record<string, number> = {}
    let seed = 1
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let index = 0; index < 4000; index += 1) {
      const move = pickBotMove(lines, { ...clube, varyChance: 1 }, START, random)!
      seen[move] = (seen[move] ?? 0) + 1
    }
    expect(seen.e2e4).toBeGreaterThan(seen.a2a3 ?? 0)
    expect(seen.d2d4).toBeGreaterThan((seen.a2a3 ?? 0) * 5)
    expect(seen.a2a3 ?? 0).toBeLessThan(200)
  })

  it('do ponto de vista das pretas, avaliação mais baixa é melhor', () => {
    const black = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    const options = result([
      ['e7e5', -20],
      ['a7a6', 400],
    ])
    const seen: Record<string, number> = {}
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let index = 0; index < 2000; index += 1) {
      const move = pickBotMove(options, { ...clube, varyChance: 1 }, black, random)!
      seen[move] = (seen[move] ?? 0) + 1
    }
    expect(seen.e7e5).toBeGreaterThan((seen.a7a6 ?? 0) * 10)
  })

  it('o iniciante às vezes joga qualquer lance legal', () => {
    const move = pickBotMove(lines, iniciante, START, rolls(0.01, 0))
    expect(new Chess(START).moves({ verbose: true }).map((item) => item.lan)).toContain(move)
    expect(move).not.toBe('e2e4')
  })

  it('o sorteio não vale para bots sem MultiPV', () => {
    expect(pickBotMove(result([['e2e4', 30]]), { ...clube, multiPv: 1 }, START, rolls(0))).toBe('e2e4')
  })

  it('a espera fica entre 0,5 s e 2 s', () => {
    expect(thinkingDelay(() => 0)).toBe(500)
    expect(thinkingDelay(() => 1)).toBe(2000)
  })
})

describe('configuração dos bots', () => {
  it('até 1200 usa Skill Level de 0 a 5; a partir daí, UCI_Elo', () => {
    const limited = BOTS.filter((bot) => bot.options.UCI_LimitStrength)
    const weak = BOTS.filter((bot) => !bot.options.UCI_LimitStrength && bot.id !== 'mestre')
    expect(weak.map((bot) => bot.options['Skill Level'])).toEqual([0, 1, 2, 3, 5])
    for (const bot of weak) expect(bot.multiPv).toBe(3)
    // O motor só aceita UCI_Elo a partir de 1320, e os níveis precisam subir em ordem.
    const elos = limited.map((bot) => Number(bot.options.UCI_Elo))
    expect(elos).toEqual([1400, 1600, 1800, 2000, 2200, 2500])
    expect(Math.min(...elos)).toBeGreaterThanOrEqual(1320)
    expect(BOTS.find((bot) => bot.id === 'mestre')!.options).toMatchObject({ UCI_LimitStrength: false, 'Skill Level': 20 })
    expect(BOTS).toHaveLength(12)
    expect(new Set(BOTS.map((bot) => bot.id)).size).toBe(12)
  })
})

describe('qual a ameaça', () => {
  it('troca a vez e limpa o en passant', () => {
    expect(swapSideFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2')).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2')
  })

  it('não vale para quem está em xeque', () => {
    expect(swapSideFen('rnb1kbnr/pppp1ppp/8/4p3/7q/8/PPPPPPPP/RNBQKBNR w KQkq - 1 3')).not.toBeNull()
    expect(swapSideFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).toBeNull()
  })
})

describe('PGN gerado', () => {
  it('volta a ser lido pela análise', () => {
    const pgn = buildBotPgn(['f3', 'e5', 'g4', 'Qh4#'], { white: 'Você', black: 'Clube (~1200)', result: '0-1', date: new Date(2026, 10, 5), termination: 'Xeque-mate' })
    const game = parsePgn(pgn)
    expect(game.white).toBe('Você')
    expect(game.black).toBe('Clube (~1200)')
    expect(game.result).toBe('0-1')
    expect(game.date).toBe('2026.11.05')
    expect(game.moves).toHaveLength(4)
    expect(game.positions[4].terminal).toBe('checkmate')
  })
})

describe('bots com Stockfish real', () => {
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

  // O pacote em Node só aceita um motor por processo: aqui as opções mudam a cada lance.
  // Os dois Workers de verdade são testados no navegador.
  async function play(white: (typeof BOTS)[number], black: (typeof BOTS)[number], engine: UciEngine) {
    const chess = new Chess()
    await engine.newGame()
    for (let ply = 0; ply < 200 && !chess.isGameOver(); ply += 1) {
      const bot = chess.turn() === 'w' ? white : black
      await engine.configure(bot.options)
      const answer = await engine.analyze(chess.fen(), null, { movetime: Math.min(bot.movetime, 60), multiPv: bot.multiPv })
      const uci = pickBotMove(answer, bot, chess.fen())
      chess.move({ from: uci!.slice(0, 2), to: uci!.slice(2, 4), promotion: uci![4] })
    }
    return chess
  }

  it('todos os níveis jogam só lances legais e o Mestre vence o Iniciante', async () => {
    const engine = nodeEngine()
    await engine.ready
    const game = await play(mestre, iniciante, engine)
    expect(game.isCheckmate()).toBe(true)
    expect(game.turn()).toBe('b')
    // Cada nível precisa aceitar suas opções e devolver lance.
    for (const bot of BOTS) {
      await engine.configure(bot.options)
      const answer = await engine.analyze(START, null, { movetime: 30, multiPv: bot.multiPv })
      expect(pickBotMove(answer, bot, START)).toMatch(/^[a-h][1-8][a-h][1-8]/)
    }
    engine.terminate()
  })
})
