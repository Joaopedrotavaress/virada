import { type Color, toWhitePov } from '../chess/evaluation'
import { loadServerEngine } from '../storage'
import type { EngineResult } from './stockfish'

/** O motor no servidor: Stockfish completo, partida inteira de uma vez. Só as posições saem do aparelho. */
export const MOTOR_URL = (import.meta.env?.VITE_MOTOR_URL as string | undefined) ?? 'https://motor.169-58-241-29.sslip.io'

/** Sem nenhuma resposta nesse tempo, desiste: o que faltar é calculado no aparelho. */
const STALL_MS = 25_000
const MAX_FENS = 400
const LINES = 2

export interface RemoteOptions {
  signal?: AbortSignal
  /** Chamado a cada posição que chega. */
  onResult?: (fen: string, result: EngineResult) => void
  fetch?: typeof fetch
  stallMs?: number
}

export type RemoteAnalyzer = (fens: string[], depth: number, options?: RemoteOptions) => Promise<Map<string, EngineResult>>

interface WireResult {
  i: number
  erro?: boolean
  best?: string | null
  lines?: { depth: number; score: { type: 'cp' | 'mate'; value: number }; pv: string[] }[]
}

export function resultFromWire(fen: string, wire: WireResult): EngineResult | null {
  if (wire.erro || !wire.lines?.length) return null
  const side: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const lines = wire.lines.map((line) => ({ eval: toWhitePov(line.score, side), pvUci: line.pv, depth: line.depth }))
  return { eval: lines[0].eval, bestUci: wire.best ?? null, pvUci: lines[0].pvUci, depth: lines[0].depth, lines }
}

async function askOnce(fens: string[], depth: number, found: Map<string, EngineResult>, options: RemoteOptions) {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  const stallMs = options.stallMs ?? STALL_MS
  let stall = setTimeout(abort, stallMs)
  const alive = () => {
    clearTimeout(stall)
    stall = setTimeout(abort, stallMs)
  }
  try {
    const response = await doFetch(`${MOTOR_URL}/analisar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ fens, profundidade: depth, linhas: LINES }) })
    if (!response.ok || !response.body) return
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let pending = ''
    const consume = (line: string) => {
      if (!line.trim()) return
      const wire = JSON.parse(line) as WireResult
      const fen = fens[wire.i]
      const result = fen ? resultFromWire(fen, wire) : null
      if (fen && result) {
        found.set(fen, result)
        options.onResult?.(fen, result)
      }
    }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      alive()
      pending += decoder.decode(value, { stream: true })
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      lines.forEach(consume)
    }
    consume(pending)
  } finally {
    clearTimeout(stall)
    options.signal?.removeEventListener('abort', abort)
  }
}

/**
 * Pede as posições ao servidor. Nunca falha por causa dele: devolve o que conseguiu,
 * e quem chamou calcula o resto no aparelho. Só a desistência da pessoa vira erro.
 */
export const analyzeOnServer: RemoteAnalyzer = async (fens, depth, options = {}) => {
  const found = new Map<string, EngineResult>()
  const unique = [...new Set(fens)]
  try {
    for (let start = 0; start < unique.length; start += MAX_FENS) await askOnce(unique.slice(start, start + MAX_FENS), depth, found, options)
  } catch {
    // Fora do ar, bloqueado ou sem internet: segue com o que chegou.
  }
  return found
}

/** O analisador a usar agora. Nulo se a pessoa preferiu só o aparelho. */
export const currentRemote = (): RemoteAnalyzer | undefined => (loadServerEngine() ? analyzeOnServer : undefined)
