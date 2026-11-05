import { useSyncExternalStore } from 'react'
import { analyzeGame } from '../chess/analyze'
import { parsePgn } from '../chess/pgn'
import { type EngineLike, EngineAbortError, createBrowserEngine } from '../engine/stockfish'
import { loadDepth } from '../storage'
import { type GameRecord, allRecords, saveAnalyzed, updateRecords } from './library'
import { createBackendEngine, hasBackendEngine } from './localBackend'

export interface QueueState {
  running: boolean
  /** Parada de propósito enquanto a pessoa joga ou analisa uma partida. */
  held: boolean
  done: number
  remaining: number
  current: string | null
  error: string | null
}

export interface QueueDeps {
  /** Um motor só para a fila: a análise em lote não atrasa o que a pessoa está fazendo. */
  createEngine?: () => EngineLike & { ready?: Promise<unknown>; dispose?: () => void }
  depth?: () => number
}

const describe = (record: GameRecord) => `${record.white} x ${record.black}`
const pendingRecords = () => allRecords().filter((record) => record.queued && !record.deletedAt && !record.digest)

export function createAnalysisQueue(deps: QueueDeps = {}) {
  const createEngine =
    deps.createEngine ??
    (() => {
      const engine = hasBackendEngine() ? createBackendEngine() : createBrowserEngine()
      return Object.assign(engine, { dispose: () => engine.terminate() })
    })
  const depthOf = deps.depth ?? loadDepth
  let state: QueueState = { running: false, held: false, done: 0, remaining: 0, current: null, error: null }
  let controller: AbortController | null = null
  let stopping = false
  const listeners = new Set<() => void>()

  const set = (patch: Partial<QueueState>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }

  async function loop() {
    if (state.running || state.held) return
    stopping = false
    const pending = pendingRecords()
    if (pending.length === 0) return
    set({ running: true, error: null, remaining: pending.length })
    const engine = createEngine()
    try {
      await engine.ready
      for (;;) {
        const next = pendingRecords()[0]
        if (!next || stopping) break
        set({ current: describe(next), remaining: pendingRecords().length })
        let game
        try {
          game = parsePgn(next.pgn)
        } catch {
          // PGN que não abre não vai abrir na próxima vez: sai da fila para não travar as outras.
          await updateRecords([next.key], { queued: false })
          continue
        }
        const active = new AbortController()
        controller = active
        const analysis = await analyzeGame(engine, game, depthOf(), { signal: active.signal })
        await saveAnalyzed(analysis, { pgn: next.pgn, key: next.key, userColor: next.userColor, source: next.source, owner: next.owner, playedAt: next.playedAt })
        set({ done: state.done + 1, remaining: pendingRecords().length })
      }
      set({ running: false, current: null, remaining: pendingRecords().length })
    } catch (failure) {
      const aborted = failure instanceof EngineAbortError
      set({
        running: false,
        current: null,
        remaining: pendingRecords().length,
        error: aborted ? null : `A análise em lote parou. ${failure instanceof Error ? failure.message : ''}`.trim(),
      })
    } finally {
      controller = null
      engine.dispose?.()
    }
  }

  const stopCurrent = () => {
    stopping = true
    controller?.abort()
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** Coloca na fila e começa. Fechar o app não perde a fila: ela continua ao abrir de novo. */
    async add(keys: string[]) {
      await updateRecords(keys, { queued: true })
      set({ remaining: pendingRecords().length, done: state.running ? state.done : 0 })
      void loop()
    },
    resume: () => loop(),
    /** Esvazia a fila. O que já foi analisado continua guardado. */
    async cancel() {
      stopCurrent()
      await updateRecords(pendingRecords().map((record) => record.key), { queued: false })
      set({ remaining: 0, error: null, current: null })
    },
    /** Jogando ou analisando uma partida, o aparelho fica só para isso. */
    hold(held: boolean) {
      if (held === state.held) return
      set({ held })
      if (held) stopCurrent()
      else void loop()
    },
    /** Espera o trabalho terminar. Usado nos testes. */
    idle: async () => {
      while (state.running) await new Promise((resolve) => setTimeout(resolve, 5))
    },
  }
}

export const analysisQueue = createAnalysisQueue()

export const useQueue = () => useSyncExternalStore(analysisQueue.subscribe, analysisQueue.getState)
