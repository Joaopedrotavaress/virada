import { useSyncExternalStore } from 'react'
import { UciEngine } from '../engine/stockfish'
import { type BackupData, exportAll, mergeBackup, parseBackup } from './backup'
import { onRecordChange } from './library'

const HEALTH_TIMEOUT_MS = 800
const SYNC_DELAY_MS = 1500
const LAST_SYNC_KEY = 'treinador:local-sync'

export interface BackendInfo {
  engine: boolean
  games: number
  analyses: number
}

/** O backend só existe na mesma origem, quando o app é aberto pelo "npm run local". No site publicado, nem pergunta. */
export const isLoopbackHost = (hostname: string) => hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]'

/**
 * Procura o backend. Qualquer resposta que não seja exatamente a dele conta como ausência:
 * um servidor comum devolve o index.html com status 200 nesse endereço.
 */
export async function detectBackend(deps: { fetch?: typeof fetch; hostname?: string } = {}): Promise<BackendInfo | null> {
  const hostname = deps.hostname ?? (typeof location === 'undefined' ? '' : location.hostname)
  if (!isLoopbackHost(hostname)) return null
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const response = await doFetch('/api/health', { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as Partial<BackendInfo> & { app?: string }
    if (data?.app !== 'treinador-xadrez') return null
    return { engine: Boolean(data.engine), games: data.games ?? 0, analyses: data.analyses ?? 0 }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface LocalSyncDeps {
  fetch?: typeof fetch
  storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void }
  now?: () => number
}

/** O que mudou desde a última conversa. As análises são grandes: vão só as que têm partida alterada. */
export function changesSince(data: BackupData, since: number): BackupData {
  const games = data.games.filter((game) => game.updatedAt > since)
  const changed = new Set(games.map((game) => game.key))
  return {
    ...data,
    games,
    analyses: data.analyses.filter((item) => changed.has(item.key)),
    cards: data.cards.filter((card) => card.updatedAt > since),
    kv: data.kv.filter((item) => item.value.updatedAt > since),
  }
}

/** Uma rodada de troca: manda o que mudou aqui e traz o que mudou lá. */
export async function syncWithBackend(deps: LocalSyncDeps = {}): Promise<{ sent: number; received: number }> {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const storage = deps.storage ?? localStorage
  const now = deps.now ?? Date.now
  const since = Number(storage.getItem(LAST_SYNC_KEY)) || 0
  const startedAt = now()
  const outgoing = changesSince(await exportAll({ analyses: true }), since)
  const sent = outgoing.games.length + outgoing.cards.length + outgoing.kv.length
  if (sent > 0) {
    const response = await doFetch('/api/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(outgoing) })
    if (!response.ok) throw new Error('backend recusou os dados')
  }
  const response = await doFetch(`/api/data?desde=${since}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('backend não respondeu')
  const report = await mergeBackup(parseBackup(await response.text()))
  storage.setItem(LAST_SYNC_KEY, String(startedAt))
  return { sent, received: report.games + report.analyses + report.cards }
}

// ---------- Estado para a interface ----------

export interface LocalState {
  info: BackendInfo | null
  lastSync: number | null
  error: string | null
}

let state: LocalState = { info: null, lastSync: null, error: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<LocalState>) => {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export const useLocalBackend = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )

export const hasBackendEngine = () => Boolean(state.info?.engine)

let timer: ReturnType<typeof setTimeout> | null = null

async function runSync() {
  try {
    await syncWithBackend()
    set({ lastSync: Date.now(), error: null })
  } catch (failure) {
    // Backend fora do ar não atrapalha nada: o app segue com os dados daqui.
    set({ error: failure instanceof Error ? failure.message : 'sincronização falhou' })
  }
}

/** Chamado ao abrir o app. Sem backend, não faz nada além de uma pergunta. */
export async function startLocalBackend(): Promise<void> {
  const info = await detectBackend()
  if (!info) return
  set({ info })
  await runSync()
  onRecordChange(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void runSync(), SYNC_DELAY_MS)
  })
}

// ---------- Motor do computador, usado pela fila ----------

/** Fala UCI como um motor comum, mas cada busca é um pedido ao backend. */
export function createBackendEngine(deps: { fetch?: typeof fetch } = {}): UciEngine {
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  let emit: (line: string) => void = () => {}
  let fen = ''
  let multiPv = 1
  let running: AbortController | null = null
  const later = (line: string) => void setTimeout(() => emit(line))

  return new UciEngine({
    send(command) {
      if (command === 'uci') later('uciok')
      else if (command === 'isready') later('readyok')
      else if (command.startsWith('position fen ')) fen = command.slice('position fen '.length)
      else if (command.startsWith('setoption name MultiPV value ')) multiPv = Number(command.split(' ').pop()) || 1
      else if (command === 'stop') running?.abort()
      else if (command.startsWith('go')) {
        const depth = command.match(/depth (\d+)/)?.[1]
        const movetime = command.match(/movetime (\d+)/)?.[1]
        const controller = new AbortController()
        running = controller
        void doFetch('/api/engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ fen, depth: depth ? Number(depth) : undefined, movetime: movetime ? Number(movetime) : undefined, multiPv }) })
          .then(async (response) => {
            if (!response.ok) throw new Error('motor do computador indisponível')
            const { lines } = (await response.json()) as { lines: string[] }
            for (const line of lines) emit(line)
          })
          .catch(() => later('bestmove (none)'))
      }
    },
    onLine(handler) {
      emit = handler
    },
    onFailure() {},
    close() {
      running?.abort()
    },
  })
}
