export interface UciScore {
  type: 'cp' | 'mate'
  value: number
}

export interface UciInfo {
  depth: number
  /** Índice da linha (1 = a principal), quando o MultiPV está ligado. */
  multipv: number
  score: UciScore
  /** true quando o score é só um limite (lowerbound/upperbound), não um valor exato. */
  bound: boolean
  pv: string[]
}

/** Lê uma linha "info" do Stockfish. Retorna null se não houver score. */
export function parseInfoLine(line: string): UciInfo | null {
  if (!line.startsWith('info ') || line.startsWith('info string')) return null
  const match = line.match(/\bscore (cp|mate) (-?\d+)( lowerbound| upperbound)?/)
  if (!match) return null
  const depth = line.match(/\bdepth (\d+)/)
  const pv = line.match(/\bpv (.+)$/)
  const multipv = line.match(/\bmultipv (\d+)/)
  return {
    depth: depth ? Number(depth[1]) : 0,
    multipv: multipv ? Number(multipv[1]) : 1,
    score: { type: match[1] as UciScore['type'], value: Number(match[2]) },
    bound: Boolean(match[3]),
    pv: pv ? pv[1].trim().split(/\s+/) : [],
  }
}

/** Lê "bestmove e2e4 ponder e7e5". "(none)" vira null. */
export function parseBestMove(line: string): string | null {
  const move = line.split(/\s+/)[1]
  return !move || move === '(none)' ? null : move
}

/** Fica com a informação mais recente, sem deixar um limite substituir um valor exato de mesma profundidade. */
export function pickInfo(previous: UciInfo | null, next: UciInfo): UciInfo {
  if (!previous) return next
  if (next.bound && !previous.bound && next.depth <= previous.depth) return previous
  return next
}
