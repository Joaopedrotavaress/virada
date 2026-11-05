import type { GameAnalysis } from '../chess/analyze'
import type { TrainingCard } from '../training/cards'
import { STORES, deleteValue, readAll, readEntries, readValue, writeMany } from './db'
import { type GameRecord, reloadLibrary } from './library'

export const BACKUP_APP = 'treinador-xadrez'

export interface KvEntry {
  value: unknown
  updatedAt: number
}

export interface BackupData {
  app: typeof BACKUP_APP
  version: 1
  exportedAt: number
  games: GameRecord[]
  analyses: { key: string; analysis: GameAnalysis }[]
  cards: TrainingCard[]
  kv: { key: string; value: KvEntry }[]
}

/** Tudo o que a pessoa construiu. Sem as análises, fica pequeno: elas podem ser refeitas a partir do PGN. */
export async function exportAll({ analyses = true }: { analyses?: boolean } = {}): Promise<BackupData> {
  const [games, cards, kv] = await Promise.all([readAll<GameRecord>(STORES.games), readAll<TrainingCard>(STORES.cards), readEntries<KvEntry>(STORES.kv)])
  const stored = analyses ? await readEntries<GameAnalysis>(STORES.analyses) : []
  return {
    app: BACKUP_APP,
    version: 1,
    exportedAt: Date.now(),
    games,
    analyses: stored.map(({ key, value }) => ({ key, analysis: value })),
    cards,
    kv,
  }
}

export class BackupError extends Error {}

/** Confere o arquivo antes de tocar em qualquer dado. */
export function parseBackup(text: string): BackupData {
  let data: Partial<BackupData>
  try {
    data = JSON.parse(text) as Partial<BackupData>
  } catch {
    throw new BackupError('Este arquivo não é um backup válido: não consegui ler o conteúdo.')
  }
  if (data?.app !== BACKUP_APP) throw new BackupError('Este arquivo não é um backup do Virada.')
  if (typeof data.version !== 'number' || data.version > 1) throw new BackupError('Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.')
  const games = Array.isArray(data.games) ? data.games.filter((game) => game?.key && typeof game.pgn === 'string') : []
  const analyses = Array.isArray(data.analyses) ? data.analyses.filter((item) => item?.key && Array.isArray(item.analysis?.moves) && Array.isArray(item.analysis?.positions)) : []
  const cards = Array.isArray(data.cards) ? data.cards.filter((card) => card?.id && card.schedule) : []
  const kv = Array.isArray(data.kv) ? data.kv.filter((item) => item?.key && item.value) : []
  return { app: BACKUP_APP, version: 1, exportedAt: data.exportedAt ?? 0, games, analyses, cards, kv }
}

export interface MergeReport {
  games: number
  analyses: number
  cards: number
}

/**
 * Junta os dados recebidos com os daqui. De cada item, fica a versão mais recente.
 * Nunca apaga nada que não tenha uma marca de remoção mais nova.
 */
export async function mergeBackup(data: BackupData): Promise<MergeReport> {
  const localGames = new Map((await readAll<GameRecord>(STORES.games)).map((game) => [game.key, game]))
  const games = data.games.filter((game) => {
    const local = localGames.get(game.key)
    return !local || game.updatedAt > local.updatedAt
  })

  // A análise mais profunda sempre fica, mesmo vinda do registro mais antigo.
  const analyses: { key: string; analysis: GameAnalysis }[] = []
  for (const item of data.analyses) {
    const local = await readValue<GameAnalysis>(STORES.analyses, item.key)
    if (!local || item.analysis.depth > local.depth) analyses.push(item)
  }
  const keptDigests = games.map((game) => {
    const local = localGames.get(game.key)
    return local?.digest && (!game.digest || local.digest.depth > game.digest.depth) && !game.deletedAt ? { ...game, digest: local.digest } : game
  })

  const localCards = new Map((await readAll<TrainingCard>(STORES.cards)).map((card) => [card.id, card]))
  const cards = data.cards.filter((card) => {
    const local = localCards.get(card.id)
    return !local || card.updatedAt > local.updatedAt
  })

  const localKv = new Map((await readEntries<KvEntry>(STORES.kv)).map((item) => [item.key, item.value]))
  const kv = data.kv.filter((item) => {
    const local = localKv.get(item.key)
    return !local || item.value.updatedAt > local.updatedAt
  })

  await writeMany(STORES.games, keptDigests.map((value) => ({ value })))
  await writeMany(STORES.analyses, analyses.map(({ key, analysis }) => ({ key, value: analysis })))
  await writeMany(STORES.cards, cards.map((value) => ({ value })))
  await writeMany(STORES.kv, kv.map(({ key, value }) => ({ key, value })))
  for (const game of keptDigests) {
    if (game.deletedAt) await deleteValue(STORES.analyses, game.key)
  }
  await reloadLibrary()
  return { games: games.length, analyses: analyses.length, cards: cards.length }
}

/** Baixa um arquivo gerado aqui mesmo, sem passar por servidor nenhum. */
export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
