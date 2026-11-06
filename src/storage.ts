import type { Color } from './chess/evaluation'

const ACTIVE_GAME_KEY = 'treinador:jogo-atual:v2'
const USER_KEY = 'treinador:usuario'
const DEPTH_KEY = 'treinador:profundidade'
const BOT_PREFS_KEY = 'treinador:bot:v1'
const REVIEW_SPEED_KEY = 'treinador:velocidade-revisao'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(read(key) ?? 'null') as T | null
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

/** A partida contra o bot em andamento: gravada a cada lance, sobrevive a recarregar e a fechar o app. */
export interface ActiveGame {
  botId: string
  color: Color
  coachOn: boolean
  allowUndo: boolean
  playerName: string
  startedAt: number
  /** Todos os lances, a partir da posição inicial. */
  sans: string[]
  /** Lances que já vieram prontos (linha de abertura): não dá para voltar além deles. */
  lockedPlies: number
  startFen?: string
  time?: { base: number; increment: number }
  clocks?: { w: number; b: number }
  stamps?: (number | null)[]
}

export function loadActiveGame(): ActiveGame | null {
  const game = readJson<ActiveGame | null>(ACTIVE_GAME_KEY, null)
  return game?.botId && Array.isArray(game.sans) ? game : null
}

export const saveActiveGame = (game: ActiveGame) => void write(ACTIVE_GAME_KEY, JSON.stringify(game))

export function clearActiveGame() {
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY)
  } catch {
    // Sem localStorage não há o que limpar.
  }
}

/** Quantos meses do chess.com a pessoa já abriu. */
export function loadMonthsLoaded(user: string): number {
  const months = Number(read(`treinador:meses:${user.toLowerCase()}`))
  return Number.isFinite(months) && months > 0 ? months : 1
}
export const saveMonthsLoaded = (user: string, months: number) => void write(`treinador:meses:${user.toLowerCase()}`, String(months))

export const loadUsername = () => read(USER_KEY) ?? ''
export const saveUsername = (username: string) => void write(USER_KEY, username)

/** As profundidades que a pessoa pode escolher. */
export const ANALYSIS_DEPTHS = [12, 15, 18, 20, 22]

/** O que roda sem a pessoa olhar não passa daqui: a fila e as 3 melhores linhas ficariam lentas demais. */
export const MAX_BACKGROUND_DEPTH = 18
export const backgroundDepth = (depth: number) => Math.min(depth, MAX_BACKGROUND_DEPTH)

const SERVER_ENGINE_KEY = 'treinador:motor-servidor'

/** Por padrão, a análise usa o motor do servidor, e volta para o aparelho se ele não responder. */
export const loadServerEngine = () => read(SERVER_ENGINE_KEY) !== 'nao'
export const saveServerEngine = (on: boolean) => void write(SERVER_ENGINE_KEY, on ? 'sim' : 'nao')

export function loadDepth(): number {
  const depth = Number(read(DEPTH_KEY))
  return ANALYSIS_DEPTHS.includes(depth) ? depth : 15
}
export const saveDepth = (depth: number) => void write(DEPTH_KEY, String(depth))

export const loadReviewSpeed = () => read(REVIEW_SPEED_KEY)
export const saveReviewSpeed = (speed: string) => void write(REVIEW_SPEED_KEY, speed)

export interface BotPrefs {
  botId: string
  color: 'w' | 'b' | 'random'
  coachOn: boolean
  allowUndo: boolean
  /** Identificador do ritmo escolhido. */
  timeId?: string
}

const DEFAULT_BOT_PREFS: BotPrefs = { botId: 'casual', color: 'random', coachOn: true, allowUndo: true, timeId: 'none' }

export const loadBotPrefs = (): BotPrefs => ({ ...DEFAULT_BOT_PREFS, ...readJson<Partial<BotPrefs>>(BOT_PREFS_KEY, {}) })
export const saveBotPrefs = (prefs: BotPrefs) => void write(BOT_PREFS_KEY, JSON.stringify(prefs))
