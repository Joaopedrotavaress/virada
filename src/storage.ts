import type { GameAnalysis } from './chess/analyze'
import type { Color } from './chess/evaluation'

const GAMES_KEY = 'treinador:partidas:v1'
const PENDING_KEY = 'treinador:partidas-bot:v1'
const USER_KEY = 'treinador:usuario'
const DEPTH_KEY = 'treinador:profundidade'
const BOT_PREFS_KEY = 'treinador:bot:v1'
const REVIEW_SPEED_KEY = 'treinador:velocidade-revisao'
const MAX_GAMES = 20
const MAX_PENDING = 30

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

export function loadRecent(): GameAnalysis[] {
  const parsed = readJson<unknown>(GAMES_KEY, [])
  if (!Array.isArray(parsed)) return []
  return (parsed as GameAnalysis[]).filter((game) => game?.id && Array.isArray(game.moves) && Array.isArray(game.positions))
}

/** Salva a análise. Sem espaço, descarta as mais antigas. Retorna false se nem assim couber. */
export function saveAnalysis(analysis: GameAnalysis): boolean {
  const others = loadRecent().filter((game) => game.id !== analysis.id)
  let games = [analysis, ...others].slice(0, MAX_GAMES)
  while (games.length > 0) {
    if (write(GAMES_KEY, JSON.stringify(games))) return true
    games = games.slice(0, -1)
  }
  return false
}

export function removeAnalysis(id: string): GameAnalysis[] {
  const games = loadRecent().filter((game) => game.id !== id)
  write(GAMES_KEY, JSON.stringify(games))
  return games
}

/** Partida contra bot ainda sem análise: só o PGN, para analisar quando a pessoa pedir. */
export interface PendingGame {
  id: string
  pgn: string
  white: string
  black: string
  result: string
  date: string
  userColor: Color
  playedAt: number
}

export function loadPending(): PendingGame[] {
  const parsed = readJson<unknown>(PENDING_KEY, [])
  return Array.isArray(parsed) ? (parsed as PendingGame[]).filter((game) => game?.id && game.pgn) : []
}

export function savePending(game: PendingGame): PendingGame[] {
  const games = [game, ...loadPending().filter((item) => item.id !== game.id)].slice(0, MAX_PENDING)
  write(PENDING_KEY, JSON.stringify(games))
  return games
}

export function removePending(id: string): PendingGame[] {
  const games = loadPending().filter((game) => game.id !== id)
  write(PENDING_KEY, JSON.stringify(games))
  return games
}

export const loadUsername = () => read(USER_KEY) ?? ''
export const saveUsername = (username: string) => void write(USER_KEY, username)

export function loadDepth(): number {
  const depth = Number(read(DEPTH_KEY))
  return [12, 15, 18].includes(depth) ? depth : 15
}
export const saveDepth = (depth: number) => void write(DEPTH_KEY, String(depth))

export const loadReviewSpeed = () => read(REVIEW_SPEED_KEY)
export const saveReviewSpeed = (speed: string) => void write(REVIEW_SPEED_KEY, speed)

export interface BotPrefs {
  botId: string
  color: 'w' | 'b' | 'random'
  coachOn: boolean
  allowUndo: boolean
}

const DEFAULT_BOT_PREFS: BotPrefs = { botId: 'casual', color: 'random', coachOn: true, allowUndo: true }

export const loadBotPrefs = (): BotPrefs => ({ ...DEFAULT_BOT_PREFS, ...readJson<Partial<BotPrefs>>(BOT_PREFS_KEY, {}) })
export const saveBotPrefs = (prefs: BotPrefs) => void write(BOT_PREFS_KEY, JSON.stringify(prefs))
