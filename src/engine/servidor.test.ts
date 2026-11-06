import { describe, expect, it } from 'vitest'
import { analyzeGame } from '../chess/analyze'
import { parsePgn } from '../chess/pgn'
import { analyzeOnServer, resultFromWire } from './servidor'
import type { EngineLike, EngineResult } from './stockfish'

const FEN_B = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const FEN_W = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const wire = (i: number, value = 30) => ({ i, best: 'e2e4', lines: [{ depth: 18, score: { type: 'cp' as const, value }, pv: ['e2e4'] }, { depth: 18, score: { type: 'cp' as const, value: value - 40 }, pv: ['d2d4'] }] })
const stream = (chunks: string[]) => new Response(new ReadableStream({ start(c) { for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk)); c.close() } }))

describe('motor no servidor', () => {
  it('passa a avaliação para o ponto de vista das brancas', () => {
    expect(resultFromWire(FEN_B, wire(0))?.eval).toEqual({ kind: 'cp', cp: -30 })
    expect(resultFromWire(FEN_W, wire(0))?.eval).toEqual({ kind: 'cp', cp: 30 })
    expect(resultFromWire(FEN_W, wire(0))?.lines).toHaveLength(2)
    expect(resultFromWire(FEN_W, { i: 0, erro: true })).toBeNull()
  })

  it('lê a resposta mesmo com as linhas partidas no meio', async () => {
    const text = `${JSON.stringify(wire(0))}\n${JSON.stringify(wire(1))}\n`
    const fetchFake = (async () => stream([text.slice(0, 20), text.slice(20)])) as typeof fetch
    const seen: string[] = []
    const found = await analyzeOnServer([FEN_W, FEN_B], 18, { fetch: fetchFake, onResult: (fen) => seen.push(fen) })
    expect(found.size).toBe(2)
    expect(seen).toEqual([FEN_W, FEN_B])
  })

  it('fora do ar, não quebra: devolve vazio', async () => {
    const fetchFake = (async () => {
      throw new TypeError('sem rede')
    }) as typeof fetch
    expect((await analyzeOnServer([FEN_W], 18, { fetch: fetchFake })).size).toBe(0)
  })

  it('com erro do servidor, também devolve vazio', async () => {
    const fetchFake = (async () => new Response('{}', { status: 429 })) as typeof fetch
    expect((await analyzeOnServer([FEN_W], 18, { fetch: fetchFake })).size).toBe(0)
  })

  it('se travar no meio, desiste e devolve o que chegou', async () => {
    const fetchFake = (async (_url: string, init: RequestInit) =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(`${JSON.stringify(wire(0))}\n`))
            init.signal?.addEventListener('abort', () => c.error(new Error('abortado')))
          },
        }),
      )) as unknown as typeof fetch
    const found = await analyzeOnServer([FEN_W, FEN_B], 18, { fetch: fetchFake, stallMs: 30 })
    expect([...found.keys()]).toEqual([FEN_W])
  })
})

describe('análise com o servidor', () => {
  const PGN = '[WhiteElo "1500"]\n[BlackElo "1500"]\n\n1. e4 e5 2. Nf3 *'
  const local = (): EngineLike & { calls: string[] } => {
    const calls: string[] = []
    return {
      calls,
      newGame: async () => {},
      analyze: async (fen): Promise<EngineResult> => {
        calls.push(fen)
        return { eval: { kind: 'cp', cp: 10 }, bestUci: 'a2a3', pvUci: ['a2a3'], depth: 8, lines: [{ eval: { kind: 'cp', cp: 10 }, pvUci: ['a2a3'], depth: 8 }] }
      },
    }
  }
  const answer = (eval_: number): EngineResult => ({ eval: { kind: 'cp', cp: eval_ }, bestUci: 'e2e4', pvUci: ['e2e4'], depth: 18, lines: [{ eval: { kind: 'cp', cp: eval_ }, pvUci: ['e2e4'], depth: 18 }, { eval: { kind: 'cp', cp: eval_ - 300 }, pvUci: ['d2d4'], depth: 18 }] })

  it('usando o servidor, não gasta o motor do aparelho e guarda a segunda linha sem nova busca', async () => {
    const engine = local()
    // Fora da teoria, para o lance poder ser julgado.
    const game = parsePgn('1. e4 e5 2. Ke2 Ke7 3. Kf3 Kf6 4. Kg4 *')
    const last = game.moves.length - 1
    const progress: number[] = []
    const analysis = await analyzeGame(engine, game, 18, {
      onProgress: (done) => progress.push(done),
      remote: async (fens, _depth, options) => {
        const found = new Map<string, EngineResult>()
        for (const fen of fens) {
          const result = { ...answer(30), bestUci: fen === game.positions[last].fen ? game.moves[last].uci : 'a2a3' }
          found.set(fen, result)
          options?.onResult?.(fen, result)
        }
        return found
      },
    })
    expect(engine.calls).toEqual([])
    expect(analysis.engine).toBe('servidor')
    expect(analysis.positions[last].secondEval).toEqual({ kind: 'cp', cp: -270 })
    expect(progress.at(-1)).toBe(game.positions.length)
  })

  it('o que o servidor não respondeu é calculado no aparelho, na mesma análise', async () => {
    const engine = local()
    const game = parsePgn(PGN)
    const first = game.positions[0].fen
    const analysis = await analyzeGame(engine, game, 18, { remote: async () => new Map([[first, answer(30)]]) })
    expect(engine.calls).toHaveLength(game.positions.length - 1)
    expect(analysis.positions[0].bestUci).toBe('e2e4')
    expect(analysis.engine).toBe('aparelho')
  })

  it('com o servidor fora do ar, a análise termina igual', async () => {
    const engine = local()
    const game = parsePgn(PGN)
    const analysis = await analyzeGame(engine, game, 18, { remote: async () => new Map() })
    expect(analysis.moves).toHaveLength(3)
    expect(analysis.engine).toBe('aparelho')
  })
})
