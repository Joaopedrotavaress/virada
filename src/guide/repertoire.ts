import type { Color } from '../chess/evaluation'
import { tokenizeMoves } from '../chess/pgn'
import type { GameRecord } from '../data/library'
import { totalsOf, type Totals } from '../data/stats'
import { guideForMoves } from './openings'
import type { OpeningGuide } from './types'

/** Aberturas escolhidas pela pessoa, e o que já foi praticado de cada uma. */
export interface RepertoireEntry {
  slug: string
  addedAt: number
  /** Quantas vezes cada linha já foi completada, por índice. */
  linesDone: Record<number, number>
  lessonsRead?: boolean
}

export type Repertoire = Record<string, RepertoireEntry>

export const REPERTOIRE_KEY = 'repertorio'
export const LESSONS_KEY = 'licoes-feitas'

export function toggleRepertoire(repertoire: Repertoire, slug: string, now = Date.now()): Repertoire {
  const next = { ...repertoire }
  if (next[slug]) delete next[slug]
  else next[slug] = { slug, addedAt: now, linesDone: {} }
  return next
}

export function recordLineDone(repertoire: Repertoire, slug: string, line: number, now = Date.now()): Repertoire {
  const entry = repertoire[slug] ?? { slug, addedAt: now, linesDone: {} }
  return { ...repertoire, [slug]: { ...entry, linesDone: { ...entry.linesDone, [line]: (entry.linesDone[line] ?? 0) + 1 } } }
}

/** Fração das linhas do guia já praticadas. */
export function progressOf(entry: RepertoireEntry | undefined, guide: OpeningGuide): number {
  if (!entry) return 0
  const done = guide.lines.filter((_, index) => (entry.linesDone[index] ?? 0) > 0).length
  return done / guide.lines.length
}

/** Lances do PGN, sem precisar validar a partida inteira. */
export function movesOfPgn(pgn: string): string[] {
  return tokenizeMoves(pgn.replace(/^\s*\[[^\]]*\]\s*$/gm, '')).slice(0, 24)
}

export interface OpeningUsage {
  guide: OpeningGuide
  color: Color
  totals: Totals
  records: GameRecord[]
}

/** Como a pessoa se sai em cada abertura do guia, pelas partidas guardadas. */
export function usageByGuide(records: GameRecord[]): OpeningUsage[] {
  const groups = new Map<string, { guide: OpeningGuide; color: Color; records: GameRecord[] }>()
  for (const record of records) {
    if (!record.userColor) continue
    const guide = guideForMoves(movesOfPgn(record.pgn))
    if (!guide) continue
    const key = `${guide.slug}|${record.userColor}`
    const group = groups.get(key) ?? { guide, color: record.userColor, records: [] }
    group.records.push(record)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({ ...group, totals: totalsOf(group.records) })).sort((a, b) => b.totals.games - a.totals.games)
}

/** A frase que liga o guia às partidas da pessoa. */
export function usageSentence(usage: OpeningUsage[]): string | null {
  if (usage.length === 0 || usage.reduce((sum, item) => sum + item.totals.games, 0) === 0) return null
  const parts = usage.map((item) => {
    const side = item.color === 'w' ? 'de brancas' : 'de pretas'
    const score = item.totals.score === null ? '' : `, com ${item.totals.score.toFixed(0)}% de aproveitamento`
    return `${item.totals.games} ${item.totals.games === 1 ? 'partida' : 'partidas'} ${side}${score}`
  })
  return `Você tem ${parts.join(' e ')}.`
}
