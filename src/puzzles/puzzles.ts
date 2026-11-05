import { Chess } from 'chess.js'
import { hashText } from '../chess/analyze'
import type { GameRecord } from '../data/library'
import { ratingOf } from '../data/stats'

export type PuzzleRow = [id: string, fen: string, moves: string, rating: number, themes: string]

export interface Puzzle {
  id: string
  /** Posição depois do lance do adversário: é daqui que a pessoa joga. */
  fen: string
  /** O lance do adversário, para mostrar no tabuleiro de onde a posição veio. */
  setup: { from: string; to: string }
  /** Lances da solução em notação internacional: da pessoa, resposta, da pessoa... */
  solution: string[]
  rating: number
  themes: string[]
}

export const THEMES: { id: string; label: string }[] = [
  { id: 'hangingPiece', label: 'Peça sem defesa' },
  { id: 'fork', label: 'Garfo' },
  { id: 'pin', label: 'Cravada' },
  { id: 'skewer', label: 'Espeto' },
  { id: 'discoveredAttack', label: 'Ataque descoberto' },
  { id: 'doubleCheck', label: 'Xeque duplo' },
  { id: 'deflection', label: 'Desvio' },
  { id: 'attraction', label: 'Atração' },
  { id: 'intermezzo', label: 'Lance intermediário' },
  { id: 'sacrifice', label: 'Sacrifício' },
  { id: 'trappedPiece', label: 'Peça presa' },
  { id: 'mateIn1', label: 'Mate em 1' },
  { id: 'mateIn2', label: 'Mate em 2' },
  { id: 'mateIn3', label: 'Mate em 3' },
  { id: 'backRankMate', label: 'Mate do corredor' },
  { id: 'smotheredMate', label: 'Mate sufocado' },
  { id: 'kingsideAttack', label: 'Ataque ao rei' },
  { id: 'opening', label: 'Na abertura' },
  { id: 'endgame', label: 'Finais' },
  { id: 'pawnEndgame', label: 'Finais de peões' },
  { id: 'rookEndgame', label: 'Finais de torres' },
  { id: 'queenEndgame', label: 'Finais de damas' },
]

export const themeLabel = (id: string) => THEMES.find((theme) => theme.id === id)?.label ?? id

export const LEVELS = [
  { id: 'facil', label: 'Fácil', min: 0, max: 1000 },
  { id: 'medio', label: 'Médio', min: 1000, max: 1400 },
  { id: 'dificil', label: 'Difícil', min: 1400, max: 1800 },
  { id: 'avancado', label: 'Avançado', min: 1800, max: 9999 },
]

const parseUci = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })

/** Na base, o primeiro lance é do adversário. A solução, em notação internacional, sai do resto. */
export function toPuzzle([id, fen, moves, rating, themes]: PuzzleRow): Puzzle {
  const [first, ...rest] = moves.split(' ')
  const chess = new Chess(fen)
  const setup = chess.move(parseUci(first))
  const start = chess.fen()
  const solution = rest.map((uci) => chess.move(parseUci(uci)).san)
  return { id, fen: start, setup: { from: setup.from, to: setup.to }, solution, rating, themes: themes.split(' ') }
}

let cached: Promise<Puzzle[]> | null = null

export function loadPuzzles(): Promise<Puzzle[]> {
  cached ??= import('./puzzles.json').then((module) => (module.default as PuzzleRow[]).map(toPuzzle))
  return cached
}

/** Dificuldade inicial sugerida pelas partidas da pessoa. */
export function suggestedLevel(records: GameRecord[]): string {
  const latest = records.flatMap((record) => ratingOf(record) ?? []).slice(0, 10)
  if (latest.length === 0) return 'medio'
  const rating = latest.reduce((sum, value) => sum + value, 0) / latest.length
  return (LEVELS.find((level) => rating >= level.min && rating < level.max) ?? LEVELS[1]).id
}

/** O mesmo puzzle para o dia inteiro, sem internet e sem servidor. */
export function puzzleOfDay(puzzles: Puzzle[], day: string, levelId: string): Puzzle | null {
  const level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[1]
  const pool = puzzles.filter((puzzle) => puzzle.rating >= level.min && puzzle.rating < level.max)
  if (pool.length === 0) return null
  return pool[parseInt(hashText(day), 36) % pool.length]
}

export interface PickOptions {
  theme?: string
  levelId?: string
  solved?: Set<string>
  /** Sorteio determinístico nos testes. */
  random?: () => number
  limit?: number
}

/** Puzzles para praticar, deixando os já resolvidos por último. */
export function pickPuzzles(puzzles: Puzzle[], { theme, levelId, solved = new Set(), random = Math.random, limit = 20 }: PickOptions): Puzzle[] {
  const level = LEVELS.find((item) => item.id === levelId)
  const pool = puzzles.filter((puzzle) => (!theme || puzzle.themes.includes(theme)) && (!level || (puzzle.rating >= level.min && puzzle.rating < level.max)))
  const shuffled = pool.map((puzzle) => ({ puzzle, order: random() })).sort((a, b) => a.order - b.order).map((item) => item.puzzle)
  const fresh = shuffled.filter((puzzle) => !solved.has(puzzle.id))
  const old = shuffled.filter((puzzle) => solved.has(puzzle.id))
  return [...fresh, ...old].slice(0, limit)
}

export interface PuzzleStats {
  solved: string[]
  dailyDone: string | null
}

export const PUZZLE_KEY = 'puzzles'
export const EMPTY_PUZZLE_STATS: PuzzleStats = { solved: [], dailyDone: null }
const MAX_REMEMBERED = 3000

export function afterSolved(stats: PuzzleStats, id: string, dailyDay?: string): PuzzleStats {
  const solved = stats.solved.includes(id) ? stats.solved : [...stats.solved, id].slice(-MAX_REMEMBERED)
  return { solved, dailyDone: dailyDay ?? stats.dailyDone }
}
