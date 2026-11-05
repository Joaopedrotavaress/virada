import { Chess } from 'chess.js'
import { type Card as FsrsCard, Rating, type Grade, createEmptyCard, fsrs } from 'ts-fsrs'
import type { MoveClass } from '../chess/classify'
import type { ErrorTheme, GameDigest, GameError, GamePhase } from '../chess/digest'
import type { Color } from '../chess/evaluation'
import { STORES, deleteValue, readAll, writeMany } from '../data/db'

/** Os dados da agenda como ficam no banco: datas viram texto. */
export type StoredSchedule = Omit<FsrsCard, 'due' | 'last_review'> & { due: string; last_review?: string }

export interface TrainingCard {
  id: string
  kind: 'error' | 'line'
  color: Color
  label: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  schedule: StoredSchedule
  /** Quantas vezes a pessoa respondeu. */
  reviews: number
  // Exercício de erro de partida.
  gameKey?: string
  fen?: string
  bestUci?: string
  pvUci?: string[]
  playedSan?: string
  cls?: MoveClass
  theme?: ErrorTheme
  phase?: GamePhase
  // Linha de abertura.
  openingSlug?: string
  sans?: string[]
}

export type Answer = 'again' | 'hard' | 'good' | 'easy'

const GRADES: Record<Answer, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy }
const scheduler = fsrs({ enable_fuzz: false, enable_short_term: true })

const toStored = (card: FsrsCard): StoredSchedule => ({
  ...card,
  due: new Date(card.due).toISOString(),
  last_review: card.last_review ? new Date(card.last_review).toISOString() : undefined,
})

const fromStored = (stored: StoredSchedule): FsrsCard => ({
  ...stored,
  due: new Date(stored.due),
  last_review: stored.last_review ? new Date(stored.last_review) : undefined,
})

export const newSchedule = (now: Date) => toStored(createEmptyCard(now))

/** A resposta decide quando o exercício volta. Errou: volta logo. Acertou de primeira: cada vez mais longe. */
export function answerCard(card: TrainingCard, answer: Answer, now = new Date()): TrainingCard {
  const { card: next } = scheduler.next(fromStored(card.schedule), now, GRADES[answer])
  return { ...card, schedule: toStored(next), reviews: card.reviews + 1, updatedAt: now.getTime() }
}

export const isDue = (card: TrainingCard, now = new Date()) => !card.deletedAt && new Date(card.schedule.due).getTime() <= now.getTime()

/** Mostra a próxima revisão de um jeito fácil de entender. */
export function dueLabel(card: TrainingCard, now = new Date()): string {
  const days = (new Date(card.schedule.due).getTime() - now.getTime()) / 86_400_000
  if (days <= 0) return 'hoje'
  if (days < 1) return 'ainda hoje'
  const whole = Math.round(days)
  return whole === 1 ? 'amanhã' : `em ${whole} dias`
}

export const MAX_CARDS_PER_GAME = 3

function hasChoice(error: GameError): boolean {
  try {
    return new Chess(error.fen).moves().length > 1
  } catch {
    return false
  }
}

/** Os piores erros da partida viram exercício. Lance forçado não ensina nada. */
export function cardsFromDigest(gameKey: string, digest: GameDigest, color: Color, opponent: string, now = new Date()): TrainingCard[] {
  return digest.errors
    .filter(hasChoice)
    .sort((a, b) => b.loss - a.loss)
    .slice(0, MAX_CARDS_PER_GAME)
    .map((error) => ({
      id: `${gameKey}:${error.ply}`,
      kind: 'error' as const,
      color,
      label: `Contra ${opponent}, lance ${error.moveNumber}`,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      schedule: newSchedule(now),
      reviews: 0,
      gameKey,
      fen: error.fen,
      bestUci: error.bestUci,
      pvUci: error.pvUci,
      playedSan: error.san,
      cls: error.cls,
      theme: error.theme,
      phase: error.phase,
    }))
}

export function lineCard(openingSlug: string, label: string, sans: string[], color: Color, now = new Date()): TrainingCard {
  return {
    id: `linha:${openingSlug}:${color}:${sans.join(' ')}`,
    kind: 'line',
    color,
    label,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    schedule: newSchedule(now),
    reviews: 0,
    openingSlug,
    sans,
  }
}

export const loadCards = () => readAll<TrainingCard>(STORES.cards)

export const saveCards = (cards: TrainingCard[]) => writeMany(STORES.cards, cards.map((value) => ({ value })))

/** Partida apagada: os exercícios dela saem junto. */
export async function deleteCardsOfGame(gameKey: string): Promise<void> {
  const cards = await loadCards()
  const now = Date.now()
  await saveCards(cards.filter((card) => card.gameKey === gameKey).map((card) => ({ ...card, deletedAt: now, updatedAt: now })))
}

export const purgeCard = (id: string) => deleteValue(STORES.cards, id)
