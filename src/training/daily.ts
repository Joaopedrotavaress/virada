/** Sequência de dias de treino, e o quanto foi feito hoje. */
export interface DailyState {
  lastDay: string | null
  streak: number
  best: number
  doneToday: number
  total: number
}

export const EMPTY_DAILY: DailyState = { lastDay: null, streak: 0, best: 0, doneToday: 0, total: 0 }
export const DAILY_KEY = 'treino-diario'
export const DAILY_GOAL = 10

export function dayOf(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

/** Um exercício feito. A sequência sobe no primeiro do dia, e recomeça se um dia ficou vazio. */
export function afterExercise(state: DailyState, now = new Date()): DailyState {
  const today = dayOf(now)
  if (state.lastDay === today) return { ...state, doneToday: state.doneToday + 1, total: state.total + 1 }
  const gap = state.lastDay ? daysBetween(state.lastDay, today) : null
  const streak = gap === 1 ? state.streak + 1 : 1
  return { lastDay: today, streak, best: Math.max(state.best, streak), doneToday: 1, total: state.total + 1 }
}

/** Como a sequência está agora, sem contar um exercício novo: ontem ainda vale, anteontem não. */
export function currentDaily(state: DailyState, now = new Date()): DailyState {
  const today = dayOf(now)
  if (!state.lastDay || state.lastDay === today) return state
  const gap = daysBetween(state.lastDay, today)
  return { ...state, doneToday: 0, streak: gap <= 1 ? state.streak : 0 }
}

export interface SessionPick<T> {
  items: T[]
  remaining: number
}

/** Cartões da sessão: primeiro os mais atrasados, sem passar do limite. */
export function pickSession<T extends { schedule: { due: string } }>(due: T[], limit: number): SessionPick<T> {
  const sorted = [...due].sort((a, b) => a.schedule.due.localeCompare(b.schedule.due))
  return { items: sorted.slice(0, limit), remaining: Math.max(0, sorted.length - limit) }
}
