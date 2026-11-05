export interface ChessComPlayer {
  username: string
  rating?: number
  result: string
}

export interface ChessComGame {
  url: string
  pgn: string
  time_class: string
  end_time: number
  rules?: string
  white: ChessComPlayer
  black: ChessComPlayer
}

export type ChessComErrorKind = 'not-found' | 'offline' | 'rate-limit' | 'other'

const MESSAGES: Record<ChessComErrorKind, string> = {
  'not-found': 'Usuário não encontrado. Confira como o nome aparece no chess.com.',
  offline: 'Sem internet. Conecte-se para buscar partidas do chess.com.',
  'rate-limit': 'O chess.com pediu para esperar. Tente de novo em alguns minutos.',
  other: 'O chess.com não respondeu como esperado. Tente de novo.',
}

export class ChessComError extends Error {
  kind: ChessComErrorKind
  constructor(kind: ChessComErrorKind) {
    super(MESSAGES[kind])
    this.name = 'ChessComError'
    this.kind = kind
  }
}

export interface CacheStore {
  get<T>(key: string): Promise<{ value: T; savedAt: number } | null>
  set<T>(key: string, value: T): Promise<void>
}

export interface ClientDeps {
  fetch?: typeof fetch
  /** Espera entre tentativas. Injetável para os testes não dormirem de verdade. */
  sleep?: (ms: number) => Promise<void>
  isOnline?: () => boolean
  now?: () => number
  cache?: CacheStore
}

const BASE = 'https://api.chess.com/pub/player'
const ARCHIVES_TTL = 60 * 60 * 1000
const CURRENT_MONTH_TTL = 10 * 60 * 1000
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]

function memoryCache(): CacheStore {
  const items = new Map<string, { value: unknown; savedAt: number }>()
  return {
    get: async <T,>(key: string) => (items.get(key) as { value: T; savedAt: number } | undefined) ?? null,
    set: async (key, value) => void items.set(key, { value, savedAt: Date.now() }),
  }
}

/** Só o que a lista usa: reduz o que fica guardado no aparelho. */
function slimGame(game: ChessComGame): ChessComGame {
  const { url, pgn, time_class, end_time, rules, white, black } = game
  const player = ({ username, rating, result }: ChessComPlayer) => ({ username, rating, result })
  return { url, pgn, time_class, end_time, rules, white: player(white), black: player(black) }
}

export interface FetchOptions {
  /** Busca de novo no chess.com, ignorando a validade do cache. */
  force?: boolean
}

/** Quando um mês do arquivo termina, com um dia de folga para os fusos e partidas diárias que acabam na virada. */
function monthEnd(url: string): number {
  const match = url.match(/(\d{4})\/(\d{2})$/)
  if (!match) return 0
  return Date.UTC(Number(match[1]), Number(match[2]), 2)
}

export function createChessComClient(deps: ClientDeps = {}) {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  const now = deps.now ?? (() => Date.now())
  const cache = deps.cache ?? memoryCache()

  // Uma requisição por vez, nunca em paralelo: é o que a API pública do chess.com pede.
  let queue: Promise<unknown> = Promise.resolve()
  const enqueue = <T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  const request = <T,>(url: string, fresh = false): Promise<T> =>
    enqueue(async () => {
      if (!isOnline()) throw new ChessComError('offline')
      for (let attempt = 0; ; attempt += 1) {
        let response: Response
        try {
          // fresh: pergunta ao servidor em vez de aceitar a cópia guardada pelo navegador.
          response = await doFetch(url, fresh ? { cache: 'no-cache' } : undefined)
        } catch {
          throw new ChessComError(isOnline() ? 'other' : 'offline')
        }
        if (response.status === 404) throw new ChessComError('not-found')
        if (response.status === 429) {
          if (attempt >= RETRY_DELAYS.length) throw new ChessComError('rate-limit')
          await sleep(RETRY_DELAYS[attempt])
          continue
        }
        if (!response.ok) throw new ChessComError('other')
        return (await response.json()) as T
      }
    })

  /** Serve do cache quando ainda vale. force ignora a validade. Sem internet, até o que já venceu serve. */
  async function cached<T>(key: string, isValid: (savedAt: number) => boolean, force: boolean, load: () => Promise<T>): Promise<T> {
    const entry = await cache.get<T>(key).catch(() => null)
    if (entry && !force && isValid(entry.savedAt)) return entry.value
    try {
      const value = await load()
      await cache.set(key, value).catch(() => undefined)
      return value
    } catch (failure) {
      if (entry && failure instanceof ChessComError && failure.kind !== 'not-found') return entry.value
      throw failure
    }
  }

  return {
    /** URLs dos meses com partidas, da mais recente para a mais antiga. */
    async archives(username: string, { force = false }: FetchOptions = {}): Promise<string[]> {
      const user = username.trim().toLowerCase()
      return cached(`archives:${user}`, (savedAt) => now() - savedAt < ARCHIVES_TTL, force, async () => {
        const data = await request<{ archives?: string[] }>(`${BASE}/${encodeURIComponent(user)}/games/archives`, force)
        return [...(data.archives ?? [])].reverse()
      })
    },

    /** Partidas de um mês, mais recentes primeiro. Meses passados não mudam: ficam em cache de vez. */
    async month(url: string, isCurrent: boolean, { force = false }: FetchOptions = {}): Promise<ChessComGame[]> {
      // Um mês só está completo se foi guardado depois de acabar. Guardado antes, ainda pode faltar partida.
      const isValid = (savedAt: number) => (isCurrent ? now() - savedAt < CURRENT_MONTH_TTL : savedAt >= monthEnd(url))
      return cached(`month:${url}`, isValid, force, async () => {
        const data = await request<{ games?: ChessComGame[] }>(url, force)
        return (data.games ?? [])
          .filter((game) => game.pgn)
          .map(slimGame)
          .sort((a, b) => b.end_time - a.end_time)
      })
    },
  }
}

const DRAW_RESULTS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'])

export type GameOutcome = 'win' | 'loss' | 'draw'

export interface GameView {
  myColor: 'w' | 'b'
  outcome: GameOutcome
  opponent: string
  myRating?: number
  opponentRating?: number
}

/** Como a partida fica do ponto de vista do usuário. */
export function viewGame(game: ChessComGame, username: string): GameView {
  const isWhite = game.white.username.toLowerCase() === username.trim().toLowerCase()
  const me = isWhite ? game.white : game.black
  const other = isWhite ? game.black : game.white
  const outcome: GameOutcome = me.result === 'win' ? 'win' : DRAW_RESULTS.has(me.result) ? 'draw' : 'loss'
  return { myColor: isWhite ? 'w' : 'b', outcome, opponent: other.username, myRating: me.rating, opponentRating: other.rating }
}

export const TIME_CLASSES: { id: string; label: string }[] = [
  { id: 'bullet', label: 'Bullet' },
  { id: 'blitz', label: 'Blitz' },
  { id: 'rapid', label: 'Rápida' },
  { id: 'daily', label: 'Diária' },
]

export const timeClassLabel = (id: string) => TIME_CLASSES.find((item) => item.id === id)?.label ?? id

/** "https://.../games/2026/11" → "novembro de 2026". */
export function monthLabel(url: string): string {
  const match = url.match(/(\d{4})\/(\d{2})$/)
  if (!match) return url
  const names = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${names[Number(match[2]) - 1]} de ${match[1]}`
}
