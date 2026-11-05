import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import type { EngineLike, EngineResult } from '../engine/stockfish'
import { EngineAbortError } from '../engine/stockfish'
import { resetConnection } from './db'
import { addUnanalyzed, allRecords, resetLibrary } from './library'
import { createAnalysisQueue } from './queue'

const pgn = (white: string, moves = '1. e4 e5 2. Nf3 *') => `[White "${white}"]\n[Black "Bot"]\n[Date "2026.10.01"]\n[Result "*"]\n\n${moves}`

function engine(behavior: (fen: string, signal?: AbortSignal) => void = () => undefined) {
  let disposed = 0
  const result: EngineLike & { ready: Promise<void>; dispose: () => void; disposed: () => number } = {
    ready: Promise.resolve(),
    newGame: async () => undefined,
    analyze: async (fen, _depth, options): Promise<EngineResult> => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      behavior(fen, options?.signal)
      if (options?.signal?.aborted) throw new EngineAbortError()
      return { eval: { kind: 'cp', cp: 20 }, bestUci: 'e2e4', pvUci: ['e2e4'], depth: 8, lines: [] }
    },
    dispose: () => {
      disposed += 1
    },
    disposed: () => disposed,
  }
  return result
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetConnection()
  resetLibrary()
})

const addGames = async (...names: string[]) => {
  const keys: string[] = []
  for (const name of names) keys.push((await addUnanalyzed({ pgn: pgn(name), userColor: 'w', source: 'pgn' })).key)
  return keys
}

describe('fila de análise em lote', () => {
  it('analisa uma partida de cada vez até esvaziar, e libera o motor', async () => {
    const motor = engine()
    const queue = createAnalysisQueue({ createEngine: () => motor, depth: () => 8 })
    await queue.add(await addGames('a', 'b', 'c'))
    await queue.idle()
    expect(allRecords().every((record) => record.digest && !record.queued)).toBe(true)
    expect(queue.getState().done).toBe(3)
    expect(queue.getState().remaining).toBe(0)
    expect(motor.disposed()).toBe(1)
  })

  it('uma fila interrompida continua de onde parou', async () => {
    const keys = await addGames('a', 'b')
    const first = createAnalysisQueue({ createEngine: () => engine(), depth: () => 8 })
    first.hold(true)
    await first.add(keys)
    expect(first.getState().running).toBe(false)
    expect(allRecords().every((record) => record.queued)).toBe(true)
    // Como se o app tivesse sido reaberto: a marca de fila está nas partidas.
    const second = createAnalysisQueue({ createEngine: () => engine(), depth: () => 8 })
    await second.resume()
    await second.idle()
    expect(allRecords().every((record) => record.digest)).toBe(true)
  })

  it('segurar a fila interrompe a análise atual, e soltar recomeça', async () => {
    const queue = createAnalysisQueue({ createEngine: () => engine(), depth: () => 8 })
    await queue.add(await addGames('a'))
    queue.hold(true)
    await queue.idle()
    expect(queue.getState().running).toBe(false)
    expect(allRecords()[0].digest).toBeUndefined()
    expect(allRecords()[0].queued).toBe(true)
    queue.hold(false)
    await queue.idle()
    expect(allRecords()[0].digest).toBeDefined()
  })

  it('cancelar esvazia a fila e mantém o que já terminou', async () => {
    const queue = createAnalysisQueue({ createEngine: () => engine(), depth: () => 8 })
    const keys = await addGames('a', 'b', 'c')
    queue.hold(true)
    await queue.add(keys)
    await queue.cancel()
    expect(allRecords().some((record) => record.queued)).toBe(false)
    expect(queue.getState().remaining).toBe(0)
  })

  it('motor com defeito para a fila com um aviso, sem perder o lugar', async () => {
    const motor = engine(() => {
      throw new Error('sem resposta')
    })
    const queue = createAnalysisQueue({ createEngine: () => motor, depth: () => 8 })
    await queue.add(await addGames('a'))
    await queue.idle()
    expect(queue.getState().error).toMatch(/sem resposta/)
    expect(allRecords()[0].queued).toBe(true)
    expect(motor.disposed()).toBe(1)
  })
})
