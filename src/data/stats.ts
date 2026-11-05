import type { ErrorTheme, GameError, GamePhase } from '../chess/digest'
import { SERIOUS_CLASSES } from '../chess/digest'
import { parseTimeControl } from '../chess/clock'
import type { GameRecord } from './library'

export const timeClassFor = (record: GameRecord): string | null => {
  if (record.timeClass) return record.timeClass
  const control = parseTimeControl(record.timeControl)
  if (!control) return null
  const estimate = control.base + 40 * control.increment
  if (estimate < 180) return 'bullet'
  if (estimate < 600) return 'blitz'
  if (estimate < 3000) return 'rapid'
  return 'daily'
}

/** Precisão da pessoa: a nossa análise vale mais; sem ela, a que o chess.com informou. */
export function accuracyOf(record: GameRecord): number | null {
  if (!record.userColor) return null
  const own = record.digest?.accuracy[record.userColor]
  if (own !== null && own !== undefined) return own
  const theirs = record.userColor === 'w' ? record.accuracies?.white : record.accuracies?.black
  return theirs ?? null
}

export const ratingOf = (record: GameRecord): number | null => (record.userColor === 'w' ? record.whiteRating : record.userColor === 'b' ? record.blackRating : undefined) ?? null

export function seriousErrorsOf(record: GameRecord): number | null {
  if (!record.digest || !record.userColor) return null
  const counts = record.digest.counts[record.userColor]
  return SERIOUS_CLASSES.reduce((sum, cls) => sum + (counts[cls] ?? 0), 0)
}

const average = (values: number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

export interface Totals {
  games: number
  wins: number
  draws: number
  losses: number
  /** Pontos sobre o total possível, de 0 a 100. */
  score: number | null
  accuracy: number | null
  errorsPerGame: number | null
  analyzed: number
}

export function totalsOf(records: GameRecord[]): Totals {
  const counted = records.filter((record) => record.outcome)
  const wins = counted.filter((record) => record.outcome === 'win').length
  const draws = counted.filter((record) => record.outcome === 'draw').length
  const errors = records.flatMap((record) => seriousErrorsOf(record) ?? [])
  return {
    games: records.length,
    wins,
    draws,
    losses: counted.length - wins - draws,
    score: counted.length > 0 ? ((wins + draws / 2) / counted.length) * 100 : null,
    accuracy: average(records.flatMap((record) => accuracyOf(record) ?? [])),
    errorsPerGame: average(errors),
    analyzed: errors.length,
  }
}

export interface PeriodPoint extends Totals {
  key: string
  label: string
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Segunda-feira da semana, em UTC: a mesma partida cai sempre no mesmo grupo. */
function weekStart(time: number): Date {
  const date = new Date(time)
  const day = (date.getUTCDay() + 6) % 7
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day))
}

/** Agrupa por semana ou mês, do mais antigo para o mais novo. */
export function groupByPeriod(records: GameRecord[], period: 'week' | 'month'): PeriodPoint[] {
  const groups = new Map<string, { label: string; time: number; items: GameRecord[] }>()
  for (const record of records) {
    const start = period === 'week' ? weekStart(record.playedAt) : new Date(Date.UTC(new Date(record.playedAt).getUTCFullYear(), new Date(record.playedAt).getUTCMonth(), 1))
    const key = start.toISOString().slice(0, 10)
    const label = period === 'week' ? `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}` : `${MONTHS[start.getUTCMonth()]} ${String(start.getUTCFullYear()).slice(2)}`
    const group = groups.get(key) ?? { label, time: start.getTime(), items: [] }
    group.items.push(record)
    groups.set(key, group)
  }
  return [...groups.entries()].sort((a, b) => a[1].time - b[1].time).map(([key, group]) => ({ key, label: group.label, ...totalsOf(group.items) }))
}

export interface RatingPoint {
  time: number
  rating: number
}

/** Rating depois de cada partida, do mais antigo para o mais novo. Partidas sem valendo rating ficam de fora. */
export function ratingSeries(records: GameRecord[]): RatingPoint[] {
  return records
    .flatMap((record) => {
      const rating = ratingOf(record)
      return rating !== null && record.rated !== false ? [{ time: record.playedAt, rating }] : []
    })
    .sort((a, b) => a.time - b.time)
}

// ---------- Padrões de erro ----------

export const THEME_LABEL: Record<ErrorTheme, { one: string; many: string }> = {
  'missed-mate': { one: 'mate que passou', many: 'mates que passaram' },
  'allowed-mate': { one: 'mate permitido', many: 'mates permitidos' },
  hanging: { one: 'peça deixada sem defesa', many: 'peças deixadas sem defesa' },
  material: { one: 'material perdido numa sequência', many: 'perdas de material numa sequência' },
  fork: { one: 'garfo', many: 'garfos' },
  pin: { one: 'cravada', many: 'cravadas' },
  'missed-capture': { one: 'captura que passou', many: 'capturas que passaram' },
  positional: { one: 'piora da posição sem tática clara', many: 'pioras da posição sem tática clara' },
}

export const PHASE_LABEL: Record<GamePhase, string> = { opening: 'abertura', middlegame: 'meio-jogo', endgame: 'final' }
const PHASE_IN: Record<GamePhase, string> = { opening: 'na abertura', middlegame: 'no meio-jogo', endgame: 'no final' }

export interface ErrorPattern {
  id: string
  text: string
  /** Tema a treinar. Ausente: o padrão não é de um tema só. */
  theme?: ErrorTheme
  count: number
  total: number
}

const pattern = (id: string, text: string, count: number, total: number, theme?: ErrorTheme): ErrorPattern => ({ id, text, count, total, theme })
const MIN_ERRORS = 3

/** O que se repete nos erros graves das últimas partidas. Só afirma o que os números sustentam. */
export function findPatterns(records: GameRecord[], lastGames = 30): ErrorPattern[] {
  const analyzed = records.filter((record) => record.digest && record.userColor).sort((a, b) => b.playedAt - a.playedAt).slice(0, lastGames)
  const errors: GameError[] = analyzed.flatMap((record) => record.digest?.errors ?? [])
  const total = errors.length
  if (total < MIN_ERRORS) return []
  const patterns: ErrorPattern[] = []

  const countBy = <K extends string>(pick: (error: GameError) => K) => {
    const counts = new Map<K, number>()
    for (const error of errors) counts.set(pick(error), (counts.get(pick(error)) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }
  const of = `${total} erros graves`

  // O tema mais comum, com a fase quando ela concentra a maior parte.
  for (const [theme, count] of countBy((error) => error.theme).slice(0, 2)) {
    if (theme === 'positional' || count < MIN_ERRORS || count / total < 0.2) continue
    const [phase, inPhase] = (() => {
      const counts = new Map<GamePhase, number>()
      for (const error of errors) if (error.theme === theme) counts.set(error.phase, (counts.get(error.phase) ?? 0) + 1)
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    })()
    const label = THEME_LABEL[theme]
    const where = inPhase / count >= 0.6 ? ` ${PHASE_IN[phase]}` : ''
    patterns.push(pattern(`tema-${theme}`, `${count} dos ${of} foram ${label.many}${where}.`, count, total, theme))
  }

  const [phase, phaseCount] = countBy((error) => error.phase)[0]
  if (phaseCount / total >= 0.5) patterns.push(pattern(`fase-${phase}`, `${phaseCount} dos ${of} aconteceram ${PHASE_IN[phase]}.`, phaseCount, total))

  const pressured = errors.filter((error) => error.timePressure).length
  if (pressured >= MIN_ERRORS && pressured / total >= 0.25) patterns.push(pattern('tempo', `${pressured} dos ${of} foram com pouco tempo no relógio.`, pressured, total))

  return patterns
}

/** Comparações entre brancas e pretas, quando há partidas suficientes dos dois lados. */
export function colorInsight(records: GameRecord[]): string | null {
  const white = totalsOf(records.filter((record) => record.userColor === 'w'))
  const black = totalsOf(records.filter((record) => record.userColor === 'b'))
  if (white.games < 5 || black.games < 5 || white.score === null || black.score === null) return null
  if (Math.abs(white.score - black.score) < 8) return null
  return `Você pontua ${white.score.toFixed(0)}% de brancas e ${black.score.toFixed(0)}% de pretas.`
}

// ---------- Aberturas da pessoa ----------

export interface OpeningStat extends Totals {
  name: string
  eco: string
  color: 'w' | 'b'
}

/** Família da abertura: "Defesa Siciliana: Variante Najdorf" vira "Defesa Siciliana". */
export const openingFamily = (name: string) => name.split(/[:,]/)[0].trim()

export function openingStats(records: GameRecord[]): OpeningStat[] {
  const groups = new Map<string, GameRecord[]>()
  for (const record of records) {
    if (!record.opening || !record.userColor) continue
    const key = `${record.userColor}|${openingFamily(record.opening.name)}`
    groups.set(key, [...(groups.get(key) ?? []), record])
  }
  return [...groups.entries()]
    .map(([key, items]) => {
      const [color, name] = key.split('|') as ['w' | 'b', string]
      return { name, color, eco: items[0].opening?.eco ?? '', ...totalsOf(items) }
    })
    .sort((a, b) => b.games - a.games)
}
