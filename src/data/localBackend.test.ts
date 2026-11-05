import 'fake-indexeddb/auto'
import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { IDBFactory } from 'fake-indexeddb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { analyzeGame } from '../chess/analyze'
import { parsePgn } from '../chess/pgn'
import type { EngineLike, EngineResult } from '../engine/stockfish'
import { resetConnection } from './db'
import { allRecords, resetLibrary, saveAnalyzed, updateRecord } from './library'
import { changesSince, createBackendEngine, detectBackend, isLoopbackHost, syncWithBackend } from './localBackend'

const PGN = '[White "ana"]\n[Black "bia"]\n[Date "2026.10.01"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0'

const fakeEngine: EngineLike = {
  newGame: async () => undefined,
  analyze: async (): Promise<EngineResult> => ({ eval: { kind: 'cp', cp: 20 }, bestUci: 'e2e4', pvUci: ['e2e4'], depth: 10, lines: [] }),
}

const memoryStorage = () => {
  const items = new Map<string, string>()
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) }
}

describe('detecção do backend', () => {
  const json = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch

  it('no site publicado, nem pergunta', async () => {
    let called = false
    const spy = (async () => {
      called = true
      throw new Error('não devia chamar')
    }) as unknown as typeof fetch
    expect(await detectBackend({ hostname: 'treinador.vercel.app', fetch: spy })).toBeNull()
    expect(called).toBe(false)
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('192.168.0.5')).toBe(false)
  })

  it('reconhece o backend pela resposta exata', async () => {
    expect(await detectBackend({ hostname: 'localhost', fetch: json({ app: 'treinador-xadrez', engine: true, games: 2, analyses: 1 }) })).toEqual({ engine: true, games: 2, analyses: 1 })
  })

  it('um servidor comum com HTML, JSON de outro app, erro ou queda contam como ausência', async () => {
    const html = (async () => ({ ok: true, json: async () => JSON.parse('<!doctype html>') })) as unknown as typeof fetch
    expect(await detectBackend({ hostname: 'localhost', fetch: html })).toBeNull()
    expect(await detectBackend({ hostname: 'localhost', fetch: json({ app: 'outro' }) })).toBeNull()
    expect(await detectBackend({ hostname: 'localhost', fetch: json({}, false) })).toBeNull()
    const down = (async () => {
      throw new TypeError('recusado')
    }) as unknown as typeof fetch
    expect(await detectBackend({ hostname: 'localhost', fetch: down })).toBeNull()
  })

  it('backend que não responde desiste rápido', async () => {
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('cancelado')))
      })) as unknown as typeof fetch
    const started = Date.now()
    expect(await detectBackend({ hostname: 'localhost', fetch: hang })).toBeNull()
    expect(Date.now() - started).toBeLessThan(2000)
  })
})

describe('o que muda desde a última conversa', () => {
  it('manda só os itens alterados, com a análise da partida alterada', () => {
    const data = {
      app: 'treinador-xadrez',
      version: 1,
      exportedAt: 0,
      games: [{ key: 'a', updatedAt: 5 }, { key: 'b', updatedAt: 20 }],
      analyses: [{ key: 'a' }, { key: 'b' }],
      cards: [{ id: 'c', updatedAt: 5 }, { id: 'd', updatedAt: 30 }],
      kv: [{ key: 'x', value: { updatedAt: 1 } }, { key: 'y', value: { updatedAt: 40 } }],
    } as never
    const result = changesSince(data, 10)
    expect(result.games.map((game) => game.key)).toEqual(['b'])
    expect(result.analyses.map((item) => item.key)).toEqual(['b'])
    expect(result.cards.map((card) => card.id)).toEqual(['d'])
    expect(result.kv.map((item) => item.key)).toEqual(['y'])
  })
})

describe('servidor local de verdade', () => {
  let server: ChildProcess
  let base = ''
  let dir = ''
  const call: typeof fetch = (url, init) => fetch(`${base}${String(url)}`, init)

  const startServer = async () => {
    server = spawn(process.execPath, ['--no-warnings', 'server/local.mjs', '--porta', '0', '--dados', dir, '--site', join(dir, 'site'), '--sem-build', '--motor', 'lite-single'], { stdio: ['ignore', 'pipe', 'pipe'] })
    base = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('servidor não abriu')), 15_000)
      server.stdout?.on('data', (chunk: Buffer) => {
        const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/)
        if (match) {
          clearTimeout(timer)
          resolve(match[0])
        }
      })
      server.on('exit', () => reject(new Error('servidor saiu')))
    })
  }

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'treinador-'))
    await startServer()
  }, 30_000)

  afterAll(async () => {
    server.removeAllListeners('exit')
    server.kill()
    await new Promise((resolve) => setTimeout(resolve, 300))
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // No Windows, o banco pode demorar a liberar. A pasta é temporária.
    }
  })

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    resetConnection()
    resetLibrary()
  })

  it('responde à detecção', async () => {
    const info = await detectBackend({ hostname: '127.0.0.1', fetch: call })
    expect(info?.engine).toBe(true)
  })

  it('leva os dados de um navegador para outro, passando pelo SQLite', async () => {
    const analysis = await analyzeGame(fakeEngine, parsePgn(PGN), 12)
    const { record } = await saveAnalyzed(analysis, { pgn: PGN, userColor: 'w' })
    await updateRecord(record.key, { note: 'do primeiro navegador' })
    expect((await syncWithBackend({ fetch: call, storage: memoryStorage() })).sent).toBeGreaterThan(0)

    // Outro navegador, banco vazio.
    globalThis.indexedDB = new IDBFactory()
    resetConnection()
    resetLibrary()
    const report = await syncWithBackend({ fetch: call, storage: memoryStorage() })
    expect(report.received).toBeGreaterThan(0)
    expect(allRecords()[0].note).toBe('do primeiro navegador')
    expect(allRecords()[0].digest?.depth).toBe(12)
  })

  it('não troca uma versão nova por uma velha', async () => {
    const newer = { app: 'treinador-xadrez', version: 1, games: [{ key: 'k1', updatedAt: 100, pgn: 'novo' }] }
    const older = { app: 'treinador-xadrez', version: 1, games: [{ key: 'k1', updatedAt: 50, pgn: 'velho' }] }
    await call('/api/merge', { method: 'POST', body: JSON.stringify(newer) })
    await call('/api/merge', { method: 'POST', body: JSON.stringify(older) })
    const data = (await (await call('/api/data')).json()) as { games: { key: string; pgn: string }[] }
    expect(data.games.find((game) => game.key === 'k1')?.pgn).toBe('novo')
  })

  it('recusa pedidos de outro site', async () => {
    const response = await call('/api/merge', { method: 'POST', headers: { Origin: 'https://site-malicioso.example' }, body: '{}' })
    expect(response.status).toBe(403)
  })

  it('recusa corpo inválido, sem cair', async () => {
    expect((await call('/api/merge', { method: 'POST', body: 'não é json' })).status).toBe(500)
    expect((await call('/api/engine', { method: 'POST', body: JSON.stringify({ fen: 'x; quit' }) })).status).toBe(400)
    expect((await call('/api/nao-existe')).status).toBe(404)
    expect((await call('/api/health')).status).toBe(200)
  })

  it('não entrega arquivos fora da pasta do site', async () => {
    const response = await call('/..%2f..%2fetc%2fpasswd')
    expect([403, 404]).toContain(response.status)
  })

  it('analisa uma partida com o motor do computador, pelo mesmo caminho da fila', async () => {
    const engine = createBackendEngine({ fetch: call })
    await engine.ready
    const analysis = await analyzeGame(engine, parsePgn(PGN), 8)
    expect(analysis.moves).toHaveLength(5)
    expect(analysis.positions[0].bestUci).toMatch(/^[a-h][1-8][a-h][1-8]/)
    engine.terminate()
  }, 60_000)
})
