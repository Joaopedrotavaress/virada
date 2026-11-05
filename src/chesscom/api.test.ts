import { describe, expect, it } from 'vitest'
import { ChessComError, type ChessComGame, createChessComClient, monthLabel, viewGame } from './api'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const game = (overrides: Partial<ChessComGame> = {}): ChessComGame => ({
  url: 'https://www.chess.com/game/live/1',
  pgn: '1. e4 e5 *',
  time_class: 'blitz',
  end_time: 100,
  rules: 'chess',
  white: { username: 'Joao', rating: 1200, result: 'win' },
  black: { username: 'rival', rating: 1250, result: 'checkmated' },
  ...overrides,
})

describe('cliente do chess.com', () => {
  it('usa o usuário em minúsculas e devolve os meses do mais recente para o mais antigo', async () => {
    const urls: string[] = []
    const client = createChessComClient({
      fetch: (async (url: string) => {
        urls.push(url)
        return json({ archives: ['a/2026/10', 'a/2026/11'] })
      }) as typeof fetch,
    })
    expect(await client.archives('  JoaoPedro ')).toEqual(['a/2026/11', 'a/2026/10'])
    expect(urls[0]).toBe('https://api.chess.com/pub/player/joaopedro/games/archives')
  })

  it('404 vira "usuário não encontrado"', async () => {
    const client = createChessComClient({ fetch: (async () => json({}, 404)) as typeof fetch })
    await expect(client.archives('ninguem')).rejects.toMatchObject({ kind: 'not-found', message: expect.stringContaining('Usuário não encontrado') })
  })

  it('429 espera cada vez mais e tenta de novo', async () => {
    const waits: number[] = []
    let calls = 0
    const client = createChessComClient({
      fetch: (async () => {
        calls += 1
        return calls <= 3 ? json({}, 429) : json({ archives: ['a/2026/11'] })
      }) as typeof fetch,
      sleep: async (ms) => void waits.push(ms),
    })
    expect(await client.archives('joao')).toEqual(['a/2026/11'])
    expect(waits).toEqual([1000, 2000, 4000])
  })

  it('desiste depois de muitas recusas', async () => {
    const client = createChessComClient({ fetch: (async () => json({}, 429)) as typeof fetch, sleep: async () => {} })
    await expect(client.archives('joao')).rejects.toMatchObject({ kind: 'rate-limit' })
  })

  it('faz uma requisição por vez, nunca em paralelo', async () => {
    let active = 0
    let peak = 0
    const client = createChessComClient({
      fetch: (async () => {
        active += 1
        peak = Math.max(peak, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        active -= 1
        return json({ games: [] })
      }) as typeof fetch,
    })
    await Promise.all([client.month('m/1', true), client.month('m/2', true), client.month('m/3', true), client.month('m/4', true)])
    expect(peak).toBe(1)
  })

  it('uma falha não trava a fila', async () => {
    let calls = 0
    const client = createChessComClient({
      fetch: (async () => {
        calls += 1
        return calls === 1 ? json({}, 500) : json({ games: [] })
      }) as typeof fetch,
    })
    await expect(client.month('m/1', true)).rejects.toBeInstanceOf(ChessComError)
    await expect(client.month('m/2', true)).resolves.toEqual([])
  })

  it('sem internet avisa sem nem tentar', async () => {
    let calls = 0
    const client = createChessComClient({
      fetch: (async () => {
        calls += 1
        return json({})
      }) as typeof fetch,
      isOnline: () => false,
    })
    await expect(client.archives('joao')).rejects.toMatchObject({ kind: 'offline', message: expect.stringContaining('Sem internet') })
    expect(calls).toBe(0)
  })

  it('falha de rede com o aparelho offline também vira "sem internet"', async () => {
    let online = true
    const client = createChessComClient({
      fetch: (async () => {
        online = false
        throw new TypeError('Failed to fetch')
      }) as typeof fetch,
      isOnline: () => online,
    })
    await expect(client.archives('joao')).rejects.toMatchObject({ kind: 'offline' })
  })

  describe('cache', () => {
    function counting(games: ChessComGame[]) {
      const state = { calls: 0, time: 1000, online: true }
      const client = createChessComClient({
        fetch: (async () => {
          state.calls += 1
          return json({ games })
        }) as typeof fetch,
        now: () => state.time,
        isOnline: () => state.online,
        cache: (() => {
          const items = new Map<string, { value: unknown; savedAt: number }>()
          return {
            get: async <T,>(key: string) => (items.get(key) as { value: T; savedAt: number } | undefined) ?? null,
            set: async (key: string, value: unknown) => void items.set(key, { value, savedAt: state.time }),
          }
        })(),
      })
      return { client, state }
    }

    it('não busca de novo um mês passado, mesmo muito tempo depois', async () => {
      const { client, state } = counting([game()])
      state.time = Date.UTC(2026, 10, 5)
      await client.month('m/2020/01', false)
      state.time += 1000 * 60 * 60 * 24 * 365
      await client.month('m/2020/01', false)
      expect(state.calls).toBe(1)
    })

    it('o mês atual expira em poucos minutos', async () => {
      const { client, state } = counting([game()])
      await client.month('m/now', true)
      state.time += 5 * 60 * 1000
      await client.month('m/now', true)
      expect(state.calls).toBe(1)
      state.time += 6 * 60 * 1000
      await client.month('m/now', true)
      expect(state.calls).toBe(2)
    })

    it('atualizar busca de novo na hora, pedindo ao navegador para não usar a cópia dele', async () => {
      const inits: (RequestInit | undefined)[] = []
      const client = createChessComClient({
        fetch: (async (_url: string, init?: RequestInit) => {
          inits.push(init)
          return json({ games: inits.length === 1 ? [game()] : [game(), game({ url: 'nova', end_time: 200 })] })
        }) as typeof fetch,
      })
      expect(await client.month('m/2026/11', true)).toHaveLength(1)
      expect(await client.month('m/2026/11', true)).toHaveLength(1)
      expect(inits).toHaveLength(1)
      const fresh = await client.month('m/2026/11', true, { force: true })
      expect(fresh.map((item) => item.url)).toEqual(['nova', 'https://www.chess.com/game/live/1'])
      expect(inits[1]).toEqual({ cache: 'no-cache' })
    })

    it('atualizar sem internet mantém o que já tinha', async () => {
      const { client, state } = counting([game()])
      await client.month('m/2026/11', true)
      state.online = false
      expect(await client.month('m/2026/11', true, { force: true })).toHaveLength(1)
    })

    it('mês guardado antes de acabar é buscado de novo depois da virada', async () => {
      const { client, state } = counting([game()])
      state.time = Date.UTC(2026, 9, 20)
      await client.month('m/2026/10', true)
      state.time = Date.UTC(2026, 10, 5)
      await client.month('m/2026/10', false)
      expect(state.calls).toBe(2)
      // Agora ele já está completo: não busca mais.
      state.time = Date.UTC(2027, 5, 1)
      await client.month('m/2026/10', false)
      expect(state.calls).toBe(2)
    })

    it('sem internet, mostra o que já tinha mesmo vencido', async () => {
      const { client, state } = counting([game()])
      await client.month('m/now', true)
      state.time += 60 * 60 * 1000
      state.online = false
      expect(await client.month('m/now', true)).toHaveLength(1)
    })
  })

  it('ordena as partidas da mais recente e descarta campos que não usa', async () => {
    const client = createChessComClient({
      fetch: (async () => json({ games: [{ ...game({ end_time: 1 }), fen: 'x', tcn: 'y' }, game({ end_time: 9 }), { ...game(), pgn: '' }] })) as typeof fetch,
    })
    const games = await client.month('m/x', true)
    expect(games.map((item) => item.end_time)).toEqual([9, 1])
    expect(games[0]).not.toHaveProperty('tcn')
  })
})

describe('partida do ponto de vista do usuário', () => {
  it('vitória de brancas, sem diferenciar maiúsculas', () => {
    expect(viewGame(game(), 'joao')).toEqual({ myColor: 'w', outcome: 'win', opponent: 'rival', myRating: 1200, opponentRating: 1250 })
  })

  it('derrota de pretas, para qualquer motivo', () => {
    for (const result of ['checkmated', 'resigned', 'timeout', 'abandoned', 'lose']) {
      const view = viewGame(game({ white: { username: 'rival', result: 'win' }, black: { username: 'joao', result } }), 'JOAO')
      expect(view).toMatchObject({ myColor: 'b', outcome: 'loss', opponent: 'rival' })
    }
  })

  it('reconhece todos os empates', () => {
    for (const result of ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']) {
      expect(viewGame(game({ white: { username: 'joao', result }, black: { username: 'rival', result } }), 'joao').outcome).toBe('draw')
    }
  })
})

describe('nome do mês', () => {
  it('fica em português', () => {
    expect(monthLabel('https://api.chess.com/pub/player/x/games/2026/03')).toBe('março de 2026')
  })
})
