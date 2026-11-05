import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { analyzeGame } from '../chess/analyze'
import { parsePgn } from '../chess/pgn'
import type { EngineLike, EngineResult } from '../engine/stockfish'
import { resetConnection } from './db'
import { GistError, forgetGist, loadGistToken, saveGistToken, syncGist } from './gistSync'
import { allRecords, resetLibrary, saveAnalyzed, updateRecord } from './library'

const PGN = '[White "ana"]\n[Black "bia"]\n[Date "2026.10.01"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0'
const FAKE_TOKEN = 'token-de-mentira'

const engine: EngineLike = {
  newGame: async () => undefined,
  analyze: async (): Promise<EngineResult> => ({ eval: { kind: 'cp', cp: 20 }, bestUci: 'e2e4', pvUci: ['e2e4'], depth: 10, lines: [] }),
}

const memoryStorage = (): Storage => {
  const items = new Map<string, string>()
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) } as unknown as Storage
}

/** Um GitHub de mentira, guardando os gists em memória. Nada sai para a internet. */
function fakeGitHub() {
  const gists = new Map<string, { id: string; description: string; public: boolean; content: string }>()
  const requests: { method: string; url: string; auth: string | null; body?: string }[] = []
  let truncate = false
  const view = (gist: { id: string; description: string; content: string }) => ({
    id: gist.id,
    description: gist.description,
    files: { 'treinador-dados.json': truncate ? { content: gist.content.slice(0, 10), truncated: true, raw_url: `https://raw.example/${gist.id}` } : { content: gist.content, truncated: false, raw_url: `https://raw.example/${gist.id}` } },
  })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
  const fetcher = (async (input: string, init: RequestInit = {}) => {
    const url = String(input)
    const method = init.method ?? 'GET'
    const headers = (init.headers ?? {}) as Record<string, string>
    requests.push({ method, url, auth: headers.Authorization ?? null, body: init.body as string | undefined })
    if (url.startsWith('https://raw.example/')) return new Response(gists.get(url.split('/').pop() as string)?.content ?? '')
    if (headers.Authorization !== `Bearer ${FAKE_TOKEN}`) return json({ message: 'Bad credentials' }, 401)
    const path = url.replace('https://api.github.com', '')
    if (path.startsWith('/gists?') && method === 'GET') return json([...gists.values()].map(view))
    if (path === '/gists' && method === 'POST') {
      const body = JSON.parse(init.body as string)
      const id = `gist${gists.size + 1}`
      gists.set(id, { id, description: body.description, public: body.public, content: body.files['treinador-dados.json'].content })
      return json(view(gists.get(id)!), 201)
    }
    const match = path.match(/^\/gists\/(\w+)$/)
    if (match) {
      const gist = gists.get(match[1])
      if (!gist) return json({ message: 'Not Found' }, 404)
      if (method === 'PATCH') {
        gist.content = JSON.parse(init.body as string).files['treinador-dados.json'].content
      }
      return json(view(gist))
    }
    return json({}, 404)
  }) as unknown as typeof fetch
  return { fetcher, gists, requests, setTruncate: (value: boolean) => (truncate = value) }
}

const freshDevice = () => {
  globalThis.indexedDB = new IDBFactory()
  resetConnection()
  resetLibrary()
}

const addGame = async (note = '') => {
  const analysis = await analyzeGame(engine, parsePgn(PGN), 12)
  const { record } = await saveAnalyzed(analysis, { pgn: PGN, userColor: 'w' })
  if (note) await updateRecord(record.key, { note })
  return record
}

beforeEach(freshDevice)

describe('sincronização por gist', () => {
  it('cria um gist privado na primeira vez, sem análises e sem o token', async () => {
    const hub = fakeGitHub()
    const storage = memoryStorage()
    saveGistToken(`  ${FAKE_TOKEN}\n`, storage)
    await addGame('minha nota')
    const report = await syncGist({ fetch: hub.fetcher, storage })
    expect(report.created).toBe(true)
    const gist = hub.gists.get(report.gistId)!
    expect(gist.public).toBe(false)
    const saved = JSON.parse(gist.content)
    expect(saved.games[0].note).toBe('minha nota')
    expect(saved.games[0].pgn).toBe(PGN)
    expect(saved.analyses).toEqual([])
    expect(gist.content).not.toContain(FAKE_TOKEN)
  })

  it('leva os dados para outro aparelho, e a nota mais nova ganha', async () => {
    const hub = fakeGitHub()
    const first = memoryStorage()
    saveGistToken(FAKE_TOKEN, first)
    const record = await addGame('primeira')
    await syncGist({ fetch: hub.fetcher, storage: first })

    freshDevice()
    const second = memoryStorage()
    saveGistToken(FAKE_TOKEN, second)
    const report = await syncGist({ fetch: hub.fetcher, storage: second })
    expect(report.created).toBe(false)
    expect(report.received).toBeGreaterThan(0)
    expect(allRecords()[0].note).toBe('primeira')
    expect(allRecords()[0].digest?.depth).toBe(12)

    await new Promise((resolve) => setTimeout(resolve, 5))
    await updateRecord(record.key, { note: 'do celular' })
    await syncGist({ fetch: hub.fetcher, storage: second })
    expect(JSON.parse(hub.gists.get(report.gistId)!.content).games[0].note).toBe('do celular')
    expect(hub.gists.size).toBe(1)
  })

  it('lê o arquivo inteiro quando o GitHub corta a resposta', async () => {
    const hub = fakeGitHub()
    const first = memoryStorage()
    saveGistToken(FAKE_TOKEN, first)
    await addGame('longa')
    await syncGist({ fetch: hub.fetcher, storage: first })

    freshDevice()
    hub.setTruncate(true)
    const second = memoryStorage()
    saveGistToken(FAKE_TOKEN, second)
    await syncGist({ fetch: hub.fetcher, storage: second })
    expect(allRecords()[0].note).toBe('longa')
    expect(hub.requests.some((request) => request.url.startsWith('https://raw.example/'))).toBe(true)
  })

  it('o token só vai para a API do GitHub', async () => {
    const hub = fakeGitHub()
    const storage = memoryStorage()
    saveGistToken(FAKE_TOKEN, storage)
    await syncGist({ fetch: hub.fetcher, storage })
    for (const request of hub.requests) {
      if (request.auth) expect(request.url.startsWith('https://api.github.com/')).toBe(true)
    }
  })

  it('token errado dá uma mensagem clara e não mexe nos dados', async () => {
    const hub = fakeGitHub()
    const storage = memoryStorage()
    saveGistToken('outro-token', storage)
    await addGame('fica')
    await expect(syncGist({ fetch: hub.fetcher, storage })).rejects.toMatchObject({ kind: 'token' })
    expect(allRecords()[0].note).toBe('fica')
  })

  it('sem token, avisa sem chamar nada', async () => {
    const hub = fakeGitHub()
    await expect(syncGist({ fetch: hub.fetcher, storage: memoryStorage() })).rejects.toBeInstanceOf(GistError)
    expect(hub.requests).toHaveLength(0)
  })

  it('gist apagado no GitHub é recriado', async () => {
    const hub = fakeGitHub()
    const storage = memoryStorage()
    saveGistToken(FAKE_TOKEN, storage)
    const { gistId } = await syncGist({ fetch: hub.fetcher, storage })
    hub.gists.delete(gistId)
    const report = await syncGist({ fetch: hub.fetcher, storage })
    expect(report.created).toBe(true)
  })

  it('arquivo corrompido no gist não destrói os dados daqui', async () => {
    const hub = fakeGitHub()
    const storage = memoryStorage()
    saveGistToken(FAKE_TOKEN, storage)
    await addGame('segura')
    const { gistId } = await syncGist({ fetch: hub.fetcher, storage })
    hub.gists.get(gistId)!.content = 'lixo'
    await expect(syncGist({ fetch: hub.fetcher, storage })).rejects.toThrow()
    expect(allRecords()[0].note).toBe('segura')
  })

  it('desligar apaga o token do aparelho', () => {
    const storage = memoryStorage()
    saveGistToken(FAKE_TOKEN, storage)
    forgetGist(storage)
    expect(loadGistToken(storage)).toBeNull()
  })
})
