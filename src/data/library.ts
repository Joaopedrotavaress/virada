import { useSyncExternalStore } from 'react'
import { Chess } from 'chess.js'
import { type GameAnalysis, gameKey, hashText, upgradeAnalysis } from '../chess/analyze'
import { type BookData, type OpeningInfo, findBookMoves, loadBook } from '../chess/book'
import { type GameDigest, digestAnalysis, pgnFromAnalysis } from '../chess/digest'
import type { Color } from '../chess/evaluation'
import { type ParsedGame, parsePgn, tokenizeMoves } from '../chess/pgn'
import { type ChessComGame, viewGame } from '../chesscom/api'
import { cardsFromDigest, deleteCardsOfGame, loadCards, saveCards } from '../training/cards'
import { STORES, deleteValue, readAll, readValue, writeMany } from './db'

export type GameOutcome = 'win' | 'loss' | 'draw'

export interface GameRecord {
  key: string
  pgn: string
  white: string
  black: string
  result: string
  date: string
  timeControl: string
  /** Quando foi jogada, em ms. Serve para ordenar e para a evolução. */
  playedAt: number
  source: 'chesscom' | 'bot' | 'pgn'
  /** Usuário do chess.com dono desta cópia. */
  owner?: string
  link?: string
  userColor: Color | null
  outcome: GameOutcome | null
  opening?: OpeningInfo | null
  // Dados que o chess.com já entrega, sem precisar analisar.
  timeClass?: string
  rated?: boolean
  whiteRating?: number
  blackRating?: number
  accuracies?: { white?: number; black?: number }
  /** Resumo da análise. Ausente: a partida ainda não foi analisada. */
  digest?: GameDigest
  /** Na fila de análise em lote. */
  queued?: boolean
  tags: string[]
  note: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export function outcomeOf(result: string, color: Color | null): GameOutcome | null {
  if (!color) return null
  if (result === '1/2-1/2') return 'draw'
  if (result === '1-0') return color === 'w' ? 'win' : 'loss'
  if (result === '0-1') return color === 'b' ? 'win' : 'loss'
  return null
}

export function colorOfUser(username: string, white: string, black: string): Color | null {
  const name = username.trim().toLowerCase()
  if (!name) return null
  if (white.trim().toLowerCase() === name) return 'w'
  if (black.trim().toLowerCase() === name) return 'b'
  return null
}

/** Partidas do chess.com são identificadas pelo endereço, assim a mesma partida nunca aparece duas vezes. */
export const keyOfLink = (link: string) => `cc-${hashText(link)}`
export const recordKeyOf = (game: ParsedGame) => (game.headers.Link ? keyOfLink(game.headers.Link) : gameKey(game))

function playedAtOf(date: string, fallback: number): number {
  const match = date.match(/^(\d{4})[.-](\d{2})[.-](\d{2})$/)
  if (!match) return fallback
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
  return Number.isFinite(time) ? time : fallback
}

// ---------- Estado em memória: a lista fica pronta sem esperar o banco a cada tela. ----------

let records: GameRecord[] = []
const listeners = new Set<() => void>()
const changeListeners = new Set<(record: GameRecord, analysis?: GameAnalysis) => void>()
const openAnalyses = new Map<string, GameAnalysis>()

function publish(next: GameRecord[]) {
  records = next.sort((a, b) => b.playedAt - a.playedAt)
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const allRecords = () => records
export const useAllRecords = () => useSyncExternalStore(subscribe, allRecords)

/** O backend local e a sincronização querem saber de cada gravação. */
export function onRecordChange(listener: (record: GameRecord, analysis?: GameAnalysis) => void) {
  changeListeners.add(listener)
  return () => {
    changeListeners.delete(listener)
  }
}

/** Partidas visíveis para este usuário: as dele no chess.com, as coladas e as contra bots. */
export const recordsFor = (list: GameRecord[], username: string) => {
  const user = username.trim().toLowerCase()
  return list.filter((record) => !record.deletedAt && (!record.owner || record.owner === user))
}

async function store(changed: GameRecord[], analyses: { key: string; analysis: GameAnalysis }[] = []) {
  const byKey = new Map(records.map((record) => [record.key, record]))
  for (const record of changed) byKey.set(record.key, record)
  publish([...byKey.values()])
  for (const { key, analysis } of analyses) openAnalyses.set(key, analysis)
  await writeMany(STORES.games, changed.map((value) => ({ value })))
  await writeMany(STORES.analyses, analyses.map(({ key, analysis }) => ({ key, value: analysis })))
  for (const record of changed) {
    const analysis = analyses.find((item) => item.key === record.key)?.analysis
    for (const listener of changeListeners) listener(record, analysis)
  }
}

const findRecord = (key: string) => records.find((record) => record.key === key)

// ---------- Abertura sem motor: basta a base de nomes. ----------

/** Abertura de um PGN sem análise. Para assim que a partida sai da base, então é rápido. */
export function openingFromPgn(book: BookData, pgn: string): OpeningInfo | null {
  const movetext = pgn.replace(/^\s*\[[^\]]*\]\s*$/gm, '')
  const chess = new Chess()
  let opening: OpeningInfo | null = null
  for (const token of tokenizeMoves(movetext).slice(0, 36)) {
    try {
      chess.move(token)
    } catch {
      break
    }
    const { bookMoves, opening: found } = findBookMoves(book, [chess.fen()])
    if (!bookMoves[0]) break
    opening = found ?? opening
  }
  return opening
}

// ---------- Gravação ----------

export interface SaveMeta {
  pgn: string
  /** A chave que a partida já tem na biblioteca. */
  key?: string
  userColor: Color | null
  source?: GameRecord['source']
  owner?: string
  playedAt?: number
}

function baseRecord(game: ParsedGame, meta: SaveMeta, now: number): GameRecord {
  return {
    key: meta.key ?? recordKeyOf(game),
    pgn: meta.pgn,
    white: game.white,
    black: game.black,
    result: game.result,
    date: game.date,
    timeControl: game.timeControl,
    playedAt: meta.playedAt ?? playedAtOf(game.date, now),
    source: meta.source ?? 'pgn',
    owner: meta.owner,
    link: game.headers.Link,
    userColor: meta.userColor,
    outcome: outcomeOf(game.result, meta.userColor),
    tags: [],
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}

export interface SaveResult {
  record: GameRecord
  /** A análise que vale: se já havia uma mais profunda, é ela. */
  analysis: GameAnalysis
  persisted: boolean
}

/** Guarda a análise. A mesma partida em profundidades diferentes fica uma só, com a análise mais profunda. */
export async function saveAnalyzed(analysis: GameAnalysis, meta: SaveMeta): Promise<SaveResult> {
  const now = Date.now()
  const game = parsePgn(meta.pgn)
  const fresh = baseRecord(game, meta, now)
  const existing = findRecord(fresh.key)
  if (existing?.digest && existing.digest.depth > analysis.depth && !existing.deletedAt) {
    const kept = await getAnalysis(existing.key)
    if (kept) return { record: existing, analysis: kept, persisted: true }
  }
  const userColor = meta.userColor ?? existing?.userColor ?? null
  const digest = digestAnalysis(analysis, userColor)
  const record: GameRecord = {
    ...fresh,
    ...(existing && !existing.deletedAt ? { tags: existing.tags, note: existing.note, createdAt: existing.createdAt, playedAt: existing.playedAt, owner: existing.owner ?? fresh.owner, source: existing.source === 'pgn' ? fresh.source : existing.source, timeClass: existing.timeClass, rated: existing.rated, whiteRating: existing.whiteRating, blackRating: existing.blackRating, accuracies: existing.accuracies } : {}),
    userColor,
    outcome: outcomeOf(game.result, userColor),
    opening: analysis.opening ?? existing?.opening ?? null,
    digest,
    queued: false,
    deletedAt: undefined,
    updatedAt: now,
  }
  let persisted = true
  try {
    await store([record], [{ key: record.key, analysis }])
    if (userColor) await addErrorCards(record)
  } catch {
    persisted = false
  }
  void requestPersistence()
  return { record, analysis, persisted }
}

async function addErrorCards(record: GameRecord) {
  if (!record.digest || !record.userColor) return
  const opponent = record.userColor === 'w' ? record.black : record.white
  const known = new Set((await loadCards()).map((card) => card.id))
  const cards = cardsFromDigest(record.key, record.digest, record.userColor, opponent).filter((card) => !known.has(card.id))
  await saveCards(cards)
}

/** Partida guardada sem análise: a pessoa pede depois, ou entra na fila. */
export async function addUnanalyzed(meta: SaveMeta & { source: GameRecord['source'] }): Promise<GameRecord> {
  const now = Date.now()
  const game = parsePgn(meta.pgn)
  const fresh = baseRecord(game, meta, now)
  const existing = findRecord(fresh.key)
  if (existing && !existing.deletedAt) return existing
  await store([fresh])
  return fresh
}

export async function getAnalysis(key: string): Promise<GameAnalysis | null> {
  const open = openAnalyses.get(key)
  if (open) return open
  try {
    const saved = await readValue<GameAnalysis>(STORES.analyses, key)
    const stored = saved && upgradeAnalysis(saved)
    if (stored) {
      // Só as últimas ficam na memória: análises são grandes.
      if (openAnalyses.size >= 5) openAnalyses.delete(openAnalyses.keys().next().value as string)
      openAnalyses.set(key, stored)
    }
    return stored ?? null
  } catch {
    return null
  }
}

export async function updateRecord(key: string, patch: Partial<Pick<GameRecord, 'tags' | 'note' | 'queued' | 'userColor'>>): Promise<void> {
  const record = findRecord(key)
  if (record) await store([{ ...record, ...patch, updatedAt: Date.now() }])
}

export async function updateRecords(keys: string[], patch: Partial<Pick<GameRecord, 'queued'>>): Promise<void> {
  const wanted = new Set(keys)
  const now = Date.now()
  await store(records.filter((record) => wanted.has(record.key)).map((record) => ({ ...record, ...patch, updatedAt: now })))
}

/** Apaga guardando uma marca: a sincronização precisa saber que saiu, e o chess.com não pode trazer de volta. */
export async function removeRecord(key: string): Promise<void> {
  const record = findRecord(key)
  if (!record) return
  const now = Date.now()
  openAnalyses.delete(key)
  await store([{ ...record, deletedAt: now, updatedAt: now, queued: false, digest: undefined }])
  await deleteValue(STORES.analyses, key).catch(() => undefined)
  await deleteCardsOfGame(key).catch(() => undefined)
}

function fromChessCom(game: ChessComGame, username: string, opening: OpeningInfo | null, now: number): GameRecord {
  const view = viewGame(game, username)
  const headerValue = (name: string) => game.pgn.match(new RegExp(`\\[${name} "([^"]*)"\\]`))?.[1] ?? ''
  return {
    key: keyOfLink(game.url),
    pgn: game.pgn,
    white: game.white.username,
    black: game.black.username,
    result: headerValue('Result') || '*',
    date: headerValue('Date').replace(/-/g, '.'),
    timeControl: game.time_control ?? headerValue('TimeControl'),
    playedAt: game.end_time * 1000,
    source: 'chesscom',
    owner: username.trim().toLowerCase(),
    link: game.url,
    userColor: view.myColor,
    outcome: view.outcome,
    opening,
    timeClass: game.time_class,
    rated: game.rated,
    whiteRating: game.white.rating,
    blackRating: game.black.rating,
    accuracies: game.accuracies,
    tags: [],
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}

/** Traz as partidas do chess.com para a biblioteca, sem mexer em análises, marcas e notas. Retorna as novas. */
export async function ingestChessCom(username: string, games: ChessComGame[]): Promise<number> {
  const book = await loadBook()
  const now = Date.now()
  const changed: GameRecord[] = []
  let added = 0
  for (let index = 0; index < games.length; index += 1) {
    const game = games[index]
    const key = keyOfLink(game.url)
    const existing = findRecord(key)
    if (existing?.deletedAt) continue
    if (existing && existing.owner === username.trim().toLowerCase() && existing.timeClass && (existing.accuracies || !game.accuracies)) continue
    // Abrir centenas de partidas de uma vez não pode travar a tela.
    if (index > 0 && index % 25 === 0) await new Promise((resolve) => setTimeout(resolve))
    const opening = existing?.opening ?? (book ? openingFromPgn(book, game.pgn) : null)
    const fresh = fromChessCom(game, username, opening, now)
    if (existing) {
      changed.push({ ...fresh, digest: existing.digest, queued: existing.queued, tags: existing.tags, note: existing.note, createdAt: existing.createdAt })
    } else {
      added += 1
      changed.push(fresh)
    }
  }
  await store(changed)
  return added
}

// ---------- Inicialização e migração ----------

const LEGACY_GAMES_KEY = 'treinador:partidas:v1'
const LEGACY_PENDING_KEY = 'treinador:partidas-bot:v1'

function readLegacy<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

interface LegacyPending {
  pgn: string
  userColor: Color
  playedAt: number
}

/** O histórico antigo morava no localStorage: passa para o banco uma vez, sem perder nada. */
export async function migrateLegacy(username: string): Promise<number> {
  const games = readLegacy<GameAnalysis>(LEGACY_GAMES_KEY).filter((game) => game?.id && Array.isArray(game.moves) && Array.isArray(game.positions))
  const pending = readLegacy<LegacyPending>(LEGACY_PENDING_KEY).filter((game) => game?.pgn)
  if (games.length === 0 && pending.length === 0) return 0
  let moved = 0
  for (const analysis of games) {
    try {
      const pgn = pgnFromAnalysis(analysis)
      const userColor = analysis.userColor ?? colorOfUser(username, analysis.white, analysis.black)
      const source = analysis.source ?? 'pgn'
      await saveAnalyzed(analysis, { pgn, userColor, source, owner: source === 'chesscom' ? username.trim().toLowerCase() || undefined : undefined, playedAt: analysis.analyzedAt })
      moved += 1
    } catch {
      // Uma partida com problema não impede as outras.
    }
  }
  for (const game of pending) {
    try {
      await addUnanalyzed({ pgn: game.pgn, userColor: game.userColor, source: 'bot', playedAt: game.playedAt })
      moved += 1
    } catch {
      // Idem.
    }
  }
  try {
    localStorage.removeItem(LEGACY_GAMES_KEY)
    localStorage.removeItem(LEGACY_PENDING_KEY)
  } catch {
    // Sem localStorage não há o que limpar.
  }
  return moved
}

let initialized: Promise<void> | null = null

/** Carrega a biblioteca. Sem IndexedDB (modo privado restrito), o app continua, só não guarda. */
export function initLibrary(username: string): Promise<void> {
  initialized ??= (async () => {
    try {
      publish(await readAll<GameRecord>(STORES.games))
      await migrateLegacy(username)
    } catch (failure) {
      console.warn('Biblioteca indisponível:', failure)
    }
  })()
  return initialized
}

/** Pede ao navegador para não apagar os dados sozinho quando faltar espaço. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return false
  }
}

/** Recarrega tudo do banco depois de importar um backup. */
export async function reloadLibrary(): Promise<void> {
  openAnalyses.clear()
  publish(await readAll<GameRecord>(STORES.games))
}

/** Só para os testes. */
export function resetLibrary() {
  records = []
  initialized = null
  openAnalyses.clear()
  changeListeners.clear()
}
