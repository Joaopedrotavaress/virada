import { type Color, type Eval, toWhitePov } from '../chess/evaluation'
import { parseBestMove, parseInfoLine, pickInfo, type UciInfo } from './uci'

export interface EngineLine {
  eval: Eval
  pvUci: string[]
  depth: number
}

export interface EngineResult {
  eval: Eval
  bestUci: string | null
  pvUci: string[]
  depth: number
  /** Linhas em ordem de força. Com MultiPV desligado, só a principal. */
  lines: EngineLine[]
}

export interface AnalyzeOptions {
  /** Chamado a cada linha "info" com score (usado no modo explorar). */
  onUpdate?: (partial: EngineResult) => void
  signal?: AbortSignal
  /** Quantas linhas calcular (MultiPV). Padrão: 1. */
  multiPv?: number
  /** Limite de tempo em ms. Com profundidade, para no que vier primeiro. */
  movetime?: number
}

/** O que a análise precisa de um motor. Também permite testar sem navegador. */
export interface EngineLike {
  newGame(): Promise<void>
  /** depth null: só o movetime limita a busca. */
  analyze(fen: string, depth: number | null, options?: AnalyzeOptions): Promise<EngineResult>
}

export class EngineAbortError extends Error {
  constructor() {
    super('Análise cancelada')
    this.name = 'EngineAbortError'
  }
}

export interface EnginePort {
  send(command: string): void
  onLine(handler: (line: string) => void): void
  onFailure(handler: (message: string) => void): void
  close(): void
}

type Job =
  | { kind: 'sync'; commands: string[]; resolve: () => void; reject: (error: Error) => void; cancelled: boolean }
  | {
      kind: 'search'
      fen: string
      depth: number | null
      side: Color
      options: AnalyzeOptions
      resolve: (result: EngineResult) => void
      reject: (error: Error) => void
      cancelled: boolean
      lines: Map<number, UciInfo>
    }

/** Fila UCI: uma posição por vez, sempre aguardando "bestmove" antes da próxima. */
export class UciEngine implements EngineLike {
  private queue: Job[] = []
  private current: Job | null = null
  private initialized = false
  private failure: Error | null = null
  private handshake: 'uciok' | 'readyok' | 'newgame' | 'done' = 'uciok'
  private initResolve!: () => void
  private initReject!: (error: Error) => void
  private port: EnginePort
  private multiPv = 1
  readonly ready: Promise<void>
  /** Registra as linhas recebidas; útil para depurar no console. */
  debug = false

  constructor(port: EnginePort) {
    this.port = port
    this.ready = new Promise((resolve, reject) => {
      this.initResolve = resolve
      this.initReject = reject
    })
    this.ready.catch(() => {})
    port.onLine((line) => this.handleLine(line))
    port.onFailure((message) => this.fail(new Error(message)))
    port.send('uci')
  }

  newGame(): Promise<void> {
    return this.sync(['ucinewgame'])
  }

  /** Envia setoption na ordem da fila, com o motor parado (usado para enfraquecer o bot). */
  configure(options: Record<string, string | number | boolean>): Promise<void> {
    return this.sync(Object.entries(options).map(([name, value]) => `setoption name ${name} value ${value}`))
  }

  private sync(commands: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.enqueue({ kind: 'sync', commands, resolve, reject, cancelled: false })
    })
  }

  analyze(fen: string, depth: number | null, options: AnalyzeOptions = {}): Promise<EngineResult> {
    return new Promise((resolve, reject) => {
      if (options.signal?.aborted) return reject(new EngineAbortError())
      const job: Job = {
        kind: 'search',
        fen,
        depth,
        side: fen.split(' ')[1] === 'b' ? 'b' : 'w',
        options,
        resolve,
        reject,
        cancelled: false,
        lines: new Map(),
      }
      options.signal?.addEventListener('abort', () => this.cancel(job), { once: true })
      this.enqueue(job)
    })
  }

  send(command: string) {
    this.port.send(command)
  }

  terminate() {
    this.fail(new EngineAbortError())
    this.port.close()
  }

  private enqueue(job: Job) {
    if (this.failure) return job.reject(this.failure)
    this.queue.push(job)
    this.pump()
  }

  private cancel(job: Job) {
    if (job.cancelled) return
    job.cancelled = true
    job.reject(new EngineAbortError())
    if (job === this.current) {
      // O job segue como "current" até o bestmove chegar: só então o motor está livre.
      this.port.send('stop')
    } else {
      this.queue = this.queue.filter((queued) => queued !== job)
    }
  }

  private pump() {
    if (!this.initialized || this.current || this.failure) return
    const job = this.queue.shift()
    if (!job) return
    this.current = job
    if (job.kind === 'sync') {
      for (const command of job.commands) this.port.send(command)
      this.port.send('isready')
    } else {
      const multiPv = job.options.multiPv ?? 1
      if (multiPv !== this.multiPv) {
        this.multiPv = multiPv
        this.port.send(`setoption name MultiPV value ${multiPv}`)
      }
      this.port.send(`position fen ${job.fen}`)
      const limits = [job.depth !== null ? `depth ${job.depth}` : '', job.options.movetime ? `movetime ${job.options.movetime}` : '']
      this.port.send(`go ${limits.filter(Boolean).join(' ') || 'depth 12'}`)
    }
  }

  private handleLine(line: string) {
    if (this.debug) console.log('[stockfish]', line)
    if (!this.initialized) return this.handleHandshake(line)

    const job = this.current
    if (!job) return
    if (job.kind === 'sync') {
      if (line === 'readyok') {
        this.current = null
        job.resolve()
        this.pump()
      }
      return
    }

    if (line.startsWith('info ')) {
      const info = parseInfoLine(line)
      if (!info || job.cancelled) return
      const picked = pickInfo(job.lines.get(info.multipv) ?? null, info)
      job.lines.set(info.multipv, picked)
      if (info.multipv === 1 && job.options.onUpdate && picked.pv.length > 0 && !picked.bound) {
        job.options.onUpdate(toResult(job.lines, job.side, picked.pv[0]))
      }
      return
    }

    if (line.startsWith('bestmove')) {
      this.current = null
      if (!job.cancelled) {
        if (job.lines.has(1)) job.resolve(toResult(job.lines, job.side, parseBestMove(line)))
        else job.reject(new Error('O Stockfish não devolveu uma avaliação. Recarregue a página e tente de novo.'))
      }
      this.pump()
    }
  }

  private handleHandshake(line: string) {
    if (this.handshake === 'uciok' && line === 'uciok') {
      this.handshake = 'readyok'
      this.port.send('isready')
    } else if (this.handshake === 'readyok' && line === 'readyok') {
      this.handshake = 'newgame'
      this.port.send('ucinewgame')
      this.port.send('isready')
    } else if (this.handshake === 'newgame' && line === 'readyok') {
      this.handshake = 'done'
      this.initialized = true
      this.initResolve()
      this.pump()
    }
  }

  private fail(error: Error) {
    if (this.failure) return
    this.failure = error
    this.initReject(error)
    const pending = [...this.queue, ...(this.current ? [this.current] : [])]
    this.queue = []
    this.current = null
    for (const job of pending) if (!job.cancelled) job.reject(error)
  }
}

function toResult(infos: Map<number, UciInfo>, side: Color, bestUci: string | null): EngineResult {
  const lines = [...infos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, info]) => ({ eval: toWhitePov(info.score, side), pvUci: info.pv, depth: info.depth }))
  return { eval: lines[0].eval, bestUci, pvUci: lines[0].pvUci, depth: lines[0].depth, lines }
}

const INIT_TIMEOUT_MS = 60_000
const LOAD_FAILURE = 'Não consegui carregar o Stockfish. Verifique sua conexão e recarregue a página.'

/** Cria o motor em um Web Worker. Single-thread: não precisa de headers COOP/COEP. */
export function createBrowserEngine(): UciEngine {
  const worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish.js`)
  let failureHandler: (message: string) => void = () => {}
  const engine = new UciEngine({
    send: (command) => worker.postMessage(command),
    onLine: (handler) => {
      worker.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') handler(event.data)
      }
    },
    onFailure: (handler) => {
      failureHandler = handler
      worker.onerror = () => handler(LOAD_FAILURE)
    },
    close: () => worker.terminate(),
  })
  const timer = setTimeout(
    () => failureHandler(LOAD_FAILURE),
    INIT_TIMEOUT_MS,
  )
  // O motor não avisa quando o .wasm não baixa: sem isto, a pessoa esperaria o tempo limite inteiro.
  const probe = new AbortController()
  fetch(`${import.meta.env.BASE_URL}engine/stockfish.wasm`, { signal: probe.signal })
    .then((response) => {
      if (!response.ok) failureHandler(LOAD_FAILURE)
      probe.abort()
    })
    .catch(() => {
      if (!probe.signal.aborted) failureHandler(LOAD_FAILURE)
    })
  void engine.ready.then(
    () => clearTimeout(timer),
    () => {
      clearTimeout(timer)
      worker.terminate()
    },
  )
  return engine
}

let shared: UciEngine | null = null
let sharedBot: UciEngine | null = null

/** Segundo motor, só para o bot: enfraquecê-lo não pode limitar o treinador. */
export function getBotEngine(): UciEngine {
  if (!sharedBot) {
    const engine = createBrowserEngine()
    sharedBot = engine
    engine.ready.catch(() => {
      if (sharedBot === engine) sharedBot = null
    })
    if (import.meta.env.DEV) {
      ;(window as unknown as { __botEngine: UciEngine }).__botEngine = engine
    }
  }
  return sharedBot
}

/** Motor único da aplicação. Se falhou, o próximo pedido cria outro. */
export function getEngine(): UciEngine {
  if (!shared) {
    const engine = createBrowserEngine()
    shared = engine
    engine.ready.catch(() => {
      if (shared === engine) shared = null
    })
    if (import.meta.env.DEV) {
      ;(window as unknown as { __engine: UciEngine }).__engine = engine
    }
  }
  return shared
}
